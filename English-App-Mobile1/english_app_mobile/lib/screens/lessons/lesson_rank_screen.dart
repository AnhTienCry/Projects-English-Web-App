import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../api/api_client.dart';
import '../../config/api_config.dart';
import '../../utils/progress_store.dart';
import '../quiz/quiz_screen.dart';
import '../rankandbadge/leaderboard_screen.dart';

class LessonRankScreen extends StatefulWidget {
  const LessonRankScreen({super.key});

  @override
  State<LessonRankScreen> createState() => _LessonRankScreenState();
}

class _LessonRankScreenState extends State<LessonRankScreen>
    with TickerProviderStateMixin {
  List<dynamic> _lessons = [];
  bool _loading = true;
  String? _error;
  late AnimationController _animationController;

  // Cache cục bộ cho rank lessons (tách riêng với normal)
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
    // Load rank lessons progress (tách riêng với normal)
    _cachedPercent = await ProgressStore.loadRankPercent();
    _cachedCompleted = await ProgressStore.loadRankCompleted();
    if (!mounted) return;
    await _fetchLessons();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  /// ====== FETCH QUIZ RANK LESSONS ======
  Future<void> _fetchLessons() async {
    if (!mounted) return;

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final res = await dio.get(ApiConfig.quizRankLessonsEndpoint);
      final data = res.data;

      if (!mounted) return;

      if (data is List) {
        final lessons = List.from(data);

        // Merge với cache và server progress
        for (var i = 0; i < lessons.length; i++) {
          final l = lessons[i];
          final id = (l['_id'] ?? '').toString();

          // Completed: ưu tiên server, fallback cache
          // Nếu cache = true và server = false, giữ cache (tránh reset)
          bool isCompleted = false;
          final cachedCompleted = _cachedCompleted[id] ?? false;
          
          if (l['isCompleted'] != null) {
            isCompleted = l['isCompleted'] == true;
          } else {
            isCompleted = cachedCompleted;
          }
          
          // Nếu cache = true và server = false, giữ cache (tránh reset)
          if (!isCompleted && cachedCompleted) {
            isCompleted = true;
          }
          
          l['isCompleted'] = isCompleted;

          // Percent: ưu tiên server, fallback cache
          // Nếu cache có giá trị > 0 và server chưa có, giữ cache
          int percent = 0;
          final cachedPercent = _cachedPercent[id] ?? 0;
          
          if (l['percent'] != null) {
            final p = l['percent'];
            if (p is int) {
              percent = p;
            } else if (p is String) {
              percent = int.tryParse(p) ?? 0;
            } else {
              percent = int.tryParse('$p') ?? 0;
            }
          } else {
            // Nếu server chưa có, dùng cache (có thể đã submit nhưng chưa sync)
            percent = cachedPercent;
          }
          
          // Nếu cache có giá trị > 0 và server = 0, giữ cache (tránh reset)
          if (percent == 0 && cachedPercent > 0) {
            percent = cachedPercent;
          }
          
          if (percent <= 0 && isCompleted) {
            percent = 100;
          }
          l['percent'] = percent;

          // Locked: bài đầu tiên mở, các bài sau cần hoàn thành bài trước
          if (i == 0) {
            l['locked'] = false;
          } else {
            final prev = lessons[i - 1];
            final prevId = (prev['_id'] ?? '').toString();
            final prevCompleted = (prev['isCompleted'] == true) || (_cachedCompleted[prevId] ?? false);
            l['locked'] = !prevCompleted;
          }
        }

        // Cập nhật cache
        final newPercent = <String, int>{};
        final newCompleted = <String, bool>{};
        for (final l in lessons) {
          final id = (l['_id'] ?? '').toString();
          newPercent[id] = (l['percent'] is int)
              ? l['percent']
              : int.tryParse('${l['percent'] ?? 0}') ?? 0;
          newCompleted[id] = l['isCompleted'] == true;
        }
        _cachedPercent = newPercent;
        _cachedCompleted = newCompleted;
        // Lưu rank lessons progress riêng
        ProgressStore.saveRankPercent(_cachedPercent);
        ProgressStore.saveRankCompleted(_cachedCompleted);

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

    final String lessonIdStr = (lesson['_id'] ?? '').toString();

    // Prefetch quizzes for a smoother transition: show a small loading dialog while fetching,
    // then push QuizScreen with preloaded questions so the screen opens without an empty loader.
    List<dynamic> preloadedQuestions = [];
    if (mounted) {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => const Center(child: CircularProgressIndicator()),
      );
      try {
        final res = await dio.get(ApiConfig.quizRankEndpoint, queryParameters: {'lessonId': lessonIdStr});
        final raw = res.data;
        if (raw is List) {
          preloadedQuestions = List.from(raw);
        } else if (raw is Map) {
          if (raw['data'] is List) {
            preloadedQuestions = List.from(raw['data']);
          } else if (raw['questions'] is List) {
            preloadedQuestions = List.from(raw['questions']);
          } else if (raw['quizzes'] is List) {
            preloadedQuestions = List.from(raw['quizzes']);
          } else if (raw['items'] is List) {
            preloadedQuestions = List.from(raw['items']);
          }
        }
      } catch (e) {
        // ignore fetch error; we'll navigate and let QuizScreen handle empty-state
        debugPrint('⚠️ Prefetch quizzes failed: $e');
      } finally {
        if (mounted) Navigator.pop(context); // close loading dialog
      }
    }

    if (!mounted) return;
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => QuizScreen(
          lessonId: lessonIdStr,
          mode: 'rank',
          initialQuestions: preloadedQuestions.isNotEmpty ? preloadedQuestions : null,
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
            (x) => (x['_id'] ?? '').toString() == lessonIdStr,
          );
          if (idx != -1) {
            final fixedPercent = (passed && newPercent <= 0) ? 100 : newPercent;
            _lessons[idx]['percent'] = fixedPercent;
            _lessons[idx]['isCompleted'] = passed;

            if (passed && idx + 1 < _lessons.length) {
              _lessons[idx + 1]['locked'] = false;
            }
          }
        });

        _cachedPercent[lessonIdStr] =
            (passed && newPercent <= 0) ? 100 : newPercent;
        _cachedCompleted[lessonIdStr] = passed;
        // Lưu rank lesson progress riêng
        ProgressStore.upsertRankOne(
          lessonId: lessonIdStr,
          percent: _cachedPercent[lessonIdStr],
          completed: passed,
        );

        // Refresh sau 2 giây để load progress từ server (nhưng giữ cache nếu server chưa có)
        Future.delayed(const Duration(seconds: 2), () async {
          if (mounted) {
            // Lưu cache trước khi fetch để không bị mất
            await ProgressStore.saveRankPercent(_cachedPercent);
            await ProgressStore.saveRankCompleted(_cachedCompleted);
            await _fetchLessons();
          }
        });

        if (context.mounted) {
          final score = result['score'] ?? newPercent;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  Icon(
                    passed ? Icons.celebration : Icons.info_outline,
                    color: Colors.white,
                    size: 20,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      passed
                          ? '🎉 Hoàn thành! Bài học tiếp theo đã được mở khóa!'
                          : 'Điểm số: $score%. Hãy cố gắng hơn để đạt 80%!',
                    ),
                  ),
                ],
              ),
              backgroundColor:
                  passed ? Colors.green.shade600 : Colors.orange.shade700,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              duration: const Duration(seconds: 3),
            ),
          );
        }
      }
    }
  }

  /// ====== UI HELPERS ======
  List<Color> _getCardColors(dynamic lesson) {
    final locked = lesson['locked'] == true;
    final completed = lesson['isCompleted'] == true;

    if (locked) {
      return [Colors.grey.shade300, Colors.grey.shade400];
    } else if (completed) {
      return [const Color(0xFF10B981), const Color(0xFF059669)];
    } else {
      return [const Color(0xFF6366F1), const Color(0xFF8B5CF6)];
    }
  }

  Widget _buildLessonCard(dynamic lesson, int index) {
    final title = lesson['title'] ?? 'Untitled Lesson';
    final locked = lesson['locked'] == true;
    final completed = lesson['isCompleted'] == true;

    final rawPercent = (lesson['percent'] is int)
        ? lesson['percent']
        : int.tryParse('${lesson['percent'] ?? 0}') ?? 0;
    final percent = completed ? (rawPercent > 0 ? rawPercent : 100) : rawPercent;

    final colors = _getCardColors(lesson);

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
          child: Padding(
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
                        locked
                            ? Icons.lock_rounded
                            : completed
                                ? Icons.check_circle_rounded
                                : Icons.emoji_events_rounded,
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
                              'Rank Lesson ${index + 1}',
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
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Progress',
                                  style: GoogleFonts.poppins(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.white,
                                  ),
                                ),
                                Text(
                                  '$percent%',
                                  style: GoogleFonts.poppins(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                    color: Colors.white,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: LinearProgressIndicator(
                                value: (percent / 100).clamp(0.0, 1.0),
                                minHeight: 6,
                                color: Colors.white,
                                backgroundColor:
                                    Colors.white.withValues(alpha: 0.3),
                              ),
                            ),
                          ],
                        ),
                      ),
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

  Widget _buildTimelineNode(dynamic lesson, bool locked, int index) {
    final completed = lesson['isCompleted'] == true;

    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: locked
              ? [Colors.grey.shade400, Colors.grey.shade500]
              : completed
                  ? [const Color(0xFF10B981), const Color(0xFF059669)]
                  : [const Color(0xFF6366F1), const Color(0xFF8B5CF6)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 3),
        boxShadow: [
          BoxShadow(
            color: (locked ? Colors.grey : (completed ? Colors.green : Colors.blue))
                .withValues(alpha: 0.3),
            blurRadius: 8,
            spreadRadius: 0,
          ),
        ],
      ),
      child: completed
          ? const Icon(Icons.check, color: Colors.white, size: 16)
          : locked
              ? const Icon(Icons.lock, color: Colors.white, size: 14)
              : Center(
                  child: Text(
                    '${index + 1}',
                    style: GoogleFonts.poppins(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ),
    );
  }

  double _calculateOffset(int index) => (index * 15.0) % 40.0;

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(
          title: Text(
            'Rank Mode',
            style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
          ),
          backgroundColor: const Color(0xFF9333EA),
          elevation: 0,
        ),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null) {
      return Scaffold(
        appBar: AppBar(
          title: Text(
            'Rank Mode',
            style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
          ),
          backgroundColor: const Color(0xFF9333EA),
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
      backgroundColor: Colors.grey.shade100,
      appBar: AppBar(
        title: Text(
          'Rank Mode',
          style: GoogleFonts.poppins(
            fontWeight: FontWeight.w600,
            color: Colors.white,
          ),
        ),
        backgroundColor: const Color(0xFF9333EA),
        elevation: 0,
        actions: [
          IconButton(
            tooltip: 'Leaderboard',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const LeaderboardScreen()),
              );
            },
            icon: const Icon(Icons.leaderboard, color: Colors.white),
          ),
        ],
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
                    final locked = l['locked'] == true;

                    final offset = _calculateOffset(i);
                    final isLeft = i % 2 == 0;

                    return Padding(
                      padding: EdgeInsets.only(
                        left: isLeft ? 20 + offset : 20,
                        right: !isLeft ? 20 + offset : 20,
                        bottom: 24,
                      ),
                      child: Stack(
                        clipBehavior: Clip.none,
                        children: [
                          Padding(
                            padding: EdgeInsets.only(
                              left: isLeft ? 50 : 0,
                              right: !isLeft ? 50 : 0,
                            ),
                            child: _buildLessonCard(l, i),
                          ),
                          Positioned(
                            left: isLeft ? 0 : null,
                            right: !isLeft ? 0 : null,
                            top: 20,
                            child: _buildTimelineNode(l, locked, i),
                          ),
                          if (i > 0)
                            Positioned(
                              left: isLeft ? 15 : null,
                              right: !isLeft ? 15 : null,
                              top: -24,
                              child: TweenAnimationBuilder<double>(
                                duration: Duration(milliseconds: 800 + (i * 100)),
                                tween: Tween<double>(begin: 0, end: 1),
                                builder: (context, value, child) {
                                  return Opacity(
                                    opacity: value,
                                    child: CustomPaint(
                                      size: const Size(2, 44),
                                      painter: _DashedLinePainter(
                                        color: Colors.grey.shade400,
                                        progress: value,
                                      ),
                                    ),
                                  );
                                },
                              ),
                            ),
                        ],
                      ),
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

class _DashedLinePainter extends CustomPainter {
  final Color color;
  final double progress;

  _DashedLinePainter({required this.color, required this.progress});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    const dashHeight = 5.0;
    const dashSpace = 4.0;
    double startY = 0;

    while (startY < size.height * progress) {
      canvas.drawLine(
        Offset(size.width / 2, startY),
        Offset(
          size.width / 2,
          (startY + dashHeight).clamp(0, size.height * progress),
        ),
        paint,
      );
      startY += dashHeight + dashSpace;
    }
  }

  @override
  bool shouldRepaint(_DashedLinePainter oldDelegate) =>
      oldDelegate.progress != progress;
}
