// filepath: e:\Visual\English_web_app\English-App-Mobile1\english_app_mobile\lib\screens\lessons\topic_option_screen.dart
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../api/api_client.dart';
import '../../config/api_config.dart';
import '../quiz/quiz_screen.dart';
import '../vocabulary/vocabulary_flashcard_screen.dart';
import 'story_screen.dart';

class TopicOptionScreen extends StatefulWidget {
  final String lessonId;
  final String lessonTitle;
  final String topicId;
  final String topicTitle;

  const TopicOptionScreen({
    super.key,
    required this.lessonId,
    required this.lessonTitle,
    required this.topicId,
    required this.topicTitle,
  });

  @override
  State<TopicOptionScreen> createState() => _TopicOptionScreenState();
}

class _TopicOptionScreenState extends State<TopicOptionScreen> {
  List<dynamic> _vocabularies = [];

  @override
  void initState() {
    super.initState();
    _fetchVocabularies();
  }

  Future<void> _fetchVocabularies() async {
    try {
      // Fetch vocabularies theo topicId
      final url = '${ApiConfig.vocabByTopicEndpoint}/${widget.topicId}';
      debugPrint('🔍 Fetching vocabularies for topic: ${widget.topicId}');

      final response = await dio.get(url);

      if (!mounted) return;

      final data = response.data;
      List<dynamic> vocabList = [];

      if (data is List) {
        vocabList = data;
      } else if (data is Map && data.containsKey('vocabs')) {
        vocabList = List.from(data['vocabs'] ?? []);
      } else if (data is Map && data.containsKey('items')) {
        vocabList = List.from(data['items'] ?? []);
      }

      if (!mounted) return;
      setState(() {
        _vocabularies = vocabList;
      });
      debugPrint('✅ Loaded ${_vocabularies.length} vocabularies for topic');
    } catch (e) {
      debugPrint('❌ Error fetching vocabularies: $e');
    }
  }

  Widget _buildOptionCard({
    required BuildContext context,
    required String title,
    required String subtitle,
    required IconData icon,
    required LinearGradient gradient,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          gradient: gradient,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: gradient.colors[0].withValues(alpha: 0.3),
              blurRadius: 16,
              offset: const Offset(0, 8),
              spreadRadius: 2,
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.25),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icon, size: 32, color: Colors.white),
            ),
            const SizedBox(width: 20),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.inter(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    subtitle,
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      color: Colors.white.withValues(alpha: 0.95),
                      letterSpacing: 0.1,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.25),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.arrow_forward_rounded,
                color: Colors.white,
                size: 20,
              ),
            ),
          ],
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
          widget.topicTitle,
          style: GoogleFonts.inter(
            fontWeight: FontWeight.w600,
            fontSize: 18,
            letterSpacing: -0.3,
          ),
        ),
        backgroundColor: const Color(0xFF6366F1), // Indigo dịu nhẹ - nhất quán với lesson
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 8),
            _buildOptionCard(
              context: context,
              title: 'Từ vựng',
              subtitle: 'Học từ vựng qua flashcard',
              icon: Icons.book_rounded,
              gradient: LinearGradient(
                colors: [
                  const Color(0xFF3B82F6), // Blue dịu nhẹ
                  const Color(0xFF2563EB), // Blue đậm hơn
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => VocabularyFlashcardScreen(
                      lessonId: widget.lessonId,
                      lessonTitle: widget.lessonTitle,
                      topicId: widget.topicId,
                      topicTitle: widget.topicTitle,
                      initialVocabularies: _vocabularies,
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 16),
            _buildOptionCard(
              context: context,
              title: 'Quiz',
              subtitle: 'Làm bài kiểm tra',
              icon: Icons.quiz_rounded,
              gradient: LinearGradient(
                colors: [
                  const Color(0xFFF59E0B), // Amber dịu nhẹ
                  const Color(0xFFD97706), // Amber đậm hơn
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              onTap: () async {
                final result = await Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => QuizScreen(
                      topicId: widget.topicId,
                      lessonId: widget.lessonId,
                    ),
                  ),
                );
                // Reload screen if quiz was completed successfully
                if (result != null && mounted) {
                  // Quiz completed, could reload if needed
                  debugPrint('Quiz completed with result: $result');
                }
              },
            ),
            const SizedBox(height: 16),
            _buildOptionCard(
              context: context,
              title: 'Story',
              subtitle: 'Đọc truyện để học',
              icon: Icons.auto_stories_rounded,
              gradient: LinearGradient(
                colors: [
                  const Color(0xFF10B981), // Green dịu nhẹ
                  const Color(0xFF059669), // Green đậm hơn
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => StoryScreen(
                      lessonId: widget.lessonId,
                      lessonTitle: widget.lessonTitle,
                      topicId: widget.topicId,
                      topicTitle: widget.topicTitle,
                      vocabularies: _vocabularies,
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}