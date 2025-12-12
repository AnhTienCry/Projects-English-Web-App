import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../config/api_config.dart';
import '../../utils/auth_helper.dart';

class StoryScreen extends StatefulWidget {
  final String lessonId;
  final String lessonTitle;
  final String? topicId; // Thêm topicId
  final String? topicTitle; // Thêm topicTitle
  final List<dynamic> vocabularies;

  const StoryScreen({
    super.key,
    required this.lessonId,
    required this.lessonTitle,
    this.topicId,
    this.topicTitle,
    required this.vocabularies,
  });

  @override
  State<StoryScreen> createState() => _StoryScreenState();
}

class _StoryScreenState extends State<StoryScreen>
    with SingleTickerProviderStateMixin {
  String _storyContent = '';
  List<dynamic> _selectedVocabs = [];
  bool _isLoading = true;
  String? _error;
  late final Dio _dio;
  late final AnimationController _fadeController;
  late final Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _dio = Dio(BaseOptions(baseUrl: ApiConfig.baseUrl));

    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    );
    _fadeAnimation = CurvedAnimation(
      parent: _fadeController,
      curve: Curves.easeInOut,
    );

    _fetchStoryAndSelectedVocabs();
  }

  @override
  void dispose() {
    _fadeController.dispose();
    super.dispose();
  }

  Future<void> _fetchStoryAndSelectedVocabs() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final token = await AuthHelper.getToken();
      
      // Ưu tiên fetch theo topicId nếu có (Normal mode), nếu không thì fetch theo lessonId (Rank mode)
      String url;
      if (widget.topicId != null && widget.topicId!.isNotEmpty) {
        // Normal mode: fetch theo topic
        url = '${ApiConfig.storiesEndpoint}/topic/${widget.topicId}';
        debugPrint('🔍 Fetching story by topic: ${widget.topicId}');
      } else {
        // Rank mode: fetch theo lesson
        url = '${ApiConfig.storiesEndpoint}/lesson/${widget.lessonId}';
        debugPrint('🔍 Fetching story by lesson: ${widget.lessonId}');
      }
      
      final response = await _dio.get(
        url,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        setState(() {
          _storyContent = data['content'] ?? '';
          _selectedVocabs = data['selectedVocabIds'] ?? [];
          _isLoading = false;
        });
        _fadeController.forward(from: 0);
      } else {
        throw Exception('Failed to load story');
      }
    } catch (e) {
      debugPrint('❌ Lỗi khi tải truyện: $e');
      setState(() {
        _error = 'Không thể tải truyện cho bài học này.';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.lessonTitle,
          style: GoogleFonts.inter(
            fontWeight: FontWeight.w600,
            fontSize: 18,
            letterSpacing: -0.3,
            color: Colors.white,
          ),
        ),
        backgroundColor: const Color(0xFF10B981), // Green dịu nhẹ - nhất quán
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? _buildErrorWidget()
          : FadeTransition(opacity: _fadeAnimation, child: _buildStoryView()),
    );
  }

  Widget _buildErrorWidget() => Center(
    child: Padding(
      padding: const EdgeInsets.all(32.0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 60, color: Colors.grey.shade400),
          const SizedBox(height: 16),
          Text(
            _error!,
            style: GoogleFonts.inter(fontSize: 16, color: Colors.black54),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: _fetchStoryAndSelectedVocabs,
            icon: const Icon(Icons.refresh),
            label: const Text('Thử lại'),
          ),
        ],
      ),
    ),
  );

  String _norm(String s) =>
      s.toLowerCase().replaceAll(RegExp(r'\s+'), ' ').trim();

  Widget _buildStoryView() {
    // Map key = từ/cụm từ đã chuẩn hoá (lowercase + co gọn khoảng trắng)
    final vocabMap = {
      for (var v in _selectedVocabs) _norm((v['word'] as String? ?? '')): v,
    };

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Truyện chêm: ${widget.lessonTitle}',
            style: GoogleFonts.inter(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 20),
          _buildStoryWithPopup(_storyContent, vocabMap),
        ],
      ),
    );
  }

  /// ------------------- HIỂN THỊ TRUYỆN VÀ POPUP NGHĨA -------------------
  Widget _buildStoryWithPopup(
    String content,
    Map<String, dynamic> vocabMapRaw,
  ) {
    // Chuẩn hoá key như lúc build map
    final vocabMap = {
      for (final e in vocabMapRaw.entries) _norm(e.key): e.value,
    };

    // Danh sách cụm từ, sắp xếp theo độ dài giảm dần để ưu tiên match dài
    final phrases = vocabMap.keys.toList()
      ..sort((a, b) => b.length.compareTo(a.length));
    if (phrases.isEmpty) {
      return Text(
        content,
        style: GoogleFonts.inter(
          fontSize: 18,
          color: Colors.black87,
          height: 1.7,
        ),
      );
    }

    // Tạo pattern: \b(?:get\s+up|breakfast|routine)\b  (case-insensitive)
    final escaped = phrases
        .map((p) {
          final parts = p.split(' ').map(RegExp.escape).toList();
          return r'\b' + parts.join(r'\s+') + r'\b';
        })
        .join('|');
    final pattern = RegExp('(?:$escaped)', caseSensitive: false);

    final spans = <InlineSpan>[];
    int last = 0;

    for (final m in pattern.allMatches(content)) {
      // Phần text thường trước match
      if (m.start > last) {
        spans.add(TextSpan(text: content.substring(last, m.start)));
      }

      final matchedText = m.group(0)!; // giữ nguyên cách viết gốc
      final key = _norm(matchedText); // chuẩn hoá để tra map
      final vocab = vocabMap[key];

      if (vocab == null) {
        spans.add(TextSpan(text: matchedText));
      } else {
        spans.add(
          WidgetSpan(
            alignment: PlaceholderAlignment.baseline,
            baseline: TextBaseline.alphabetic,
            child: GestureDetector(
              onTap: () => _showVocabPopup(context, vocab),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  matchedText,
                  style: GoogleFonts.inter(
                    fontSize: 18,
                    height: 1.7,
                    fontWeight: FontWeight.w600,
                    color: Colors.green.shade800,
                    shadows: [
                      Shadow(
                        offset: const Offset(0, 1),
                        blurRadius: 4,
                        color: Colors.green.shade200,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      }

      last = m.end;
    }

    // Phần còn lại sau match cuối
    if (last < content.length) {
      spans.add(TextSpan(text: content.substring(last)));
    }

    return RichText(
      text: TextSpan(
        style: GoogleFonts.inter(
          fontSize: 18,
          color: Colors.black87,
          height: 1.7,
        ),
        children: spans,
      ),
    );
  }

  void _showVocabPopup(BuildContext context, Map<String, dynamic> vocab) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Text(
                vocab['word'] ?? '',
                style: GoogleFonts.inter(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF10B981), // Green dịu nhẹ
                ),
              ),
              const SizedBox(height: 8),
              Text(
                vocab['phonetic'] ?? '',
                style: const TextStyle(
                  fontFamily:
                      'Charis', // <- dùng Charis (Charis SIL hỗ trợ IPA rất tốt)
                  fontSize: 16,
                  fontStyle: FontStyle.italic,
                  color: Colors.black87,
                ),
              ),

              const SizedBox(height: 12),
              Text(
                vocab['meaning'] ?? '',
                style: GoogleFonts.inter(fontSize: 18, color: Colors.black87),
              ),
              const SizedBox(height: 8),
              if (vocab['partOfSpeech'] != null &&
                  vocab['partOfSpeech'].toString().isNotEmpty)
                Text(
                  '(${vocab['partOfSpeech']})',
                  style: GoogleFonts.inter(
                    fontSize: 16,
                    fontStyle: FontStyle.italic,
                    color: Colors.grey.shade700,
                  ),
                ),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }
}
