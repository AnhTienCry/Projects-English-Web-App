// filepath: e:\Visual\English_web_app\English-App-Mobile1\english_app_mobile\lib\screens\lessons\lesson_topic_screen.dart
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../api/api_client.dart';
import '../../config/api_config.dart';
import 'topic_option_screen.dart';

class LessonTopicScreen extends StatefulWidget {
  final String lessonId;
  final String lessonTitle;

  const LessonTopicScreen({
    super.key,
    required this.lessonId,
    required this.lessonTitle,
  });

  @override
  State<LessonTopicScreen> createState() => _LessonTopicScreenState();
}

class _LessonTopicScreenState extends State<LessonTopicScreen> {
  List<dynamic> _topics = [];
  Map<String, bool> _completedStatus = {}; // Trạng thái hoàn thành từng topic
  Map<String, DateTime?> _completedAt = {}; // Thời gian hoàn thành từng topic
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchTopics();
  }

  Future<void> _fetchTopics() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _error = null;
      _topics = [];
      _completedStatus = {};
      _completedAt = {};
    });

    final url = '${ApiConfig.baseUrl}${ApiConfig.topicsByLessonEndpoint}/${widget.lessonId}';
    final statusUrl = '${ApiConfig.baseUrl}${ApiConfig.topicStatusEndpoint}/${widget.lessonId}';
    debugPrint('➡️ Fetching topics from: $url');
    debugPrint('➡️ Fetching topic status from: $statusUrl');

    try {
      // Gọi cả 2 API song song
      final responses = await Future.wait([
        dio.get(url),
        dio.get(statusUrl).catchError((e) => Response(
          requestOptions: RequestOptions(path: statusUrl),
          data: {'topics': []},
        )),
      ]);
      
      final data = responses[0].data;
      final statusData = responses[1].data;
      
      List<dynamic> list = [];

      if (data is List) {
        list = data;
      } else if (data is Map) {
        if (data.containsKey('topics')) {
          list = List.from(data['topics'] ?? []);
        } else if (data.containsKey('items')) {
          list = List.from(data['items'] ?? []);
        } else if (data.containsKey('data') && data['data'] is List) {
          list = List.from(data['data']);
        }
      }

      // Parse trạng thái hoàn thành
      final Map<String, bool> completed = {};
      final Map<String, DateTime?> completedAtMap = {};
      if (statusData is Map && statusData['topics'] is List) {
        for (final t in statusData['topics']) {
          final id = (t['_id'] ?? '').toString();
          if (id.isNotEmpty) {
            completed[id] = t['completed'] == true;
            // Parse completedAt nếu có
            if (t['completedAt'] != null) {
              try {
                completedAtMap[id] = DateTime.parse(t['completedAt'].toString());
              } catch (_) {
                completedAtMap[id] = null;
              }
            }
          }
        }
      }

      if (!mounted) return;
      setState(() {
        _topics = list;
        _completedStatus = completed;
        _completedAt = completedAtMap;
        _isLoading = false;
        _error = list.isEmpty ? 'Chưa có topic cho bài học này.' : null;
      });
      debugPrint('✅ Loaded ${list.length} topics, ${completed.values.where((v) => v).length} completed');
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      final msg = status == 404
          ? '404: Endpoint topics không tồn tại trên server. Kiểm tra ApiConfig hoặc backend.'
          : 'Lỗi tải topics: ${e.message}';
      debugPrint('❌ $msg\n${e.response?.data}');
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _topics = [];
        _error = msg;
      });
    } catch (e, st) {
      debugPrint('❌ Unexpected error fetching topics: $e\n$st');
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _topics = [];
        _error = 'Lỗi không xác định khi tải topics.';
      });
    }
  }

  /// Format thời gian hoàn thành theo định dạng dễ đọc
  String _formatCompletedAt(DateTime dateTime) {
    final now = DateTime.now();
    final diff = now.difference(dateTime);

    if (diff.inDays == 0) {
      // Trong ngày hôm nay
      final hour = dateTime.hour.toString().padLeft(2, '0');
      final minute = dateTime.minute.toString().padLeft(2, '0');
      return 'Hôm nay lúc $hour:$minute';
    } else if (diff.inDays == 1) {
      final hour = dateTime.hour.toString().padLeft(2, '0');
      final minute = dateTime.minute.toString().padLeft(2, '0');
      return 'Hôm qua lúc $hour:$minute';
    } else if (diff.inDays < 7) {
      return '${diff.inDays} ngày trước';
    } else {
      // Format đầy đủ: dd/MM/yyyy HH:mm
      final day = dateTime.day.toString().padLeft(2, '0');
      final month = dateTime.month.toString().padLeft(2, '0');
      final year = dateTime.year;
      final hour = dateTime.hour.toString().padLeft(2, '0');
      final minute = dateTime.minute.toString().padLeft(2, '0');
      return '$day/$month/$year lúc $hour:$minute';
    }
  }

  Widget _buildTopicTile(dynamic topic) {
    final title = (topic['title'] ?? topic['name'] ?? 'Untitled Topic').toString();
    final subtitle = (topic['description'] ?? '').toString();
    final id = (topic['id'] ?? topic['_id'] ?? topic['topicId'] ?? '').toString();
    final isCompleted = _completedStatus[id] == true;
    final completedAt = _completedAt[id];

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: isCompleted 
            ? BorderSide(color: Colors.green.shade400, width: 2)
            : BorderSide.none,
      ),
      child: InkWell(
        onTap: () async {
          if (id.isEmpty) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Topic id không hợp lệ', style: GoogleFonts.inter()),
                backgroundColor: Colors.red,
              ),
            );
            return;
          }
          // Chờ kết quả từ TopicOptionScreen và reload khi quay về
          await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => TopicOptionScreen(
                lessonId: widget.lessonId,
                lessonTitle: widget.lessonTitle,
                topicId: id,
                topicTitle: title,
              ),
            ),
          );
          // Reload để cập nhật trạng thái hoàn thành
          _fetchTopics();
        },
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isCompleted 
                      ? Colors.green.shade100
                      : const Color(0xFF6366F1).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  isCompleted ? Icons.check_circle : Icons.topic,
                  color: isCompleted ? Colors.green.shade600 : const Color(0xFF6366F1),
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            title,
                            style: GoogleFonts.inter(
                              fontWeight: FontWeight.w600,
                              fontSize: 16,
                              letterSpacing: -0.3,
                              color: Colors.black87,
                            ),
                          ),
                        ),
                        if (isCompleted)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.green.shade100,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.check, size: 14, color: Colors.green.shade700),
                                const SizedBox(width: 4),
                                Text(
                                  'Hoàn thành',
                                  style: GoogleFonts.inter(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.green.shade700,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                    // Hiển thị thời gian hoàn thành
                    if (isCompleted && completedAt != null) ...[
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(Icons.access_time, size: 12, color: Colors.grey.shade500),
                          const SizedBox(width: 4),
                          Text(
                            _formatCompletedAt(completedAt),
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              color: Colors.grey.shade500,
                            ),
                          ),
                        ],
                      ),
                    ],
                    if (subtitle.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        subtitle,
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          color: Colors.grey.shade600,
                          letterSpacing: 0.1,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Icon(
                Icons.arrow_forward_ios,
                size: 16,
                color: Colors.grey.shade400,
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: Text(
          'Topics của ${widget.lessonTitle}',
          style: GoogleFonts.inter(
            fontWeight: FontWeight.w600,
            fontSize: 18,
            letterSpacing: -0.3,
          ),
        ),
        backgroundColor: const Color(0xFF6366F1), // Indigo dịu nhẹ
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.error_outline, size: 64, color: Colors.red.shade300),
                        const SizedBox(height: 16),
                        Text(
                          _error!,
                          style: GoogleFonts.inter(
                            color: Colors.red.shade700,
                            fontSize: 16,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          icon: const Icon(Icons.refresh),
                          label: const Text('Thử lại'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF6366F1),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                          ),
                          onPressed: _fetchTopics,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Nếu lỗi vẫn còn, kiểm tra ApiConfig hoặc hỏi backend dev về endpoint topics cho lesson.',
                          style: GoogleFonts.inter(fontSize: 12, color: Colors.black54),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                )
              : _topics.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.folder_open, size: 64, color: Colors.grey.shade400),
                          const SizedBox(height: 16),
                          Text(
                            'Chưa có topic cho bài học này',
                            style: GoogleFonts.inter(
                              fontSize: 16,
                              color: Colors.grey.shade600,
                            ),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _topics.length,
                      itemBuilder: (context, index) => _buildTopicTile(_topics[index]),
                    ),
    );
  }
}