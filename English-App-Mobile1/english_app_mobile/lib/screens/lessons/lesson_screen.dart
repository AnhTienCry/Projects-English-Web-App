import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../api/api_client.dart';
import '../../config/api_config.dart';
import '../../utils/progress_store.dart';
import 'lesson_topic_screen.dart';

class LessonScreen extends StatefulWidget {
  final String mode;

  const LessonScreen({super.key, String? mode}) : mode = mode ?? 'normal';

  @override
  State<LessonScreen> createState() => _LessonScreenState();
}

class _LessonScreenState extends State<LessonScreen>
    with TickerProviderStateMixin {
  List<dynamic> _lessons = [];
  bool _loading = true;
  String? _error;
  late AnimationController _animationController;

  // Cache cục bộ
  Map<String, int> _cachedPercent = {};
  Map<String, bool> _cachedCompleted = {};

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    _cachedPercent = await ProgressStore.loadPercent();
    _cachedCompleted = await ProgressStore.loadCompleted();
    if (!mounted) return;
    await _fetchLessons();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  /// ====== FETCH + MERGE PROGRESS (server + cache) ======
  Future<void> _fetchLessons() async {
    if (!mounted) return;

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final res = await dio.get("/api/lessons/progress/me");
      final data = res.data;

      if (!mounted) return;

      if (data is Map && data['items'] is List) {
        final lessons = List.from(data['items']);

        // completed từ server
        final completedFromServer = <String>{};
        if (data['progress'] is Map &&
            data['progress']['completedLessons'] is List) {
          for (final id in data['progress']['completedLessons']) {
            completedFromServer.add(id.toString());
          }
        }

        // Load topic status for each lesson to get accurate progress (parallel calls)
        final topicStatusMap = <String, int>{};
        if (lessons.isNotEmpty) {
          try {
            final topicStatusFutures = lessons.map((l) async {
              final id = (l['id'] ?? l['_id'] ?? '').toString();
              try {
                final topicStatusRes = await dio.get('${ApiConfig.topicStatusEndpoint}/$id');
                if (topicStatusRes.data is Map) {
                  final topicStatusData = topicStatusRes.data as Map<String, dynamic>;
                  final progressPercent = topicStatusData['progressPercent'] ?? 0;
                  debugPrint('📊 Lesson $id progress from topics: $progressPercent%');
                  return MapEntry(id, progressPercent as int);
                }
              } catch (e) {
                debugPrint('⚠️ Failed to get topic status for lesson $id: $e');
              }
              return null;
            }).toList();
            
            final topicStatusResults = await Future.wait(topicStatusFutures);
            for (final result in topicStatusResults) {
              if (result != null) {
                topicStatusMap[result.key] = result.value;
              }
            }
          } catch (e) {
            debugPrint('⚠️ Error loading topic statuses: $e');
          }
        }

        // merge server + cache
        for (var i = 0; i < lessons.length; i++) {
          final l = lessons[i];
          final id = (l['id'] ?? l['_id'] ?? '').toString();

          // Completed: server ưu tiên, fallback cache
          final isCompleted =
              completedFromServer.contains(id) || (_cachedCompleted[id] ?? false);
          l['isCompleted'] = isCompleted;

          // Percent:
          // 1) ưu tiên topic-status (progress từ số topic đã hoàn thành)
          // 2) giá trị server
          // 3) cache
          // 4) nếu completed mà vẫn chưa có -> ép 100
          int percent = 0;
          if (topicStatusMap.containsKey(id)) {
            percent = topicStatusMap[id]!;
          } else {
            final serverP = l['percent'];
            if (serverP is int) {
              percent = serverP;
            } else if (serverP is String) {
              percent = int.tryParse(serverP) ?? 0;
            } else {
              percent = _cachedPercent[id] ?? 0;
            }
          }
          if (percent <= 0 && isCompleted) percent = 100;
          l['percent'] = percent;

          // Locked: Normal mode không có lock
          l['locked'] = false;
        }

        // cập nhật cache từ list đã merge
        final newPercent = <String, int>{};
        final newCompleted = <String, bool>{};
        for (final l in lessons) {
          final id = (l['id'] ?? l['_id'] ?? '').toString();
          newPercent[id] = (l['percent'] is int)
              ? l['percent']
              : int.tryParse('${l['percent'] ?? 0}') ?? 0;
          newCompleted[id] = l['isCompleted'] == true;
        }
        _cachedPercent = newPercent;
        _cachedCompleted = newCompleted;
        ProgressStore.savePercent(_cachedPercent);
        ProgressStore.saveCompleted(_cachedCompleted);

        setState(() {
          _lessons = lessons;
          _loading = false;
        });
        _animationController.forward();
      } else {
        setState(() {
          _error = "Unexpected response format";
          _loading = false;
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  /// ====== OPEN LESSON + HANDLE RESULT ======
  Future<void> _openLesson(dynamic lesson) async {
    if (lesson['locked'] == true) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: const [
              Icon(Icons.lock, color: Colors.white, size: 20),
              SizedBox(width: 12),
              Expanded(
                child: Text('Complete the previous lesson to unlock this one'),
              ),
            ],
          ),
          backgroundColor: Colors.orange.shade700,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      );
      return;
    }

    final String lessonIdStr = (lesson['id'] ?? lesson['_id'] ?? '').toString();
    final String lessonTitle = (lesson['title'] ?? '').toString();

    // Normal mode: đi tới LessonTopicScreen
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => LessonTopicScreen(
          lessonId: lessonIdStr,
          lessonTitle: lessonTitle,
        ),
      ),
    );

    if (!mounted) return;

    if (result is Map) {
      final String resultLessonId =
          (result['lessonId'] ?? lessonIdStr).toString();
      if (resultLessonId == lessonIdStr) {
        final rawPercent = result['percent'] ?? result['score'] ?? 0;
        final int newPercent = rawPercent is int
            ? rawPercent
            : int.tryParse(rawPercent.toString()) ?? 0;
        final bool passed = (result['passed'] == true) || newPercent >= 80;

        setState(() {
          final idx = _lessons.indexWhere(
            (x) => (x['id'] ?? x['_id'] ?? '').toString() == lessonIdStr,
          );
          if (idx != -1) {
            final fixedPercent = (passed && newPercent <= 0) ? 100 : newPercent;
            _lessons[idx]['percent'] = fixedPercent;
            _lessons[idx]['isCompleted'] = passed;

            // Normal mode không có lock mechanism
          }
        });

        _cachedPercent[lessonIdStr] =
            (passed && newPercent <= 0) ? 100 : newPercent;
        _cachedCompleted[lessonIdStr] = passed;
        ProgressStore.upsertOne(
          lessonId: lessonIdStr,
          percent: _cachedPercent[lessonIdStr],
          completed: passed,
        );

        Future.delayed(const Duration(seconds: 2), () async {
          if (mounted) await _fetchLessons();
        });
      }
    }
  }

  /// ====== UI HELPERS ======
  List<Color> _getCardColors(dynamic lesson, int index) {
    final completed = lesson['isCompleted'] == true;

    final colorSchemes = [
      [const Color(0xFF6366F1), const Color(0xFF8B5CF6)],
      [const Color(0xFF06B6D4), const Color(0xFF3B82F6)],
      [const Color(0xFF10B981), const Color(0xFF059669)],
      [const Color(0xFFF59E0B), const Color(0xFFEF4444)],
      [const Color(0xFFEC4899), const Color(0xFFF43F5E)],
    ];
    if (completed) return [const Color(0xFF10B981), const Color(0xFF059669)];
    return colorSchemes[index % colorSchemes.length];
  }

  Widget _buildLessonCard(dynamic lesson, int index) {
    final title = lesson['title'] ?? 'Untitled Lesson';
    final description = lesson['description'] ?? '';
    final completed = lesson['isCompleted'] == true;

    final colors = _getCardColors(lesson, index);

    return AnimatedBuilder(
      animation: _animationController,
      builder: (context, child) {
        final animation = CurvedAnimation(
          parent: _animationController,
          curve: Interval(
            (index * 0.1).clamp(0.0, 1.0),
            ((index * 0.1) + 0.3).clamp(0.0, 1.0),
            curve: Curves.easeOutCubic,
          ),
        );

        return Transform.translate(
          offset: Offset(0, 50 * (1 - animation.value)),
          child: Opacity(opacity: animation.value, child: child),
        );
      },
      child: GestureDetector(
        onTap: () => _openLesson(lesson),
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: colors,
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: colors[0].withValues(alpha: 0.4),
                blurRadius: 12,
                spreadRadius: 0,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: Stack(
              children: [
                Positioned.fill(
                  child: Opacity(
                    opacity: 0.1,
                    child: CustomPaint(painter: _PatternPainter()),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 56,
                            height: 56,
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.25),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Icon(
                              completed
                                  ? Icons.check_circle_rounded
                                  : Icons.play_circle_rounded,
                              color: Colors.white,
                              size: 28,
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 10,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.25),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    'Lesson ${index + 1}',
                                    style: GoogleFonts.poppins(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                      color: Colors.white,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  title,
                                  style: GoogleFonts.poppins(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w700,
                                    color: Colors.white,
                                    height: 1.2,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        description,
                        style: GoogleFonts.poppins(
                          fontSize: 14,
                          color: Colors.white.withValues(alpha: 0.9),
                          height: 1.4,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (completed) ...[
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            if (completed)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.25),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(
                                      Icons.check_circle,
                                      color: Colors.white,
                                      size: 16,
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      'Completed',
                                      style: GoogleFonts.poppins(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            const Spacer(),
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.25),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(
                                Icons.arrow_forward_rounded,
                                color: Colors.white,
                                size: 20,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }


  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(
          title: Text(
            'Normal Mode',
            style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
          ),
          backgroundColor: const Color(0xFF3B82F6),
          elevation: 0,
        ),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null) {
      return Scaffold(
        appBar: AppBar(
          title: Text(
            'Normal Mode',
            style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
          ),
          backgroundColor: const Color(0xFF3B82F6),
          elevation: 0,
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 64, color: Colors.red),
              const SizedBox(height: 16),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Text(
                  'Error: $_error',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.poppins(),
                ),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _fetchLessons,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: Text(
          'Normal Mode',
          style: GoogleFonts.poppins(
            fontWeight: FontWeight.w600,
            color: Colors.white,
          ),
        ),
        backgroundColor: const Color(0xFF3B82F6),
        elevation: 0,
      ),
      body: RefreshIndicator(
        onRefresh: _fetchLessons,
        child: CustomScrollView(
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.symmetric(vertical: 20),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, i) {
                    final l = _lessons[i];
                    return Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 8,
                      ),
                      child: _buildLessonCard(l, i),
                    );
                  },
                  childCount: _lessons.length,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PatternPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;

    const spacing = 20.0;

    for (double i = 0; i < size.width; i += spacing) {
      for (double j = 0; j < size.height; j += spacing) {
        canvas.drawCircle(Offset(i, j), 2, paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
