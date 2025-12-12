import 'package:confetti/confetti.dart';
import 'package:dio/dio.dart'; // <-- THÊM IMPORT
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// Thêm các import cần thiết cho API và Auth
import '../../api/api_client.dart'; // dio instance
import '../../config/api_config.dart';
import '../../utils/auth_helper.dart';
import '../../utils/progress_store.dart';
import '../quiz/quiz_screen.dart';
import '../vocabulary/vocabulary_flashcard_screen.dart';
import 'story_screen.dart'; // <-- THÊM IMPORT

// 1. CHUYỂN SANG STATEFULWIDGET
class LessonDetailScreen extends StatefulWidget {
  final String lessonId;
  final String lessonTitle;
  final String? lessonDescription;
  final String? mode;

  const LessonDetailScreen({
    super.key,
    required this.lessonId,
    required this.lessonTitle,
    this.lessonDescription,
    this.mode,
  });

  @override
  State<LessonDetailScreen> createState() => _LessonDetailScreenState();
}

class _LessonDetailScreenState extends State<LessonDetailScreen> {
  // 2. THÊM CÁC BIẾN TRẠNG THÁI VÀ LOGIC TẢI DỮ LIỆU
  final Dio _dio = Dio(BaseOptions(baseUrl: ApiConfig.baseUrl));
  List<dynamic> _vocabularies = [];
  bool _isLoading = true;
  String? _error;

  // confetti
  late ConfettiController _confettiController;

  @override
  void initState() {
    super.initState();
    _confettiController = ConfettiController(duration: const Duration(seconds: 2));

    _fetchVocabularies(); // Tải từ vựng ngay khi mở màn hình
  }

  @override
  void dispose() {
    _confettiController.dispose();
    super.dispose();
  }

