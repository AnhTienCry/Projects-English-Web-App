import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../api/api_client.dart'; // ensure dio is available
import '../../api/practice_api.dart';
import '../../utils/progress_store.dart';
import '../../config/api_config.dart';

import '../quiz/quiz_screen.dart';
import '../rankandbadge/leaderboard_screen.dart';
import '../practice/practice_set_list_screen.dart';

// Add helper function here if not imported
Future<void> setAuthHeaderFromStorage() async {
  final sp = await SharedPreferences.getInstance();
  final token = sp.getString('accessToken');
  if (token != null && token.isNotEmpty) {
    dio.options.headers['Authorization'] = 'Bearer $token';
    debugPrint('DIO auth header set');
  } else {
    dio.options.headers.remove('Authorization');
    debugPrint('DIO auth header cleared');
  }
}

class ProgressScreen extends StatefulWidget {
  const ProgressScreen({super.key});

  @override
  State<ProgressScreen> createState() => _ProgressScreenState();
}

class _ProgressScreenState extends State<ProgressScreen> {
  bool _loading = true;
  String? _error;

  Map<String, dynamic>? _progress;
  List<dynamic> _lessonsProgress = []; // Normal lessons
  List<dynamic> _rankLessonsProgress = []; // Rank lessons
  List<dynamic> _recentTopics = [];

  Map<String, int> _cachedPercent = {}; // Normal lessons
  Map<String, bool> _cachedCompleted = {}; // Normal lessons
  
  Map<String, int> _cachedRankPercent = {}; // Rank lessons
  Map<String, bool> _cachedRankCompleted = {}; // Rank lessons

  // badges from local store
  List<dynamic> _badges = [];

  // Practice sets (IELTS, TOEIC)
  List<dynamic> _ieltsSets = [];
  List<dynamic> _toeicSets = [];
  Map<String, Map<String, dynamic>> _practiceProgress = {}; // setId -> {skill -> submission}

  // Ẩn/hiện danh sách bài học
  bool _showNormalLessons = false;
  bool _showRankLessons = false;
  bool _showIeltsProgress = false;
  bool _showToeicProgress = false;

