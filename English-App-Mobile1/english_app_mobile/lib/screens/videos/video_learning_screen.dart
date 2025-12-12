import 'package:flutter/material.dart';
import '../../api/api_client.dart';
import '../../config/api_config.dart';
import '../lessons/lesson_videos_screen.dart';

class VideoLearningScreen extends StatefulWidget {
  const VideoLearningScreen({super.key});

  @override
  State<VideoLearningScreen> createState() => _VideoLearningScreenState();
}

class _VideoLearningScreenState extends State<VideoLearningScreen> {
  List<dynamic> lessons = [];
  bool loading = true;
  String? error;

  @override
  void initState() {
    super.initState();
    fetchLessons();
  }

  Future<void> fetchLessons() async {
    if (!mounted) return;
    
    setState(() {
      loading = true;
      error = null;
    });

    try {
      // ✅ Use publishedLessonsEndpoint to only show published lessons
      final response = await dio.get(ApiConfig.publishedLessonsEndpoint);
      
      if (!mounted) return;
      
      setState(() {
        lessons = response.data ?? [];
        loading = false;
      });
    } catch (e) {
      debugPrint('Error fetching lessons: $e');
      if (mounted) {
        setState(() {
          error = 'Failed to load lessons: ${e.toString()}';
          loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Learning Videos',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        backgroundColor: Colors.purple,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: fetchLessons,
          ),
        ],
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Colors.purple, Colors.deepPurple],
          ),
        ),
        child: loading
            ? const Center(
                child: CircularProgressIndicator(color: Colors.white),
              )
            : error != null
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.error_outline,
                          size: 64,
                          color: Colors.white.withValues(alpha: 0.7),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          error!,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: fetchLessons,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: Colors.purple,
                          ),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  )
                : lessons.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.video_library_outlined,
                              size: 64,
                              color: Colors.white.withValues(alpha: 0.7),
                            ),
                            const SizedBox(height: 16),
                            const Text(
                              'No lessons available',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Check back later for new content',
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.8),
                                fontSize: 14,
                              ),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: fetchLessons,
                        color: Colors.purple,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: lessons.length,
                          itemBuilder: (context, index) {
                            final lesson = lessons[index];
                            return LessonCard(
                              lesson: lesson,
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => LessonVideosScreen(
                                      lesson: lesson,
                                    ),
                                  ),
                                );
                              },
                            );
                          },
                        ),
                      ),
      ),
    );
  }
}

class LessonCard extends StatelessWidget {
  final Map<String, dynamic> lesson;
  final VoidCallback onTap;

  const LessonCard({
    super.key,
    required this.lesson,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final level = int.tryParse(lesson['level']?.toString() ?? '1') ?? 1;
    final isUnlocked = lesson['isUnlocked'] ?? false;
    final isCompleted = lesson['isCompleted'] ?? false;

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 8,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: InkWell(
        onTap: isUnlocked ? onTap : null,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: isUnlocked
                  ? [Colors.white, Colors.grey.shade50]
                  : [Colors.grey.shade300, Colors.grey.shade400],
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: _getLevelColor(level),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      level is String ? level as String : 'Level $level',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  const Spacer(),
                  if (isCompleted)
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: const BoxDecoration(
                        color: Colors.green,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.check,
                        color: Colors.white,
                        size: 16,
                      ),
                    )
                  else if (!isUnlocked)
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: const BoxDecoration(
                        color: Colors.grey,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.lock,
                        color: Colors.white,
                        size: 16,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                lesson['title'] ?? 'Untitled Lesson',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: isUnlocked ? Colors.black87 : Colors.grey.shade600,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                lesson['description'] ?? 'No description available',
                style: TextStyle(
                  fontSize: 14,
                  color: isUnlocked ? Colors.grey.shade600 : Colors.grey.shade500,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Icon(
                    Icons.video_library,
                    size: 16,
                    color: isUnlocked ? Colors.purple : Colors.grey.shade500,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'Interactive Video Learning',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: isUnlocked ? Colors.purple : Colors.grey.shade500,
                    ),
                  ),
                  const Spacer(),
                  if (isUnlocked)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.purple,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Text(
                        'A2',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _getLevelColor(dynamic level) {
    // Handle both String and int level values
    int levelNum;
    if (level is String) {
      // Handle CEFR levels like "A1", "A2", "B1", etc.
      switch (level.toUpperCase()) {
        case 'A1':
          levelNum = 1;
          break;
        case 'A2':
          levelNum = 2;
          break;
        case 'B1':
          levelNum = 3;
          break;
        case 'B2':
          levelNum = 4;
          break;
        case 'C1':
          levelNum = 5;
          break;
        case 'C2':
          levelNum = 6;
          break;
        default:
          levelNum = int.tryParse(level) ?? 1;
      }
    } else {
      levelNum = int.tryParse(level?.toString() ?? '1') ?? 1;
    }
    
    switch (levelNum) {
      case 1:
        return Colors.green;
      case 2:
        return Colors.blue;
      case 3:
        return Colors.orange;
      case 4:
        return Colors.red;
      case 5:
        return Colors.purple;
      case 6:
        return Colors.indigo;
      default:
        return Colors.grey;
    }
  }
}