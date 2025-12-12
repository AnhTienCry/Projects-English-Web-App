import 'dart:io'; // 🔹 để dùng Directory

import 'package:dio/dio.dart'; // 🔹 để dùng Dio, MultipartFile, FormData
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:record/record.dart'; // 🔹 để dùng AudioRecorder & RecordConfig

import '../../api/practice_api.dart';
import '../../config/api_config.dart';
import '../../utils/auth_helper.dart';
import '../../widgets/practice_player.dart';

class PracticeSectionScreen extends StatefulWidget {
  final String sectionId;
  final String title;
  final String skill;
  const PracticeSectionScreen({
    super.key,
    required this.sectionId,
    required this.title,
    required this.skill,
  });

  @override
  State<PracticeSectionScreen> createState() => _PracticeSectionScreenState();
}

class _PracticeSectionScreenState extends State<PracticeSectionScreen> {
  Map section = {};
  List items = [];
  bool loading = true;

  final Map<String, dynamic> _userAnswers = {};
  bool _gateOpen = false;
  bool _submitting = false;
  Map? _submitResult;

  final Stopwatch _timer = Stopwatch();
  final AudioRecorder _recorder = AudioRecorder();
  bool _isRecording = false;

  final Map<String, int> _firstTouchMs = {};
  final Map<String, int> _lastTouchMs = {};

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    setState(() => loading = true);
    final sec = await PracticeApi.getSection(widget.sectionId);
    final its = await PracticeApi.fetchItems(widget.sectionId);

    // ✅ Lấy bài nộp gần nhất của học viên (nếu có)
    final userId = await AuthHelper.getUserId();
    final subs = await PracticeApi.getSubmissions(
      userId: userId,
      sectionId: widget.sectionId,
    );

    setState(() {
      section = sec;
      items = its;
      _submitResult = subs.isNotEmpty ? subs.first : null;
      loading = false;
    });
    // ✅ Nếu có bài nộp cũ → khôi phục lại câu trả lời vào _userAnswers
    if (subs.isNotEmpty && subs.first['answers'] != null) {
      for (final ans in (subs.first['answers'] as List)) {
        final itemId = ans['itemId'];
        final payload = ans['payload'];
        if (itemId != null && payload != null) {
          _userAnswers[itemId] = payload;
        }
      }
    }