  @override
  void initState() {
    super.initState();
    _bootstrap();
    // after first frame, try to fetch latest from server and sync pending
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _syncPendingProgress();
      _loadProgress();
    });
  }

  Future<void> _bootstrap() async {
    // Load normal lessons progress
    _cachedPercent = await ProgressStore.loadPercent();
    _cachedCompleted = await ProgressStore.loadCompleted();
    
    // Load rank lessons progress (tách riêng)
    _cachedRankPercent = await ProgressStore.loadRankPercent();
    _cachedRankCompleted = await ProgressStore.loadRankCompleted();
    
    final rank = await ProgressStore.loadRank();
    final badges = await ProgressStore.loadBadges();

    debugPrint('ProgressStore bootstrap rank=$rank badges=${badges.length}');
    debugPrint('Normal lessons: ${_cachedPercent.length} lessons');
    debugPrint('Rank lessons: ${_cachedRankPercent.length} lessons');
    
    setState(() {
      _progress ??= {};
      if (rank != null) _progress!['rank'] = rank;
      _recentTopics = [];
      _loading = false;
      _lessonsProgress = [];
      _rankLessonsProgress = [];
      _badges = badges;
    });
  }

  // Try to upload pending progress saved while offline
  Future<void> _syncPendingProgress() async {
    try {
      final pending = await ProgressStore.loadPendingProgress();
      if (pending.isEmpty) return;
      debugPrint('Syncing ${pending.length} pending progress items');
      final failed = <Map<String, dynamic>>[];
      for (final p in pending) {
        try {
          final resp = await dio.post('${ApiConfig.baseUrl}${ApiConfig.rankUpdateEndpoint}', data: p);
          debugPrint('Synced pending progress: ${resp.data}');
          // save returned rank if present
          final data = resp.data;
          if (data is Map && data['rank'] != null) {
            await ProgressStore.saveRank(Map<String, dynamic>.from(data['rank']));
          }
        } catch (e) {
          debugPrint('Failed to sync one pending item: $e');
          failed.add(p);
        }
      }
      if (failed.isEmpty) {
        await ProgressStore.clearPending();
      } else {
        // write back failed list
        await ProgressStore.clearPending();
        for (final p in failed) {
          await ProgressStore.savePendingProgress(p);
        }
      }
      // reload local rank/badges after sync
      await _reloadLocalRankBadges();
    } catch (e) {
      debugPrint('Error in _syncPendingProgress: $e');
    }
  }

  Future<void> _reloadLocalRankBadges() async {
    final rank = await ProgressStore.loadRank();
    final badges = await ProgressStore.loadBadges();
    debugPrint('Reload local rank=$rank badges=${badges.length}');
    if (!mounted) return;
    setState(() {
      // ensure _progress is a Map and always contains 'rank'
      _progress = (Map<String, dynamic>.from(_progress ?? {})..['rank'] = rank);
      _badges = badges;
    });
  }

  Future<void> _loadProgress() async {
    if (!mounted) return;

    // Set auth header from SP before API calls
    await setAuthHeaderFromStorage();

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      // Gọi các API Dio riêng
      final dioResponses = await Future.wait([
        dio.get("/api/progressions/me"),
        dio.get("/api/lessons/progress/me"),
        dio.get(ApiConfig.quizRankLessonsEndpoint), // Load rank lessons
      ]);
      
      // Gọi các Practice API riêng
      final practiceResponses = await Future.wait([
        PracticeApi.fetchPublishedSets(examType: 'ielts'),
        PracticeApi.fetchPublishedSets(examType: 'toeic'),
        PracticeApi.getSubmissions(), // Lấy tất cả submissions của user
      ]);

      if (!mounted) return;

      final progData = dioResponses[0].data;
      final lessonsData = dioResponses[1].data;
      final rankLessonsData = dioResponses[2].data; // Rank lessons data
      final ieltsSetsData = practiceResponses[0];
      final toeicSetsData = practiceResponses[1];
      final submissionsData = practiceResponses[2];

      debugPrint('progData from /api/progressions/me = $progData'); // DEBUG: xem cấu trúc BE trả

      // ---- SAVE RANK/BADGES FROM SERVER RESPONSE ----
      if (progData is Map) {
        // Map BE fields to rank: totalScore -> points, currentLevel -> level
        if (progData['totalScore'] != null || progData['currentLevel'] != null) {
          final rankMap = {
            'points': progData['totalScore'] ?? 0,
            'level': progData['currentLevel'] ?? 1,
            'completedLessons': progData['completedLessons'] ?? [],
            'streak': progData['streak'] ?? 0,
            'progressPercentage': progData['progressPercentage'] ?? 0,
          };
          await ProgressStore.saveRank(rankMap);
          debugPrint('Saved rank from progData (totalScore, currentLevel)');
        } else {
          debugPrint('No rank fields found in progData');
        }

        // Badges: nếu BE trả trong progression, lưu; nếu không, có thể cần gọi endpoint riêng /api/badges
        if (progData['badges'] != null) {
          await ProgressStore.saveBadges(List<dynamic>.from(progData['badges']));
          debugPrint('Saved badges from progData["badges"]');
        } else {
          debugPrint('No badges found in progData');
        }
      }

      // ---- Recent topics từ /progressions/me
      final recent = (progData is Map && progData['recentTopics'] is List)
          ? List<dynamic>.from(progData['recentTopics'])
          : <dynamic>[];

      // ---- Danh sách lessons từ /lessons/progress/me
      List<dynamic> items;
      if (lessonsData is Map && lessonsData['items'] is List) {
        items = List<dynamic>.from(lessonsData['items']);
      } else if (lessonsData is List) {
        items = List<dynamic>.from(lessonsData);
      } else {
        items = <dynamic>[];
      }

      // ---- Completed từ server (nếu có)
      final serverCompleted = <String>{};
      if (progData is Map && progData['completedLessons'] is List) {
        for (final id in progData['completedLessons']) {
          serverCompleted.add(id.toString());
        }
      } else if (lessonsData is Map &&
          lessonsData['progress'] is Map &&
          lessonsData['progress']['completedLessons'] is List) {
        // 1 số backend trả trong /lessons/progress/me
        for (final id in lessonsData['progress']['completedLessons']) {
          serverCompleted.add(id.toString());
        }
      }

      // ---- MERGE server + cache vào items
      // Load topic status for each lesson to get accurate progress (parallel calls)
      final topicStatusMap = <String, int>{};
      if (items.isNotEmpty) {
        try {
          final topicStatusFutures = items.map((l) async {
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

      for (var i = 0; i < items.length; i++) {
        final l = items[i];
        final id = (l['id'] ?? l['_id'] ?? '').toString();

        // Completed: ưu tiên server, fallback cache, fallback flag trong item
        final completed =
            serverCompleted.contains(id) ||
            (l['isCompleted'] == true) ||
            (_cachedCompleted[id] ?? false);
        l['isCompleted'] = completed;

        // Percent:
        // 1) ưu tiên topic-status (progress từ số topic đã hoàn thành)
        // 2) giá trị server trong item
        // 3) cache
        // 4) nếu completed mà vẫn chưa có -> ép 100
        int percent = 0;
        if (topicStatusMap.containsKey(id)) {
          percent = topicStatusMap[id]!;
        } else {
          final p = l['percent'];
          if (p is int) {
            percent = p;
          } else if (p is String) {
            percent = int.tryParse(p) ?? 0;
          } else {
            percent = _cachedPercent[id] ?? 0;
          }
        }
        if (percent <= 0 && completed) percent = 100;
        l['percent'] = percent;

        // Lưu trở lại cache map (chuẩn hóa)
        _cachedPercent[id] = percent;
        _cachedCompleted[id] = completed;
      }

      // Fire-and-forget lưu cache để lần mở app vẫn giữ tiến trình
      ProgressStore.savePercent(_cachedPercent);
      ProgressStore.saveCompleted(_cachedCompleted);

      // ====== XỬ LÝ RANK LESSONS ======
      List<dynamic> rankItems = [];
      if (rankLessonsData is List) {
        rankItems = List.from(rankLessonsData);
        
        // Merge với cache rank lessons
        for (var i = 0; i < rankItems.length; i++) {
          final l = rankItems[i];
          final id = (l['_id'] ?? '').toString();
          
          // Completed: ưu tiên cache
          final completed = _cachedRankCompleted[id] ?? false;
          l['isCompleted'] = completed;
          
          // Percent: ưu tiên cache
          int percent = _cachedRankPercent[id] ?? 0;
          if (percent <= 0 && completed) percent = 100;
          l['percent'] = percent;
          
          // Locked: bài đầu mở, các bài sau cần hoàn thành bài trước
          if (i == 0) {
            l['locked'] = false;
          } else {
            final prev = rankItems[i - 1];
            final prevId = (prev['_id'] ?? '').toString();
            final prevCompleted = _cachedRankCompleted[prevId] ?? false;
            l['locked'] = !prevCompleted;
          }
          
          // Cập nhật cache
          _cachedRankPercent[id] = percent;
          _cachedRankCompleted[id] = completed;
        }
        
        // Lưu rank lessons cache
        ProgressStore.saveRankPercent(_cachedRankPercent);
        ProgressStore.saveRankCompleted(_cachedRankCompleted);
      }

      // ====== XỬ LÝ PRACTICE SETS (IELTS/TOEIC) ======
      // Sắp xếp theo title
      ieltsSetsData.sort((a, b) => (a['title'] ?? '').toString().compareTo((b['title'] ?? '').toString()));
      toeicSetsData.sort((a, b) => (a['title'] ?? '').toString().compareTo((b['title'] ?? '').toString()));

      // Tạo map progress từ submissions
      final practiceProgressMap = <String, Map<String, dynamic>>{};
      for (final sub in submissionsData) {
        final setId = (sub['setId']?['_id'] ?? sub['setId'] ?? '').toString();
        final skill = (sub['skill'] ?? '').toString();
        if (setId.isNotEmpty && skill.isNotEmpty) {
          practiceProgressMap[setId] ??= {};
          // Lưu submission mới nhất cho mỗi skill
          final existing = practiceProgressMap[setId]![skill];
          if (existing == null) {
            practiceProgressMap[setId]![skill] = sub;
          } else {
            // So sánh ngày để lấy submission mới nhất
            final existingDate = DateTime.tryParse(existing['createdAt']?.toString() ?? '');
            final newDate = DateTime.tryParse(sub['createdAt']?.toString() ?? '');
            if (newDate != null && (existingDate == null || newDate.isAfter(existingDate))) {
              practiceProgressMap[setId]![skill] = sub;
            }
          }
        }
      }

      if (mounted) {
        setState(() {
          _progress = (progData is Map<String, dynamic>)
              ? Map<String, dynamic>.from(progData)
              : null;
          _recentTopics = recent;
          _lessonsProgress = items;
          _rankLessonsProgress = rankItems;
          _ieltsSets = ieltsSetsData;
          _toeicSets = toeicSetsData;
          _practiceProgress = practiceProgressMap;
        });
        // Reload local rank/badges after loading server data
        await _reloadLocalRankBadges();
      }
    } on DioException catch (e) {
      if (mounted) {
        setState(() => _error = e.response?.data?.toString() ?? e.message);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _error = e.toString());
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  // Mở quiz ôn lại topic
  Future<void> _retryTopic(dynamic topic) async {
    final id = topic['_id']?.toString() ?? '';
    if (id.isEmpty) return;
    final done = await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => QuizScreen(topicId: id)),
    );
    if (done == true) {
      await _loadProgress();
    }
  }

  // ==== TÍNH TỔNG TIẾN TRÌNH ====
  // Tính tổng từ cả normal và rank lessons
  double get _overallPercent {
    final allLessons = [..._lessonsProgress, ..._rankLessonsProgress];
    if (allLessons.isEmpty) return 0.0;
    final sum = allLessons.fold<int>(0, (prev, l) {
      final p = l['percent'];
      final v = (p is int) ? p : int.tryParse(p?.toString() ?? '0') ?? 0;
      return prev + v.clamp(0, 100);
    });
    return sum / allLessons.length;
  }

  int get _completedLessonsCount {
    final normalCompleted = _lessonsProgress.where((l) => (l['isCompleted'] == true)).length;
    final rankCompleted = _rankLessonsProgress.where((l) => (l['isCompleted'] == true)).length;
    return normalCompleted + rankCompleted;
  }
  
  int get _totalLessonsCount => _lessonsProgress.length + _rankLessonsProgress.length;

  // ==== UI ====
  Widget _buildSummaryCard() {
    final overall = _overallPercent;
    final completed = _completedLessonsCount;

    return GestureDetector(
      onTap: () {
        // Open Leaderboard directly from Progress
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const LeaderboardScreen()),
        );
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [Colors.purple.shade600, Colors.purple.shade300],
          ),
          borderRadius: BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(
              color: Colors.purple.withValues(alpha: 0.2),
              blurRadius: 12,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Row(
          children: [
            // circular percent
            Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: 84,
                  height: 84,
                  child: CircularProgressIndicator(
                    value: (overall / 100).clamp(0.0, 1.0),
                    strokeWidth: 10,
                    valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
                    backgroundColor: Colors.white24,
                  ),
                ),
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '${overall.round()}%',
                      style: GoogleFonts.poppins(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                    Text(
                      'Progress',
                      style: GoogleFonts.poppins(
                        fontSize: 11,
                        color: Colors.white70,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Overall Progress',
                    style: GoogleFonts.poppins(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Completed $completed of $_totalLessonsCount lessons',
                    style: GoogleFonts.poppins(
                      fontSize: 13,
                      color: Colors.white70,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: LinearProgressIndicator(
                            value: (overall / 100).clamp(0.0, 1.0),
                            minHeight: 8,
                            color: Colors.white,
                            backgroundColor: Colors.white24,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white24,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          '${overall.round()}%',
                          style: GoogleFonts.poppins(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLessonTile(dynamic l, {bool isRank = false}) {
    final title = (l['title'] ?? 'Lesson').toString();
    final percentRaw = l['percent'] ?? 0;
    final percent = (percentRaw is int)
        ? percentRaw
        : int.tryParse(percentRaw.toString()) ?? 0;
    final totalQ = (l['totalQuestions'] is int)
        ? l['totalQuestions'] as int
        : int.tryParse(l['totalQuestions']?.toString() ?? '0') ?? 0;
    final totalC = (l['totalCorrect'] is int)
        ? l['totalCorrect'] as int
        : int.tryParse(l['totalCorrect']?.toString() ?? '0') ?? 0;
    final completed = l['isCompleted'] == true;
    final locked = l['locked'] == true;
    
    // Lấy ngày truy cập cuối cùng từ lastAccessedAt, completedAt hoặc updatedAt
    String? lastAccessDateStr;
    final lastAccess = l['lastAccessedAt'] ?? l['completedAt'] ?? l['updatedAt'];
    if (lastAccess != null) {
      try {
        final date = DateTime.parse(lastAccess.toString());
        lastAccessDateStr = '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
      } catch (_) {}
    }
    
    // Xác định trạng thái: Hoàn thành / Đang học / Chưa bắt đầu
    // - Hoàn thành: isCompleted = true
    // - Đang học: có percent > 0 hoặc có lastAccess
    // - Chưa bắt đầu: chưa có gì
    final bool hasStarted = percent > 0 || lastAccess != null;
    
    // Trạng thái và màu sắc
    String statusText;
    Color statusBgColor;
    Color statusTextColor;
    IconData statusIcon;
    
    if (completed) {
      statusText = 'Đã hoàn thành';
      statusBgColor = Colors.green.shade100;
      statusTextColor = Colors.green.shade700;
      statusIcon = Icons.check_circle;
    } else if (hasStarted) {
      statusText = 'Đang học';
      statusBgColor = Colors.orange.shade100;
      statusTextColor = Colors.orange.shade700;
      statusIcon = Icons.hourglass_bottom;
    } else {
      statusText = 'Chưa bắt đầu';
      statusBgColor = Colors.grey.shade200;
      statusTextColor = Colors.grey.shade600;
      statusIcon = Icons.play_circle_outline;
    }

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 12,
        ),
        leading: isRank
            ? Icon(
                locked ? Icons.lock : (completed ? Icons.emoji_events : Icons.emoji_events_outlined),
                color: locked ? Colors.grey : (completed ? Colors.orange : Colors.orange.shade300),
              )
            : Icon(
                completed ? Icons.check_circle : Icons.book_outlined,
                color: completed ? Colors.green : Colors.blue.shade300,
              ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Tiêu đề lesson
            Row(
              children: [
                Expanded(
                  child: Text(
                    title,
                    style: GoogleFonts.poppins(fontWeight: FontWeight.w700),
                  ),
                ),
                if (isRank && locked)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade200,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'Locked',
                      style: GoogleFonts.poppins(
                        fontSize: 10,
                        color: Colors.grey.shade700,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 4),
            // Hiển thị lần truy cập cuối + trạng thái hoàn thành
            Row(
              children: [
                // Trạng thái: Đã hoàn thành / Đang học / Chưa bắt đầu
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: statusBgColor,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        statusIcon,
                        size: 12,
                        color: statusTextColor,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        statusText,
                        style: GoogleFonts.poppins(
                          fontSize: 10,
                          fontWeight: FontWeight.w500,
                          color: statusTextColor,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                // Lần truy cập cuối (chỉ hiển thị nếu đã bắt đầu)
                if (lastAccessDateStr != null && hasStarted)
                  Row(
                    children: [
                      Icon(Icons.access_time, size: 12, color: Colors.grey.shade600),
                      const SizedBox(width: 4),
                      Text(
                        lastAccessDateStr,
                        style: GoogleFonts.poppins(
                          fontSize: 10,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
              ],
            ),
          ],
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 8.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (totalQ > 0)
                Text(
                  'Score: $totalC / $totalQ',
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    color: Colors.black54,
                  ),
                ),
              if (totalQ > 0) const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: LinearProgressIndicator(
                        value: (percent / 100).clamp(0.0, 1.0),
                        minHeight: 8,
                        color: locked
                            ? Colors.grey
                            : completed
                                ? (isRank ? Colors.orange : Colors.green)
                                : (isRank ? Colors.orange.shade300 : Colors.purple),
                        backgroundColor: Colors.grey.shade200,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: completed
                          ? Colors.green.shade50
                          : Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '$percent%',
                      style: GoogleFonts.poppins(
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
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

  Widget _buildRecentTopicTile(dynamic t) {
    final title = t['title']?.toString() ?? 'Topic';
    final id = t['_id']?.toString() ?? '';
    return Card(
      child: ListTile(
        title: Text(
          title,
          style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
        ),
        trailing: ElevatedButton(
          onPressed: id.isEmpty ? null : () => _retryTopic(t),
          child: const Text('Retry'),
        ),
      ),
    );
  }

  /// Widget hiển thị một practice set (IELTS/TOEIC)
  Widget _buildPracticeSetTile(dynamic setData, String examType) {
    final setId = (setData['_id'] ?? '').toString();
    final title = (setData['title'] ?? 'Đề thi').toString();
    
    // Lấy progress của set này
    final setProgress = _practiceProgress[setId] ?? {};
    
    // Tính toán skills đã làm
    final skills = ['listening', 'reading', 'writing', 'speaking'];
    int completedSkills = 0;
    double totalScore = 0;
    int totalItems = 0;
    DateTime? lastAttemptDate;
    
    for (final skill in skills) {
      final submission = setProgress[skill];
      if (submission != null) {
        completedSkills++;
        totalScore += ((submission['score'] ?? 0) as num).toDouble();
        totalItems += ((submission['total'] ?? 0) as num).toInt();
        
        final attemptDate = DateTime.tryParse(submission['createdAt']?.toString() ?? '');
        if (attemptDate != null && (lastAttemptDate == null || attemptDate.isAfter(lastAttemptDate))) {
          lastAttemptDate = attemptDate;
        }
      }
    }
    
    // Tính phần trăm hoàn thành (dựa trên số skill đã làm)
    final progressPercent = (completedSkills / 4 * 100).round();
    final isCompleted = completedSkills == 4;
    final hasStarted = completedSkills > 0;
    
    // Format ngày
    String? lastAccessDateStr;
    if (lastAttemptDate != null) {
      lastAccessDateStr = '${lastAttemptDate.day.toString().padLeft(2, '0')}/${lastAttemptDate.month.toString().padLeft(2, '0')}/${lastAttemptDate.year}';
    }
    
    // Trạng thái
    String statusText;
    Color statusBgColor;
    Color statusTextColor;
    IconData statusIcon;
    
    if (isCompleted) {
      statusText = 'Đã hoàn thành';
      statusBgColor = Colors.green.shade100;
      statusTextColor = Colors.green.shade700;
      statusIcon = Icons.check_circle;
    } else if (hasStarted) {
      statusText = 'Đang làm ($completedSkills/4)';
      statusBgColor = Colors.orange.shade100;
      statusTextColor = Colors.orange.shade700;
      statusIcon = Icons.hourglass_bottom;
    } else {
      statusText = 'Chưa bắt đầu';
      statusBgColor = Colors.grey.shade200;
      statusTextColor = Colors.grey.shade600;
      statusIcon = Icons.play_circle_outline;
    }
    
    // Màu gradient dựa trên examType
    final gradientColors = examType == 'ielts' 
        ? [Colors.red.shade400, Colors.red.shade600]
        : [Colors.blue.shade400, Colors.blue.shade600];

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8),
      elevation: 3,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: () {
          // Mở màn hình practice set
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => PracticeSetListScreen(examType: examType),
            ),
          );
        },
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header với icon và title
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(colors: gradientColors),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      examType == 'ielts' ? Icons.school : Icons.business_center,
                      color: Colors.white,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: GoogleFonts.poppins(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          examType.toUpperCase(),
                          style: GoogleFonts.poppins(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: gradientColors[1],
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Badge phần trăm
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: isCompleted ? Colors.green.shade50 : Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      '$progressPercent%',
                      style: GoogleFonts.poppins(
                        fontWeight: FontWeight.w700,
                        color: isCompleted ? Colors.green.shade700 : Colors.black87,
                      ),
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 12),
              
              // Status và ngày
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: statusBgColor,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(statusIcon, size: 14, color: statusTextColor),
                        const SizedBox(width: 4),
                        Text(
                          statusText,
                          style: GoogleFonts.poppins(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            color: statusTextColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (lastAccessDateStr != null) ...[
                    const SizedBox(width: 12),
                    Row(
                      children: [
                        Icon(Icons.access_time, size: 14, color: Colors.grey.shade600),
                        const SizedBox(width: 4),
                        Text(
                          lastAccessDateStr,
                          style: GoogleFonts.poppins(
                            fontSize: 11,
                            color: Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
              
              const SizedBox(height: 12),
              
              // Progress bar
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: LinearProgressIndicator(
                  value: progressPercent / 100,
                  minHeight: 8,
                  color: isCompleted ? Colors.green : gradientColors[0],
                  backgroundColor: Colors.grey.shade200,
                ),
              ),
              
              const SizedBox(height: 12),
              
              // Skills progress
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: skills.map((skill) {
                  final hasSubmission = setProgress.containsKey(skill);
                  final submission = setProgress[skill];
                  final score = submission != null ? '${submission['score']}/${submission['total']}' : '-';
                  
                  IconData skillIcon;
                  String skillName;
                  switch (skill) {
                    case 'listening':
                      skillIcon = Icons.headphones;
                      skillName = 'L';
                      break;
                    case 'reading':
                      skillIcon = Icons.menu_book;
                      skillName = 'R';
                      break;
                    case 'writing':
                      skillIcon = Icons.edit_note;
                      skillName = 'W';
                      break;
                    case 'speaking':
                      skillIcon = Icons.mic;
                      skillName = 'S';
                      break;
                    default:
                      skillIcon = Icons.help_outline;
                      skillName = '?';
                  }
                  
                  return Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: hasSubmission ? Colors.green.shade100 : Colors.grey.shade100,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          skillIcon,
                          size: 18,
                          color: hasSubmission ? Colors.green.shade700 : Colors.grey.shade500,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        skillName,
                        style: GoogleFonts.poppins(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: hasSubmission ? Colors.green.shade700 : Colors.grey.shade500,
                        ),
                      ),
                      if (hasSubmission)
                        Text(
                          score,
                          style: GoogleFonts.poppins(
                            fontSize: 9,
                            color: Colors.grey.shade600,
                          ),
                        ),
                    ],
                  );
                }).toList(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildError() => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline, size: 48, color: Colors.red),
          const SizedBox(height: 12),
          Text(
            _error ?? 'Error',
            textAlign: TextAlign.center,
            style: GoogleFonts.poppins(fontSize: 14),
          ),
          const SizedBox(height: 12),
          ElevatedButton.icon(
            onPressed: _loadProgress,
            icon: const Icon(Icons.refresh),
            label: const Text('Retry'),
          ),
        ],
      ),
    ),
  );


  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Progress', style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
        backgroundColor: Colors.purple,
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildError()
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Summary card (opens Rank Mode)
                      _buildSummaryCard(),
                      const SizedBox(height: 16),

                      // Badges (từ local store)
                      if (_badges.isNotEmpty) ...[
                        Text(
                          'Badges Earned',
                          style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: List.generate(
                            _badges.length,
                            (index) {
                              final badge = _badges[index];
                              final name = badge['name']?.toString() ?? 'Badge';
                              final image = badge['image']?.toString() ?? '';
                              return ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: Container(
                                  width: 100,
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(12),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withValues(alpha: 0.05),
                                        blurRadius: 8,
                                        offset: const Offset(0, 4),
                                      ),
                                    ],
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      if (image.isNotEmpty)
                                        Image.network(
                                          image,
                                          width: 100,
                                          height: 100,
                                          fit: BoxFit.cover,
                                        ),
                                      Padding(
                                        padding: const EdgeInsets.all(8.0),
                                        child: Text(
                                          name,
                                          textAlign: TextAlign.center,
                                          style: GoogleFonts.poppins(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                      ],
                      const SizedBox(height: 24),

                      // Normal Lessons Progress
                      if (_lessonsProgress.isNotEmpty) ...[
                        InkWell(
                          onTap: () => setState(() => _showNormalLessons = !_showNormalLessons),
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                            child: Row(
                              children: [
                                Icon(Icons.book_rounded, size: 20, color: Colors.blue.shade600),
                                const SizedBox(width: 8),
                                Text(
                                  'Normal Lessons',
                                  style: GoogleFonts.poppins(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.blue.shade600,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Icon(
                                  _showNormalLessons ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                                  color: Colors.blue.shade600,
                                ),
                                const Spacer(),
                                Text(
                                  '${_lessonsProgress.where((l) => l['isCompleted'] == true).length}/${_lessonsProgress.length}',
                                  style: GoogleFonts.poppins(
                                    fontSize: 14,
                                    color: Colors.black54,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        if (_showNormalLessons) ...[
                          const SizedBox(height: 12),
                          ListView.separated(
                            itemCount: _lessonsProgress.length,
                            separatorBuilder: (context, index) => const SizedBox(height: 12),
                            itemBuilder: (context, index) {
                              final lesson = _lessonsProgress[index];
                              return _buildLessonTile(lesson, isRank: false);
                            },
                            physics: const NeverScrollableScrollPhysics(),
                            shrinkWrap: true,
                          ),
                        ],
                        const SizedBox(height: 24),
                      ],

                      // Rank Lessons Progress
                      if (_rankLessonsProgress.isNotEmpty) ...[
                        InkWell(
                          onTap: () => setState(() => _showRankLessons = !_showRankLessons),
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                            child: Row(
                              children: [
                                Icon(Icons.emoji_events_rounded, size: 20, color: Colors.orange.shade600),
                                const SizedBox(width: 8),
                                Text(
                                  'Rank Lessons',
                                  style: GoogleFonts.poppins(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.orange.shade600,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Icon(
                                  _showRankLessons ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                                  color: Colors.orange.shade600,
                                ),
                                const Spacer(),
                                Text(
                                  '${_rankLessonsProgress.where((l) => l['isCompleted'] == true).length}/${_rankLessonsProgress.length}',
                                  style: GoogleFonts.poppins(
                                    fontSize: 14,
                                    color: Colors.black54,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        if (_showRankLessons) ...[
                          const SizedBox(height: 12),
                          ListView.separated(
                            itemCount: _rankLessonsProgress.length,
                            separatorBuilder: (context, index) => const SizedBox(height: 12),
                            itemBuilder: (context, index) {
                              final lesson = _rankLessonsProgress[index];
                              return _buildLessonTile(lesson, isRank: true);
                            },
                            physics: const NeverScrollableScrollPhysics(),
                            shrinkWrap: true,
                          ),
                        ],
                        const SizedBox(height: 24),
                      ],

                      // ====== IELTS Practice Progress ======
                      if (_ieltsSets.isNotEmpty) ...[
                        InkWell(
                          onTap: () => setState(() => _showIeltsProgress = !_showIeltsProgress),
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                            child: Row(
                              children: [
                                Icon(Icons.school_rounded, size: 20, color: Colors.red.shade600),
                                const SizedBox(width: 8),
                                Text(
                                  'IELTS Practice',
                                  style: GoogleFonts.poppins(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.red.shade600,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Icon(
                                  _showIeltsProgress ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                                  color: Colors.red.shade600,
                                ),
                                const Spacer(),
                                Text(
                                  '${_ieltsSets.length} đề',
                                  style: GoogleFonts.poppins(
                                    fontSize: 14,
                                    color: Colors.black54,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        if (_showIeltsProgress) ...[
                          const SizedBox(height: 12),
                          ListView.builder(
                            itemCount: _ieltsSets.length,
                            itemBuilder: (context, index) {
                              return _buildPracticeSetTile(_ieltsSets[index], 'ielts');
                            },
                            physics: const NeverScrollableScrollPhysics(),
                            shrinkWrap: true,
                          ),
                        ],
                        const SizedBox(height: 24),
                      ],

                      // ====== TOEIC Practice Progress ======
                      if (_toeicSets.isNotEmpty) ...[
                        InkWell(
                          onTap: () => setState(() => _showToeicProgress = !_showToeicProgress),
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                            child: Row(
                              children: [
                                Icon(Icons.business_center_rounded, size: 20, color: Colors.blue.shade600),
                                const SizedBox(width: 8),
                                Text(
                                  'TOEIC Practice',
                                  style: GoogleFonts.poppins(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.blue.shade600,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Icon(
                                  _showToeicProgress ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                                  color: Colors.blue.shade600,
                                ),
                                const Spacer(),
                                Text(
                                  '${_toeicSets.length} đề',
                                  style: GoogleFonts.poppins(
                                    fontSize: 14,
                                    color: Colors.black54,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        if (_showToeicProgress) ...[
                          const SizedBox(height: 12),
                          ListView.builder(
                            itemCount: _toeicSets.length,
                            itemBuilder: (context, index) {
                              return _buildPracticeSetTile(_toeicSets[index], 'toeic');
                            },
                            physics: const NeverScrollableScrollPhysics(),
                            shrinkWrap: true,
                          ),
                        ],
                        const SizedBox(height: 24),
                      ],

                      // Hiển thị thông báo nếu không có lesson nào
                      if (_lessonsProgress.isEmpty && _rankLessonsProgress.isEmpty) ...[
                        Center(
                          child: Padding(
                            padding: const EdgeInsets.all(32.0),
                            child: Column(
                              children: [
                                Icon(Icons.school_outlined, size: 64, color: Colors.grey.shade400),
                                const SizedBox(height: 16),
                                Text(
                                  'Chưa có bài học nào',
                                  style: GoogleFonts.poppins(
                                    fontSize: 16,
                                    color: Colors.black54,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                      const SizedBox(height: 24),

                      // Recent topics list
                      if (_recentTopics.isNotEmpty) ...[
                        Text(
                          'Recent Topics',
                          style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 12),
                        ListView.separated(
                          itemCount: _recentTopics.length,
                          separatorBuilder: (context, index) => const SizedBox(height: 12),
                          itemBuilder: (context, index) {
                            final topic = _recentTopics[index];
                            return _buildRecentTopicTile(topic);
                          },
                          physics: const NeverScrollableScrollPhysics(),
                          shrinkWrap: true,
                        ),
                      ],
                    ],
                  ),
                ),
    );
  }
}