  Future<void> _fetchVocabularies() async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });

      final token = await AuthHelper.getToken();
      final url = '${ApiConfig.vocabEndpoint}/lesson/${widget.lessonId}';

      final response = await _dio.get(
        url,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      setState(() {
        _vocabularies = response.data;
        _isLoading = false;
      });

      if (_vocabularies.isEmpty) {
        debugPrint('⚠️ Không tìm thấy từ vựng cho bài học: ${widget.lessonId}');
        setState(() {
          _error = 'Chưa có từ vựng cho bài học này';
        });
      } else {
        debugPrint('✅ Tải thành công ${_vocabularies.length} từ vựng');
      }
    } catch (e) {
      debugPrint('❌ Lỗi khi tải từ vựng: $e');
      setState(() {
        _error = 'Không thể tải từ vựng';
        _isLoading = false;
      });
    }
  }

  Future<Map?> _postRankProgress(int points, bool completedLesson) async {
    try {
      final url = '${ApiConfig.baseUrl}${ApiConfig.rankUpdateEndpoint}';
      debugPrint('➡️ POST rank progress to: $url  body: {points:$points, completed:$completedLesson, lessonId:${widget.lessonId}}');
      final resp = await dio.post(url, data: {
        'points': points,
        'completedLesson': completedLesson,
        'lessonId': widget.lessonId,
      });

      debugPrint('⬅️ Rank POST response status=${resp.statusCode} data=${resp.data}');
      final data = resp.data;
      if (data == null) return null;

      // Try common shapes
      if (data is Map && data['rank'] != null) {
        await ProgressStore.saveRank(Map<String, dynamic>.from(data['rank']));
        debugPrint('Saved rank from data["rank"]');
      } else if (data is Map && (data['points'] != null || data['level'] != null)) {
        await ProgressStore.saveRank(Map<String, dynamic>.from(data));
        debugPrint('Saved rank from root object');
      } else {
        debugPrint('Rank not found in POST response.');
      }

      if (data is Map && data['badges'] != null) {
        await ProgressStore.saveBadges(List<dynamic>.from(data['badges']));
        debugPrint('Saved badges from POST response');
      }

      return (data is Map) ? Map<String, dynamic>.from(data) : {'data': data};
    } catch (e, st) {
      debugPrint('❌ _postRankProgress error: $e\n$st');
      await ProgressStore.savePendingProgress({
        'lessonId': widget.lessonId,
        'points': points,
        'completedLesson': completedLesson,
        'ts': DateTime.now().toIso8601String(),
      });
      debugPrint('Saved pending progress locally');
      return null;
    }
  }

  Future<void> _showRankDialog(Map result, {Map? rankFromServer}) async {
    final int score = (result['score'] ?? 0) is int ? result['score'] : int.parse('${result['score'] ?? 0}');
    final color = score >= 90 ? Colors.amber : score >= 75 ? Colors.deepPurple : score >= 50 ? Colors.blue : Colors.grey;
    _confettiController.play();
    await showDialog(
      context: context,
      builder: (_) => Dialog(
        backgroundColor: Colors.transparent,
        child: Stack(
          alignment: Alignment.center,
          children: [
            Positioned.fill(child: Align(alignment: Alignment.topCenter, child: ConfettiWidget(confettiController: _confettiController, blastDirectionality: BlastDirectionality.explosive))),
            Transform.scale(
              scale: 1,
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  Icon(Icons.emoji_events, size: 64, color: color),
                  const SizedBox(height: 8),
                  Text('Score: $score%', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  if (rankFromServer != null) Text('Total points: ${rankFromServer['rank']?['points'] ?? rankFromServer['points'] ?? ''}'),
                  const SizedBox(height: 12),
                  ElevatedButton(onPressed: () => Navigator.of(context).pop(), child: const Text('OK')),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // 3. CẬP NHẬT HÀM BUILD
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Colors.blue.shade50, Colors.purple.shade50],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Header (Dùng widget. để truy cập)
              Padding(
                padding: const EdgeInsets.all(20.0),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back_ios_rounded),
                      onPressed: () => Navigator.pop(context),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.lessonTitle, // Dùng widget.lessonTitle
                            style: GoogleFonts.poppins(
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              color: Colors.black87,
                            ),
                          ),
                          if (widget.lessonDescription != null) // Dùng widget.
                            Text(
                              widget.lessonDescription!,
                              style: GoogleFonts.poppins(
                                fontSize: 14,
                                color: Colors.black54,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Title
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Text(
                  'Chọn chế độ học',
                  style: GoogleFonts.poppins(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: Colors.black87,
                  ),
                ),
              ),

              const SizedBox(height: 30),

              // 4. CẬP NHẬT PHẦN OPTIONS
              Expanded(
                child: _isLoading
                    ? const Center(
                        child: CircularProgressIndicator(),
                      ) // Hiển thị loading
                    : _error != null
                    ? _buildErrorWidget() // Hiển thị lỗi
                    : _buildOptionList(), // Hiển thị các nút
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Widget hiển thị danh sách các lựa chọn
  Widget _buildOptionList() {
    // Nếu không có từ vựng, chỉ hiển thị nút Quiz
    if (_vocabularies.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: Column(
          children: [
            // Hiển thị thông báo không có từ vựng
            Center(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Text(
                  'Bài học này hiện chỉ có phần câu hỏi.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.poppins(
                    fontSize: 16,
                    color: Colors.black54,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),
            _buildQuizOptionCard(), // Chỉ hiển thị nút Quiz
          ],
        ),
      );
    }

    // Nếu có từ vựng, hiển thị tất cả các nút
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        children: [
          // Option: Truyện chêm
          _buildOptionCard(
            context: context,
            title: 'Truyện chêm',
            subtitle: 'Đọc truyện để học từ vựng',
            icon: Icons.auto_stories_rounded,
            gradient: LinearGradient(
              colors: [Colors.green.shade400, Colors.green.shade600],
            ),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => StoryScreen(
                    lessonId: widget.lessonId,
                    lessonTitle: widget.lessonTitle,
                    vocabularies: _vocabularies, // <-- TRUYỀN DANH SÁCH
                  ),
                ),
              );
            },
          ),

          const SizedBox(height: 20),

          // Option: Luyện từ vựng
          _buildOptionCard(
            context: context,
            title: 'Luyện từ vựng',
            subtitle: 'Học từ vựng qua flashcard',
            icon: Icons.book_rounded,
            gradient: LinearGradient(
              colors: [Colors.blue.shade400, Colors.blue.shade600],
            ),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => VocabularyFlashcardScreen(
                    lessonId: widget.lessonId,
                    lessonTitle: widget.lessonTitle,

                    // Truyền danh sách từ vựng đã tải
                    // Chúng ta cần cập nhật VocabularyFlashcardScreen để nhận cái này
                  ),
                ),
              );
            },
          ),

          const SizedBox(height: 20),

          // Option: Câu hỏi/Quiz
          _buildQuizOptionCard(),
        ],
      ),
    );
  }

  // Widget hiển thị lỗi
  Widget _buildErrorWidget() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 60, color: Colors.red.shade400),
          const SizedBox(height: 16),
          Text(
            _error!,
            style: GoogleFonts.poppins(fontSize: 16, color: Colors.black54),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: _fetchVocabularies,
            icon: const Icon(Icons.refresh),
            label: const Text('Thử lại'),
          ),
        ],
      ),
    );
  }

  // Tách nút Quiz ra hàm riêng
  Widget _buildQuizOptionCard() {
    return _buildOptionCard(
      context: context,
      title: 'Câu hỏi',
      subtitle: 'Kiểm tra kiến thức với quiz',
      icon: Icons.quiz_rounded,
      gradient: LinearGradient(
        colors: [Colors.purple.shade400, Colors.purple.shade600],
      ),
      onTap: () async {
        final result = await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => QuizScreen(lessonId: widget.lessonId, mode: widget.mode),
          ),
        );

        // Nếu không phải map result thì bỏ qua
        if (result is! Map || !mounted) return;

        final score = result['score'] ?? 0;
        final passed = result['passed'] ?? false;

        // Hiển thị snack tạm
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              passed
                  ? 'Chúc mừng! Bạn đã hoàn thành bài học với điểm số $score%'
                  : 'Điểm số: $score%. Hãy cố gắng hơn để đạt 80%!',
            ),
            backgroundColor: passed ? Colors.green : Colors.orange,
            duration: const Duration(seconds: 3),
          ),
        );

        // Nếu đang ở rank mode thì gửi progress lên server và hiển thị dialog huy hiệu
        Map? serverResp;
        if (widget.mode == 'rank') {
          // gửi điểm và trạng thái completed (passed) lên BE; hàm _postRankProgress đã lưu local khi thành công
          serverResp = await _postRankProgress(score as int, passed == true);
          if (!mounted) return;

          // Hiển thị dialog huy hiệu / rank — dùng dữ liệu server nếu có
          await _showRankDialog(result, rankFromServer: serverResp);
        }

        // Trả result về màn trước (Lesson list)
        if (!mounted) return;
        Navigator.pop(context, {
          'score': score,
          'percent': score,
          'passed': passed,
          'lessonId': widget.lessonId,
          'server': serverResp,
        });
      },
    );
  }

  // Hàm _buildOptionCard (Giữ nguyên)
  Widget _buildOptionCard({
    required BuildContext context,
    required String title,
    required String subtitle,
    required IconData icon,
    required Gradient gradient,
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
              color: gradient.colors.first.withValues(alpha: 0.3),
              blurRadius: 15,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(15),
              ),
              child: Icon(icon, size: 40, color: Colors.white),
            ),
            const SizedBox(width: 20),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.poppins(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: GoogleFonts.poppins(
                      fontSize: 14,
                      color: Colors.white.withValues(alpha: 0.9),
                    ),
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.arrow_forward_ios_rounded,
              color: Colors.white,
              size: 20,
            ),
          ],
        ),
      ),
    );
  }
}