    _timer
      ..reset()
      ..start();
  }

  @override
  void dispose() {
    _timer.stop();
    super.dispose();
  }

  String _absUrl(String? url) {
    if (url == null || url.isEmpty) return '';
    
    // Nếu đã là absolute URL, kiểm tra và convert localhost cho Android emulator
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // ✅ Fix: Android emulator không thể truy cập localhost, cần convert sang 10.0.2.2
      if (url.contains('localhost') || url.contains('127.0.0.1')) {
        final base = ApiConfig.baseUrl;
        // Nếu baseUrl đã là 10.0.2.2 (Android emulator), convert localhost trong URL
        if (base.contains('10.0.2.2')) {
          final converted = url.replaceAll('localhost', '10.0.2.2').replaceAll('127.0.0.1', '10.0.2.2');
          debugPrint('🎧 Converted localhost URL => $converted');
          return converted;
        }
      }
      return url;
    }

    // Relative path: ghép với baseUrl
    final base = ApiConfig.baseUrl;
    final cleanBase = base.endsWith('/')
        ? base.substring(0, base.length - 1)
        : base;
    final cleanUrl = url.startsWith('/') ? url.substring(1) : url;
    final full = '$cleanBase/$cleanUrl';

    debugPrint('🎧 Full audio URL => $full');
    return full;
  }

  void _touch(String qid) {
    final t = _timer.elapsedMilliseconds;
    _firstTouchMs.putIfAbsent(qid, () => t);
    _lastTouchMs[qid] = t;
  }

  Future<void> _recordAudio(String questionId) async {
    try {
      if (!_isRecording) {
        if (!await _recorder.hasPermission()) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Không có quyền ghi âm')),
          );
          return;
        }

        final dir = Directory.systemTemp.path;
        final path =
            '$dir/speaking_${DateTime.now().millisecondsSinceEpoch}.m4a';
        await _recorder.start(const RecordConfig(), path: path);

        if (!mounted) return;
        setState(() {
          _isRecording = true;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('🎙️ Đang ghi âm... nhấn lại để dừng')),
        );
      } else {
        final filePath = await _recorder.stop();
        if (!mounted) return;
        setState(() => _isRecording = false);
        if (filePath != null) {
          final url = await _uploadSpeakingFile(filePath);
          if (!mounted) return;
          if (url != null) {
            setState(() {
              _userAnswers[questionId] = url;
            });
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('✅ Đã tải lên file ghi âm')),
            );
          }
        }
      }
    } catch (e) {
      debugPrint('Record error: $e');
    }
  }

  Future<void> _pickSpeakingFile(String questionId) async {
    final result = await FilePicker.platform.pickFiles(type: FileType.audio);
    if (!mounted) return;
    if (result != null && result.files.single.path != null) {
      final url = await _uploadSpeakingFile(result.files.single.path!);
      if (!mounted) return;
      if (url != null) {
        setState(() {
          _userAnswers[questionId] = url;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✅ File speaking đã được tải lên')),
        );
      }
    }
  }

  Future<String?> _uploadSpeakingFile(String path) async {
    try {
      final dio = Dio();
      final file = await MultipartFile.fromFile(path);
      final formData = FormData.fromMap({'file': file});
      final res = await dio.post(
        '${ApiConfig.baseUrl}/api/v2/practice/upload/speaking',
        data: formData,
      );
      return res.data['url'];
    } catch (e) {
      debugPrint('Upload error: $e');
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('❌ Lỗi upload file')));
      }
      return null;
    }
  }

  /// ✅ Reset bài làm để làm lại từ đầu
  void _resetPractice() {
    setState(() {
      _userAnswers.clear();
      _submitResult = null;
      _gateOpen = false;
      _firstTouchMs.clear();
      _lastTouchMs.clear();
      _timer.reset();
      _timer.start();
    });
  }

  Future<void> _onSubmit() async {
    if (_submitting) return;

    if (widget.skill == 'listening' && !_gateOpen) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Hãy nghe đủ phần audio trước khi nộp.')),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      _timer.stop();

      final answers = <Map<String, dynamic>>[];
      for (final it in items) {
        final q = it as Map;
        final id = q['_id'] as String;
        final type = q['type'] as String;
        final payload = _userAnswers[id];
        int? timeSpentMs;
        if (_firstTouchMs.containsKey(id) && _lastTouchMs.containsKey(id)) {
          timeSpentMs = _lastTouchMs[id]! - _firstTouchMs[id]!;
          if (timeSpentMs < 0) timeSpentMs = 0;
        }
        answers.add({
          'itemId': id,
          'payload': payload,
          'timeSpentMs': timeSpentMs,
          'type': type,
        });
      }

      final userId = await AuthHelper.getUserId();

      final res = await PracticeApi.submitPracticeSection(
        sectionId: widget.sectionId,
        body: {
          'userId': userId,
          'answers': answers,
          'durationSec': (_timer.elapsedMilliseconds / 1000).round(),
        },
      );

      setState(() => _submitResult = res as Map);

      if (!mounted) return;
      final score = _submitResult?['score'];
      final total = _submitResult?['total'];
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Bạn đạt $score/$total')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Lỗi nộp bài: $e')));
      _timer.start();
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final String audioUrl = _absUrl(section['audioUrl'] as String?);
    final transcript = section['transcript'] as String?;
    final transcriptMode =
        (section['transcriptMode'] ?? 'afterFirstEnd') as String;
    final int maxReplay = (section['maxReplay'] ?? 2) as int;

    final isListening = widget.skill == 'listening';
    final submitted = _submitResult != null;

    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (audioUrl.isNotEmpty)
                  _audioCard(
                    context,
                    audioUrl: audioUrl,
                    transcript: transcript,
                    transcriptMode: transcriptMode,
                    maxReplay: maxReplay,
                  ),
                const SizedBox(height: 12),
                if (isListening && !_gateOpen && !submitted) _gateHint(),
                ...List.generate(items.length, (i) {
                  final q = items[i] as Map;
                  Map? graded;
                  if (submitted) {
                    final ans = (_submitResult?['answers'] as List?) ?? [];
                    graded = ans.cast<Map?>().firstWhere(
                      (e) => e?['itemId'] == q['_id'],
                      orElse: () => null,
                    );
                  }

                  return Opacity(
                    opacity: (isListening && !_gateOpen && !submitted)
                        ? 0.5
                        : 1,
                    child: IgnorePointer(
                      ignoring: submitted || (isListening && !_gateOpen),
                      child: _qCard(q, i + 1, graded: graded),
                    ),
                  );
                }),
                const SizedBox(height: 80),
              ],
            ),
      bottomNavigationBar: loading
          ? null
          : SafeArea(
              child: Container(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 8)],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (_submitResult != null) ...[
                      if (!(widget.skill == 'writing' ||
                          widget.skill == 'speaking'))
                        Text(
                          'Điểm hệ thống: ${_submitResult!['score']}/${_submitResult!['total']}'
                          '${_submitResult!['accuracy'] != null ? '  •  Acc: ${_submitResult!['accuracy']}' : ''}',
                          style: const TextStyle(color: Colors.black54),
                        ),
                      if (_submitResult!['teacherScore'] != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            'Điểm giáo viên: ${_submitResult!['teacherScore']}',
                            style: const TextStyle(
                              color: Colors.blueAccent,
                              fontWeight: FontWeight.w600,
                              fontSize: 15,
                            ),
                          ),
                        ),
                      if (_submitResult!['teacherFeedback'] != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            'Nhận xét: ${_submitResult!['teacherFeedback']}',
                            style: const TextStyle(
                              color: Colors.black87,
                              fontSize: 14,
                              fontStyle: FontStyle.italic,
                            ),
                          ),
                        ),
                      const SizedBox(height: 6),
                    ],
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            _submitResult == null
                                ? 'Thời gian: ${(_timer.elapsedMilliseconds / 1000).toStringAsFixed(0)}s'
                                : (widget.skill == 'writing' ||
                                      widget.skill == 'speaking')
                                ? 'Điểm giáo viên: ${_submitResult!['teacherScore'] ?? 'Chưa chấm'}'
                                : 'Điểm: ${_submitResult!['score']}/${_submitResult!['total']}'
                                      '${_submitResult!['accuracy'] != null ? '  •  Acc: ${_submitResult!['accuracy']}' : ''}',
                            style: const TextStyle(color: Colors.black54),
                          ),
                        ),
                        if (_submitResult == null)
                          ElevatedButton.icon(
                            onPressed: _submitting ? null : _onSubmit,
                            icon: _submitting
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                : const Icon(Icons.check),
                            label: const Text('Nộp bài'),
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 18,
                                vertical: 12,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                          )
                        else ...[
                          ElevatedButton.icon(
                            onPressed: _resetPractice,
                            icon: const Icon(Icons.refresh),
                            label: const Text('Làm lại bài'),
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 18,
                                vertical: 12,
                              ),
                              backgroundColor: Colors.orange,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          ElevatedButton.icon(
                            onPressed: _submitting ? null : _onSubmit,
                            icon: _submitting
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                : const Icon(Icons.check),
                            label: const Text('Nộp lại'),
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 18,
                                vertical: 12,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _audioCard(
    BuildContext context, {
    required String audioUrl,
    String? transcript,
    required String transcriptMode,
    required int maxReplay,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Audio', style: TextStyle(fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: Colors.grey.shade300),
            borderRadius: BorderRadius.circular(12),
          ),
          child: PracticePlayer(
            key: ValueKey('audio_player_$audioUrl'), // ✅ Key để preserve state khi rebuild
            url: audioUrl,
            transcript: transcript,
            transcriptMode: transcriptMode,
            maxReplay: maxReplay,
            onGateOpen: () => setState(() => _gateOpen = true),
          ),
        ),
      ],
    );
  }

  Widget _gateHint() {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.amber.withValues(alpha: .08),
        border: Border.all(color: Colors.amber.withValues(alpha: .35)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Row(
        children: [
          Icon(Icons.lock, color: Colors.amber),
          SizedBox(width: 10),
          Expanded(
            child: Text(
              'Questions will unlock after you listen to enough of the audio.',
              style: TextStyle(fontSize: 13, color: Colors.black87),
            ),
          ),
        ],
      ),
    );
  }

  Widget _qCard(Map q, int idx, {Map? graded}) {
    final String questionId = q['_id'];
    final String type = q['type'];

    final bool? isCorrect = graded?['correct'] as bool?;
    final String? expected = (graded?['expected'] as List?)?.join(', ');
    final String? explanation = graded?['explanation'] as String?;

    final borderColor = isCorrect == null
        ? Colors.transparent
        : (isCorrect ? Colors.green : Colors.red).withValues(alpha: .35);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0.5,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Container(
        decoration: BoxDecoration(
          border: Border.all(color: borderColor),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '$idx. ${q['prompt']}',
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 16,
                ),
              ),
              if ((q['snippet'] as String?)?.isNotEmpty == true) ...[
                const SizedBox(height: 8),
                _snippetBox(q['snippet'] as String),
              ],
              const SizedBox(height: 8),
              if (type == 'mcq' || type == 'heading')
                ...(((q['options'] as List?) ?? []).map(
                  (o) => RadioListTile<String>(
                    value: o.toString(),
                    // ignore: deprecated_member_use
                    groupValue: _userAnswers[questionId],
                    // ignore: deprecated_member_use
                    onChanged: (v) {
                      _touch(questionId);
                      setState(() => _userAnswers[questionId] = v);
                    },
                    title: Text(o.toString()),
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                  ),
                )),
              if (type == 'truefalse' || type == 'yesno_ng')
                ..._polarityChoices(questionId: questionId, type: type),
              if (type == 'gap') ...[
                const SizedBox(height: 6),
                TextField(
                  decoration: const InputDecoration(
                    hintText: 'Your answer',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                  onChanged: (v) {
                    _touch(questionId);
                    _userAnswers[questionId] = v;
                  },
                ),
              ],
              // ✅ Speaking: ghi âm hoặc upload file
              if (type == 'speaking') ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    ElevatedButton.icon(
                      icon: Icon(_isRecording ? Icons.stop : Icons.mic),
                      label: Text(_isRecording ? 'Dừng ghi âm' : 'Ghi âm'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _isRecording
                            ? Colors.redAccent
                            : Colors.blueAccent,
                      ),
                      onPressed: () => _recordAudio(questionId),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton.icon(
                      icon: const Icon(Icons.upload_file),
                      label: const Text('Tải file'),
                      onPressed: () => _pickSpeakingFile(questionId),
                    ),
                  ],
                ),
                // ✅ Hiển thị audio player để nghe lại sau khi ghi âm/upload thành công
                if (_userAnswers[questionId] != null && _submitResult == null)
                  Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.check_circle, color: Colors.green, size: 18),
                            SizedBox(width: 6),
                            Text(
                              'Đã ghi âm',
                              style: TextStyle(
                                color: Colors.green,
                                fontWeight: FontWeight.w600,
                                fontSize: 14,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade50,
                            border: Border.all(color: Colors.grey.shade300),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: PracticePlayer(
                            key: ValueKey('preview_player_${_userAnswers[questionId]}'),
                            url: _absUrl(_userAnswers[questionId] as String?),
                            transcriptMode: 'never',
                            maxReplay: 99,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],

              // ✅ Hiển thị audio player cho speaking sau khi nộp bài
              if (type == 'speaking' &&
                  graded?['payload'] != null &&
                  graded!['payload'].toString().isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Bài nộp của bạn:',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: Colors.black87,
                        ),
                      ),
                      const SizedBox(height: 6),
                      PracticePlayer(
                        url: _absUrl(graded['payload'] as String?),
                        transcriptMode: 'never',
                        maxReplay: 99,
                      ),
                    ],
                  ),
                ),

              // ✅ Hiển thị câu trả lời cho các loại khác (không phải speaking)
              if (type != 'speaking' &&
                  graded?['payload'] != null &&
                  graded!['payload'].toString().isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    'Your answer: ${graded['payload']}',
                    style: const TextStyle(
                      fontStyle: FontStyle.italic,
                      color: Colors.black87,
                    ),
                  ),
                ),

              if (isCorrect != null) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(
                      isCorrect ? Icons.check_circle : Icons.cancel,
                      color: isCorrect ? Colors.green : Colors.red,
                      size: 18,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      isCorrect ? 'Correct' : 'Incorrect',
                      style: TextStyle(
                        color: isCorrect ? Colors.green : Colors.red,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                if (expected != null && expected.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      'Answer: $expected',
                      style: const TextStyle(color: Colors.black87),
                    ),
                  ),
                if (explanation != null && explanation.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      'Note: $explanation',
                      style: const TextStyle(color: Colors.black54),
                    ),
                  ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _snippetBox(String text) {
    final spans = <TextSpan>[];
    final reg = RegExp(r'\[\[(.*?)\]\]');
    int idx = 0;
    for (final m in reg.allMatches(text)) {
      if (m.start > idx) {
        spans.add(TextSpan(text: text.substring(idx, m.start)));
      }
      spans.add(
        TextSpan(
          text: m.group(1),
          style: const TextStyle(backgroundColor: Color(0xFFFFF59D)),
        ),
      );
      idx = m.end;
    }
    if (idx < text.length) spans.add(TextSpan(text: text.substring(idx)));
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(8),
      ),
      child: SelectableText.rich(
        TextSpan(
          style: const TextStyle(fontSize: 14, height: 1.35),
          children: spans,
        ),
      ),
    );
  }

  List<Widget> _polarityChoices({
    required String questionId,
    required String type,
  }) {
    final List<Map<String, String>> options = (type == 'truefalse')
        ? [
            {'value': 'true', 'label': 'True'},
            {'value': 'false', 'label': 'False'},
          ]
        : [
            {'value': 'true', 'label': 'Yes'},
            {'value': 'false', 'label': 'No'},
            {'value': 'not_given', 'label': 'Not given'},
          ];

    return options
        .map(
          (o) => RadioListTile<String>(
            value: o['value']!,
            // ignore: deprecated_member_use
            groupValue: _userAnswers[questionId],
            // ignore: deprecated_member_use
            onChanged: (v) {
              _touch(questionId);
              setState(() => _userAnswers[questionId] = v);
            },
            title: Text(o['label']!),
            dense: true,
            contentPadding: EdgeInsets.zero,
          ),
        )
        .toList();
  }
}
