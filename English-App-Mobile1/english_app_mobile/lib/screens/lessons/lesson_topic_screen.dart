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
    });

    final url = '${ApiConfig.baseUrl}${ApiConfig.topicsByLessonEndpoint}/${widget.lessonId}';
    debugPrint('➡️ Fetching topics from: $url');

    try {
      final resp = await dio.get(url);
      final data = resp.data;
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

      if (!mounted) return;
      setState(() {
        _topics = list;
        _isLoading = false;
        _error = list.isEmpty ? 'Chưa có topic cho bài học này.' : null;
      });
      debugPrint('✅ Loaded ${list.length} topics');
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

  Widget _buildTopicTile(dynamic topic) {
    final title = (topic['title'] ?? topic['name'] ?? 'Untitled Topic').toString();
    final subtitle = (topic['description'] ?? '').toString();
    final id = (topic['id'] ?? topic['_id'] ?? topic['topicId'] ?? '').toString();

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: InkWell(
        onTap: () {
          if (id.isEmpty) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Topic id không hợp lệ', style: GoogleFonts.inter()),
                backgroundColor: Colors.red,
              ),
            );
            return;
          }
          Navigator.push(
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
        },
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF6366F1).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.topic,
                  color: Color(0xFF6366F1),
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: GoogleFonts.inter(
                        fontWeight: FontWeight.w600,
                        fontSize: 16,
                        letterSpacing: -0.3,
                        color: Colors.black87,
                      ),
                    ),
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