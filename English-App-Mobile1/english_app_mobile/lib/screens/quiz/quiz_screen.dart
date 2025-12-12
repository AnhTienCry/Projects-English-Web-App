import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:confetti/confetti.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../api/api_client.dart';
import '../../config/api_config.dart';

// Số lượng câu hỏi mặc định cho Rank mode
const int defaultRankModeQuestions = 5;

class QuizScreen extends StatefulWidget {
  final String topicId;
  final String lessonId;
  final String? mode; // 'normal' or 'rank'
  final int? maxQuestions; // Số lượng câu hỏi tối đa (chỉ áp dụng cho Rank mode)
  final List<dynamic>? initialQuestions;

  const QuizScreen({
    super.key,
    this.topicId = '',
    this.lessonId = '',
    this.mode,
    this.maxQuestions, // Nếu null, sẽ dùng mặc định 5 cho Rank mode
    this.initialQuestions,
  });

  @override
  State<QuizScreen> createState() => _QuizScreenState();
}

class _QuizScreenState extends State<QuizScreen>
    with SingleTickerProviderStateMixin {
  // ✅ Giữ lại controller cho câu điền để không bị reset khi setState
  final TextEditingController _fillController = TextEditingController();
  List<dynamic> _questions = [];
  final List<Map<String, dynamic>> _userAnswers = [];
  int _currentIndex = 0;
  int _correctCount = 0;
  bool _isAnswered = false;
  String? _selectedAnswer;
  bool _isLoading = true;
  bool _quizFinished = false;
  final Stopwatch _timer = Stopwatch();

  late AnimationController _animationController;
  late Animation<double> _shakeAnimation;
  late ConfettiController _confettiController;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _shakeAnimation = Tween<double>(
      begin: 0,
      end: 24,
    ).chain(CurveTween(curve: Curves.elasticIn)).animate(_animationController);
    _confettiController = ConfettiController(
      duration: const Duration(seconds: 3),
    );
    // If initial questions are provided (prefetch), use them to avoid loading delay
    if (widget.initialQuestions != null && widget.initialQuestions!.isNotEmpty) {
      _questions = List.from(widget.initialQuestions!);
      _isLoading = false;
      // start timer when quiz is shown
      _timer.start();
    } else {
      fetchQuizzes();
    }
  }

  Future<void> fetchQuizzes() async {
    if (!mounted) return;

    try {
  Response res;
  String endpointDesc = '';

      // Normal mode: fetch by topic
      if (widget.topicId.isNotEmpty) {
        final endpoint = "${ApiConfig.quizByTopicEndpoint}/${widget.topicId}";
        endpointDesc = endpoint;
        debugPrint('🔍 Fetching quizzes by topic: ${widget.topicId}');
        res = await dio.get(endpoint);
      } else if (widget.mode == 'rank' && widget.lessonId.isNotEmpty) {
        // Rank mode: use dedicated rank endpoint with query parameter
        endpointDesc = '${ApiConfig.quizRankEndpoint}?lessonId=${widget.lessonId}';
        debugPrint('🔍 Fetching rank quizzes for lesson: ${widget.lessonId} via ${ApiConfig.quizRankEndpoint}');
        res = await dio.get(ApiConfig.quizRankEndpoint, queryParameters: {'lessonId': widget.lessonId});
      } else if (widget.lessonId.isNotEmpty) {
        // Fallback: legacy endpoint
        final endpoint = "/api/quizzes/lesson/${widget.lessonId}";
        endpointDesc = endpoint;
        debugPrint('🔍 Fetching quizzes by lesson (legacy): ${widget.lessonId}');
        res = await dio.get(endpoint);
      } else {
        throw Exception('Both topicId and lessonId are empty');
      }

      if (!mounted) return;

      // Debug log the raw response so we can inspect empty/short responses
  debugPrint('🔁 Quiz response for $endpointDesc: ${res.data}');
      debugPrint('🔁 Quiz response status: ${res.statusCode}');
      try {
        final len = res.data == null ? 0 : res.data.toString().length;
        debugPrint('🔁 Quiz response length: $len');
      } catch (_) {}

      // Shuffle questions to randomize order — but be defensive about response shape
      final raw = res.data;
      List<dynamic> allQuestions = [];

      try {
        if (raw is List) {
          allQuestions = List.from(raw);
        } else if (raw is Map) {
          // Common shapes: { data: [...] } or { questions: [...] } or { quizzes: [...] }
          if (raw['data'] is List) {
            allQuestions = List.from(raw['data']);
          } else if (raw['questions'] is List) {
            allQuestions = List.from(raw['questions']);
          } else if (raw['quizzes'] is List) {
            allQuestions = List.from(raw['quizzes']);
          } else if (raw['items'] is List) {
            allQuestions = List.from(raw['items']);
          } else if (raw['data'] is Map) {
            final inner = raw['data'];
            if (inner['questions'] is List) {
              allQuestions = List.from(inner['questions']);
            } else if (inner['quizzes'] is List) {
              allQuestions = List.from(inner['quizzes']);
            }
          }
        } else if (raw is String) {
          // Sometimes backend may return raw JSON string
          final parsed = jsonDecode(raw);
          if (parsed is List) allQuestions = List.from(parsed);
          if (parsed is Map && parsed['data'] is List) allQuestions = List.from(parsed['data']);
        } else if (raw == null) {
          allQuestions = [];
        }
      } catch (e) {
        debugPrint('⚠️ Failed to parse quizzes response: $e');
        allQuestions = [];
      }

      if (allQuestions.isNotEmpty) allQuestions.shuffle();

      // Trong Rank mode: chỉ lấy số lượng câu hỏi giới hạn (mặc định 5)
      // Normal mode: lấy tất cả câu hỏi
      List<dynamic> questions;
      if (widget.mode == 'rank' || (widget.mode == null && widget.topicId.isEmpty)) {
        // Có thể tùy chỉnh bằng cách truyền maxQuestions: QuizScreen(lessonId: id, mode: 'rank', maxQuestions: 10)
        final maxQuestions = widget.maxQuestions ?? defaultRankModeQuestions;
        questions = allQuestions.length > maxQuestions
            ? allQuestions.sublist(0, maxQuestions)
            : allQuestions;
        debugPrint('🎯 Rank mode: Chọn ${questions.length}/${allQuestions.length} câu hỏi (giới hạn: $maxQuestions)');
      } else {
        // Normal mode: lấy tất cả
        questions = allQuestions;
        debugPrint('📚 Normal mode: Lấy tất cả ${questions.length} câu hỏi');
      }

      if (mounted) {
        setState(() {
          _questions = questions;
          _isLoading = false;
        });
      }

      // Check if we have questions
      if (_questions.isEmpty) {
        if (mounted) {
          setState(() => _isLoading = false);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text("No quiz questions available")),
          );
        }
        return;
      }

      _timer.start();
    } catch (e) {
      debugPrint("❌ Error fetching quiz: $e");
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text("Failed to load quiz")));
      }
    }
  }

  void _checkAnswer(String answer) {
    if (_isAnswered) return;

    final q = _questions[_currentIndex];
    final correctAnswer = q['correctAnswer'].toString().trim().toLowerCase();
    final isCorrect = answer.trim().toLowerCase() == correctAnswer;

    // Track user's answer in format for lesson result
    _userAnswers.add({
      'questionId': q['_id']?.toString() ?? '',
      'userAnswer': answer,
      'isCorrect': isCorrect,
      'timeSpent': 0,
    });

    setState(() {
      _isAnswered = true;
      _selectedAnswer = answer;
      if (isCorrect) {
        _correctCount++;
        HapticFeedback.lightImpact();
      } else {
        _animationController.forward(from: 0);
        HapticFeedback.heavyImpact();
      }
    });

    Future.delayed(const Duration(seconds: 1), () {});
  }

  void _nextQuestion() {
    if (_currentIndex < _questions.length - 1) {
      setState(() {
        _currentIndex++;
        _isAnswered = false;
        _selectedAnswer = null;
        _fillController.clear(); // ✅ reset text khi sang câu mới
      });
    } else {
      _timer.stop();
      _submitResult();
    }
  }

  Future<void> _submitResult() async {
    final score = ((_correctCount / _questions.length) * 100).round();
    final timeSpent = _timer.elapsed.inSeconds;

    setState(() => _quizFinished = true);
    _confettiController.play();

    try {
      // Submit lesson result ONLY in Rank Mode
      if (widget.lessonId.isNotEmpty && widget.mode == 'rank') {
        final passed = score >= 80; // Pass if score >= 80%

        await dio.post(
          '/api/lessons/${widget.lessonId}/result',
          data: {
            'score': score,
            'isPassed': passed,
            'timeSpent': timeSpent,
            'answers': {
              'quiz': {'questions': _userAnswers, 'totalTimeSpent': timeSpent},
              'reading': {'highlightedWordsClicked': [], 'timeSpent': 0},
              'listening': {'questions': [], 'totalTimeSpent': 0},
            },
          },
        );
        debugPrint('✅ Lesson result submitted successfully (Rank Mode)');
        
        // Update streak và activity
        try {
          await dio.post('/api/progressions/update-activity');
          debugPrint('✅ Activity updated for streak');
        } catch (e) {
          debugPrint('⚠️ Failed to update activity: $e');
        }
      } else if (widget.topicId.isNotEmpty && widget.lessonId.isNotEmpty) {
        // Normal mode: Submit topic completion and lesson result
        // Pass if score >= 80%
        
        try {
          // Step 1: Submit topic completion
          await dio.post(
            ApiConfig.completeTopicEndpoint,
            data: {'topicId': widget.topicId},
          );
          debugPrint('✅ Topic ${widget.topicId} marked as completed');
          
          // Step 2: Get lesson progress based on completed topics
          final topicStatusRes = await dio.get(
            '${ApiConfig.topicStatusEndpoint}/${widget.lessonId}',
          );
          final topicStatusData = topicStatusRes.data;
          final lessonProgressPercent = topicStatusData['progressPercent'] ?? 0;
          final allTopicsCompleted = topicStatusData['completedCount'] == topicStatusData['totalTopics'];
          
          debugPrint('📊 Lesson progress: $lessonProgressPercent% (${topicStatusData['completedCount']}/${topicStatusData['totalTopics']} topics)');
          
          // Step 3: Submit lesson result with calculated progress
          await dio.post(
            '/api/lessons/${widget.lessonId}/result',
            data: {
              'score': lessonProgressPercent, // Use progress from topics, not quiz score
              'isPassed': allTopicsCompleted, // Pass only when all topics are completed
              'timeSpent': timeSpent,
              'answers': {
                'quiz': {'questions': _userAnswers, 'totalTimeSpent': timeSpent, 'topicId': widget.topicId},
                'reading': {'highlightedWordsClicked': [], 'timeSpent': 0},
                'listening': {'questions': [], 'totalTimeSpent': 0},
              },
            },
          );
          debugPrint('✅ Lesson result submitted successfully (Normal Mode)');
          
          // Update streak và activity
          try {
            await dio.post('/api/progressions/update-activity');
            debugPrint('✅ Activity updated for streak');
          } catch (e) {
            debugPrint('⚠️ Failed to update activity: $e');
          }
        } catch (e) {
          debugPrint('❌ Error submitting topic/lesson result: $e');
          // Still show dialog even if submission fails
        }
      } else {
        debugPrint(
          'ℹ️ Quiz completed but missing topicId or lessonId - result NOT saved to progress',
        );
      }
    } catch (e) {
      debugPrint('❌ Error submitting quiz result: $e');
      // Still show dialog even if submission fails
    }

    _showResultDialog(score);
  }

  void _showResultDialog(int score) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => Dialog(
        backgroundColor: Colors.transparent,
        child: Stack(
          alignment: Alignment.center,
          children: [
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 20),
              padding: const EdgeInsets.all(25),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                gradient: LinearGradient(
                  colors: [
                    const Color(0xFFF59E0B), // Amber dịu nhẹ
                    const Color(0xFFD97706), // Amber đậm hơn
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.purple.withValues(alpha: 0.3),
                    blurRadius: 20,
                    offset: const Offset(0, 5),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.emoji_events_rounded,
                    size: 80,
                    color: Colors.amberAccent,
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Quiz Completed!',
                    style: GoogleFonts.inter(
                      fontSize: 24,
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'Your Score: $score%',
                    style: GoogleFonts.inter(
                      fontSize: 22,
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Correct: $_correctCount / ${_questions.length}',
                    style: const TextStyle(color: Colors.white70, fontSize: 16),
                  ),
                  Text(
                    'Time: ${_timer.elapsed.inSeconds}s',
                    style: const TextStyle(color: Colors.white70, fontSize: 16),
                  ),
                  const SizedBox(height: 25),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(30),
                      ),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 30,
                        vertical: 14,
                      ),
                    ),
                    onPressed: () {
                      // 1) Đóng dialog
                      Navigator.pop(context);
                      // 2) Trả kết quả về màn trước
                      final result = {
                        'score': score,
                        'passed': score >= 80,
                        'topicId': widget.topicId.isNotEmpty ? widget.topicId : null,
                        'lessonId': widget.lessonId.isNotEmpty ? widget.lessonId : null,
                      };
                      Navigator.pop(context, result);
                    },
                    child: Text(
                      'Quay lại',
                      style: GoogleFonts.inter(
                        color: const Color(0xFFF59E0B),
                        fontWeight: FontWeight.w700,
                        fontSize: 16,
                        letterSpacing: 0.2,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            ConfettiWidget(
              confettiController: _confettiController,
              blastDirectionality: BlastDirectionality.explosive,
              emissionFrequency: 0.05,
              numberOfParticles: 40,
              gravity: 0.3,
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _animationController.dispose();
    _confettiController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: Color(0xFF6366F1))),
      );
    }

    // Check if we have questions before accessing them
    if (_questions.isEmpty) {
      return Scaffold(
        appBar: AppBar(
          title: Text(
            "Quiz",
            style: GoogleFonts.inter(
              fontWeight: FontWeight.w600,
              fontSize: 18,
              letterSpacing: -0.3,
            ),
          ),
          backgroundColor: const Color(0xFFF59E0B), // Amber dịu nhẹ - nhất quán
          foregroundColor: Colors.white,
          elevation: 0,
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.quiz, size: 64, color: Colors.grey),
                const SizedBox(height: 16),
                Text(
                  "No quiz available for this lesson",
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 18, color: Colors.grey),
                ),
                const SizedBox(height: 12),
                Text(
                  widget.lessonId.isNotEmpty ? 'Lesson ID: ${widget.lessonId}' : '',
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
                const SizedBox(height: 18),
                ElevatedButton.icon(
                  onPressed: fetchQuizzes,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Retry'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFF59E0B), // Amber dịu nhẹ
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    ),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () {
                    // Close and return empty result so caller can handle
                    Navigator.pop(context, null);
                  },
                  child: const Text('Back', style: TextStyle(color: Colors.grey)),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (_quizFinished) {
      return Scaffold(
        backgroundColor: Colors.grey.shade50,
        body: Stack(
          alignment: Alignment.center,
          children: [
            ConfettiWidget(
              confettiController: _confettiController,
              blastDirectionality: BlastDirectionality.explosive,
              numberOfParticles: 30,
              gravity: 0.3,
            ),
            Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.stars_rounded,
                  color: Color(0xFFF59E0B), // Amber dịu nhẹ
                  size: 100,
                ),
                const SizedBox(height: 20),
                Text(
                  "Well done!",
                  style: GoogleFonts.inter(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF6366F1), // Indigo dịu nhẹ
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  "You've completed this quiz!",
                  style: TextStyle(fontSize: 16, color: Colors.grey),
                ),
              ],
            ),
          ],
        ),
      );
    }

    final q = _questions[_currentIndex];
    final progress = (_currentIndex + 1) / _questions.length;

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: Text(
          "Question ${_currentIndex + 1}/${_questions.length}",
          style: GoogleFonts.inter(
            fontWeight: FontWeight.w600,
            fontSize: 18,
            letterSpacing: -0.3,
          ),
        ),
        backgroundColor: const Color(0xFFF59E0B), // Amber dịu nhẹ
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: Column(
        children: [
          LinearProgressIndicator(
            value: progress,
            color: const Color(0xFF6366F1), // Indigo dịu nhẹ
            backgroundColor: const Color(0xFF6366F1).withValues(alpha: 0.2),
            minHeight: 6,
          ),
          const SizedBox(height: 20),
          Padding(
            padding: const EdgeInsets.all(16),
            child: AnimatedBuilder(
              animation: _animationController,
              builder: (context, child) {
                final shake = _shakeAnimation.value;
                return Transform.translate(
                  offset: Offset(
                    _isAnswered &&
                            _selectedAnswer != q['correctAnswer'] &&
                            q['type'] == 'multiple_choice'
                        ? shake - 12
                        : 0,
                    0,
                  ),
                  child: child,
                );
              },
              child: Card(
                elevation: 2,
                shadowColor: const Color(0xFF6366F1).withValues(alpha: 0.2),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(
                    q['question'],
                    style: GoogleFonts.inter(
                      fontSize: 20,
                      fontWeight: FontWeight.w600,
                      color: Colors.black87,
                      letterSpacing: -0.3,
                    ),
                  ),
                ),
              ),
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _buildQuestionType(q),
            ),
          ),
          if (_isAnswered)
            Padding(
              padding: const EdgeInsets.only(bottom: 20),
              child: ElevatedButton.icon(
                icon: const Icon(Icons.arrow_forward_rounded),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF6366F1), // Indigo dịu nhẹ
                  foregroundColor: Colors.white,
                  elevation: 2,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(30),
                  ),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 40,
                    vertical: 14,
                  ),
                ),
                label: Text(
                  _currentIndex < _questions.length - 1
                      ? "Next Question"
                      : "Finish Quiz",
                  style: GoogleFonts.inter(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                    letterSpacing: 0.2,
                  ),
                ),
                onPressed: _nextQuestion,
              ),
            ),
        ],
      ),
    );
  }

  /// 🧠 Hiển thị từng loại câu hỏi
  Widget _buildQuestionType(dynamic q) {
    final type = q['type'] ?? 'multiple_choice';

    // MULTIPLE CHOICE
    if (type == 'multiple_choice') {
      final options = List<String>.from(q['options'] ?? [])..shuffle();
      return ListView.builder(
        itemCount: options.length,
        itemBuilder: (context, index) {
          final option = options[index];
          final isCorrect = q['correctAnswer'] == option;
          final isSelected = option == _selectedAnswer;

          Color cardColor = Colors.white;
          IconData? icon;

          if (_isAnswered) {
            if (isSelected && isCorrect) {
              cardColor = Colors.green.shade300;
              icon = Icons.check_circle;
            } else if (isSelected && !isCorrect) {
              cardColor = Colors.red.shade300;
              icon = Icons.cancel_rounded;
            } else if (isCorrect) {
              cardColor = Colors.green.shade100;
              icon = Icons.check_rounded;
            }
          }

          return AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            margin: const EdgeInsets.symmetric(vertical: 6),
            decoration: BoxDecoration(
              color: cardColor,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                if (isSelected)
                  BoxShadow(
                    color: const Color(0xFF6366F1).withValues(alpha: 0.2),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
              ],
            ),
            child: ListTile(
              leading: icon != null
                  ? Icon(icon, color: isCorrect ? Colors.green : Colors.red)
                  : null,
              title: Text(option, style: GoogleFonts.inter(fontSize: 16)),
              onTap: _isAnswered ? null : () => _checkAnswer(option),
            ),
          );
        },
      );
    }

    // ✅ FILL IN THE BLANK
    if (type == 'fill_blank') {
      return Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "Your answer:",
              style: GoogleFonts.inter(
                fontSize: 16,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _fillController, // ✅ dùng controller chung
              enabled: !_isAnswered,
              decoration: InputDecoration(
                hintText: "Type your answer here...",
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
                focusedBorder: OutlineInputBorder(
                  borderSide: const BorderSide(color: Color(0xFF6366F1), width: 2),
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
            const SizedBox(height: 20),
            if (!_isAnswered)
              Center(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF6366F1), // Indigo dịu nhẹ
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 40,
                      vertical: 14,
                    ),
                  ),
                  onPressed: () {
                    final answer = _fillController.text.trim();
                    if (answer.isNotEmpty) _checkAnswer(answer);
                  },
                  child: Text(
                    "Submit Answer",
                    style: GoogleFonts.inter(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.2,
                    ),
                  ),
                ),
              ),
            if (_isAnswered) ...[
              const SizedBox(height: 20),
              AnimatedContainer(
                duration: const Duration(milliseconds: 400),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color:
                      _fillController.text.trim().toLowerCase() ==
                          q['correctAnswer'].toString().trim().toLowerCase()
                      ? Colors.green.shade100
                      : Colors.red.shade100,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  children: [
                    Icon(
                      _fillController.text.trim().toLowerCase() ==
                              q['correctAnswer'].toString().trim().toLowerCase()
                          ? Icons.check_circle
                          : Icons.cancel,
                      color:
                          _fillController.text.trim().toLowerCase() ==
                              q['correctAnswer'].toString().trim().toLowerCase()
                          ? Colors.green
                          : Colors.red,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        _fillController.text.trim().toLowerCase() ==
                                q['correctAnswer']
                                    .toString()
                                    .trim()
                                    .toLowerCase()
                            ? "✅ Correct!"
                            : "❌ Correct answer: ${q['correctAnswer']}",
                        style: GoogleFonts.inter(
                          fontWeight: FontWeight.w600,
                          fontSize: 16,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      );
    }

    // ✅ TRUE / FALSE
    if (type == 'true_false') {
      final options = ['True', 'False'];
      return Column(
        children: options.map((opt) {
          final isCorrect =
              q['correctAnswer'].toString().toLowerCase() == opt.toLowerCase();
          final isSelected = _selectedAnswer == opt;

          Color cardColor = Colors.white;
          IconData? icon;

          if (_isAnswered) {
            if (isSelected && isCorrect) {
              cardColor = Colors.green.shade300;
              icon = Icons.check_circle;
            } else if (isSelected && !isCorrect) {
              cardColor = Colors.red.shade300;
              icon = Icons.cancel_rounded;
            } else if (isCorrect) {
              cardColor = Colors.green.shade100;
              icon = Icons.check_rounded;
            }
          }

          return AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            margin: const EdgeInsets.symmetric(vertical: 6),
            decoration: BoxDecoration(
              color: cardColor,
              borderRadius: BorderRadius.circular(16),
            ),
            child: ListTile(
              leading: icon != null
                  ? Icon(icon, color: isCorrect ? Colors.green : Colors.red)
                  : null,
              title: Text(opt, style: GoogleFonts.inter(fontSize: 16)),
              onTap: _isAnswered ? null : () => _checkAnswer(opt),
            ),
          );
        }).toList(),
      );
    }
    // ✅ MATCHING QUESTION (Ghép cặp có đường cong + giới hạn 3 sai)
    if (type == 'matching') {
      final List<dynamic> pairs = q['pairs'] ?? [];
      final List<String> leftItems = pairs
          .map((p) => p['left'].toString())
          .toList();
      final List<String> rightItems =
          pairs.map((p) => p['right'].toString()).toList()..shuffle();

      String? selectedLeft;
      String? selectedRight;
      Map<String, String> matched = {};
      int wrongCount = 0;

      final leftKeys = List.generate(leftItems.length, (_) => GlobalKey());
      final rightKeys = List.generate(rightItems.length, (_) => GlobalKey());
      List<List<Offset>> linePairs =
          []; // danh sách các đoạn nối (2 điểm mỗi line)

      return StatefulBuilder(
        builder: (context, setStateSB) {
          void checkMatch() {
            if (selectedLeft != null && selectedRight != null) {
              final isCorrect = pairs.any(
                (p) => p['left'] == selectedLeft && p['right'] == selectedRight,
              );

              if (isCorrect) {
                matched[selectedLeft!] = selectedRight!;
                HapticFeedback.lightImpact();

                // ✅ Khi ghép xong tất cả các cặp, chỉ cộng 1 điểm duy nhất
                if (matched.length == pairs.length) {
                  _correctCount++;
                  setState(() => _isAnswered = true);
                }

                // ✅ Lấy vị trí thực tế để vẽ đường nối
                final leftIndex = leftItems.indexOf(selectedLeft!);
                final rightIndex = rightItems.indexOf(selectedRight!);
                final box =
                    context.findRenderObject() as RenderBox?; // Stack tổng
                final leftBox =
                    leftKeys[leftIndex].currentContext?.findRenderObject()
                        as RenderBox?;
                final rightBox =
                    rightKeys[rightIndex].currentContext?.findRenderObject()
                        as RenderBox?;

                if (box != null && leftBox != null && rightBox != null) {
                  // Lấy vị trí tương đối trong Stack
                  final leftPos = box.globalToLocal(
                    leftBox.localToGlobal(Offset.zero),
                  );
                  final rightPos = box.globalToLocal(
                    rightBox.localToGlobal(Offset.zero),
                  );

                  final start = Offset(
                    leftPos.dx + leftBox.size.width,
                    leftPos.dy + leftBox.size.height / 2,
                  );
                  final end = Offset(
                    rightPos.dx,
                    rightPos.dy + rightBox.size.height / 2,
                  );

                  linePairs.add([start, end]);
                }
              } else {
                wrongCount++;
                HapticFeedback.heavyImpact();
              }

              // Reset selections
              selectedLeft = null;
              selectedRight = null;
              setStateSB(() {});

              // ✅ Khi sai 3 lần thì coi như sai câu đó → next
              if (wrongCount >= 3) {
                setState(() {
                  _isAnswered = true;
                });
                Future.delayed(
                  const Duration(milliseconds: 600),
                  _nextQuestion,
                );
              }

              // ✅ Nếu hoàn thành hết các cặp thì auto chuyển câu hỏi
              if (matched.length == pairs.length) {
                setState(() => _isAnswered = true);
                // Auto chuyển sang câu hỏi tiếp theo sau 1 giây
                Future.delayed(
                  const Duration(seconds: 1),
                  () {
                    if (mounted) {
                      _nextQuestion();
                    }
                  },
                );
              }
            }
          }

          // ⭐️ Xây sao
          Widget buildStars() {
            int remaining = (3 - wrongCount).clamp(0, 3);
            return Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                3,
                (i) => Icon(
                  Icons.star,
                  color: i < remaining ? Colors.amber : Colors.grey.shade400,
                  size: 28,
                ),
              ),
            );
          }

          return Stack(
            children: [
              // Vẽ đường cong nối các cặp
              CustomPaint(
                painter: _CurveLinePainter(linePairs),
                size: Size.infinite,
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "Ghép các cặp đúng:",
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 6),
                  buildStars(),
                  const SizedBox(height: 12),
                  Expanded(
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        // Cột trái
                        Expanded(
                          child: Column(
                            children: List.generate(leftItems.length, (i) {
                              final left = leftItems[i];
                              final isMatched = matched.containsKey(left);
                              return GestureDetector(
                                onTap: () {
                                  if (!isMatched) {
                                    // Toggle selection: nếu đã chọn thì bỏ chọn, nếu chưa chọn thì chọn
                                    if (selectedLeft == left) {
                                      selectedLeft = null;
                                    } else {
                                      selectedLeft = left;
                                      // Nếu đã có selectedRight thì check match ngay
                                      if (selectedRight != null) {
                                        checkMatch();
                                      }
                                    }
                                    setStateSB(() {});
                                  }
                                },
                                child: Card(
                                  key: leftKeys[i],
                                  color: isMatched
                                      ? Colors.green.shade100
                                      : (selectedLeft == left
                                            ? const Color(0xFF6366F1).withValues(alpha: 0.2) // Indigo dịu nhẹ
                                            : Colors.white),
                                  margin: const EdgeInsets.symmetric(
                                    vertical: 6,
                                  ),
                                  child: Padding(
                                    padding: const EdgeInsets.all(12),
                                    child: Text(
                                      left,
                                      style: GoogleFonts.inter(fontSize: 16),
                                    ),
                                  ),
                                ),
                              );
                            }),
                          ),
                        ),
                        const SizedBox(width: 10),
                        // Cột phải
                        Expanded(
                          child: Column(
                            children: List.generate(rightItems.length, (i) {
                              final right = rightItems[i];
                              final isMatched = matched.containsValue(right);
                              return GestureDetector(
                                onTap: () {
                                  if (!isMatched) {
                                    // Toggle selection: nếu đã chọn thì bỏ chọn, nếu chưa chọn thì chọn
                                    if (selectedRight == right) {
                                      selectedRight = null;
                                    } else {
                                      selectedRight = right;
                                      // Nếu đã có selectedLeft thì check match ngay
                                      if (selectedLeft != null) {
                                        checkMatch();
                                      }
                                    }
                                    setStateSB(() {});
                                  }
                                },
                                child: Card(
                                  key: rightKeys[i],
                                  color: isMatched
                                      ? Colors.green.shade100
                                      : (selectedRight == right
                                            ? const Color(0xFFF59E0B).withValues(alpha: 0.2) // Amber dịu nhẹ
                                            : Colors.white),
                                  margin: const EdgeInsets.symmetric(
                                    vertical: 6,
                                  ),
                                  child: Padding(
                                    padding: const EdgeInsets.all(12),
                                    child: Text(
                                      right,
                                      style: GoogleFonts.inter(fontSize: 16),
                                    ),
                                  ),
                                ),
                              );
                            }),
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (_isAnswered)
                    Center(
                      child: ElevatedButton(
                        onPressed: _nextQuestion,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF6366F1), // Indigo dịu nhẹ
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(30),
                          ),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 40,
                            vertical: 14,
                          ),
                        ),
                        child: Text(
                          "Next",
                          style: GoogleFonts.inter(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0.2,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ],
          );
        },
      );
    }

    return const Center(child: Text("Unsupported question type."));
  }
}

class _CurveLinePainter extends CustomPainter {
  final List<List<Offset>> linePairs;
  _CurveLinePainter(this.linePairs);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF6366F1).withValues(alpha: 0.6) // Indigo dịu nhẹ
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    for (var pair in linePairs) {
      if (pair.length == 2) {
        final start = pair[0];
        final end = pair[1];
        final path = Path();
        path.moveTo(start.dx, start.dy);
        final midX = (start.dx + end.dx) / 2;
        path.cubicTo(midX, start.dy, midX, end.dy, end.dx, end.dy);
        canvas.drawPath(path, paint);
      }
    }
  }

  @override
  bool shouldRepaint(_CurveLinePainter oldDelegate) =>
      oldDelegate.linePairs != linePairs;
}