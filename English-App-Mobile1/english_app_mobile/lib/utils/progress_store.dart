import 'dart:convert';
import 'package:flutter/foundation.dart'; // <-- thêm dòng này để dùng debugPrint
import 'package:shared_preferences/shared_preferences.dart';

class ProgressStore {
  static const _kRankKey = 'progress_rank';
  static const _kBadgesKey = 'progress_badges';
  static const _kPendingKey = 'progress_pending';
  static const _kPercentKey = 'progress_percent';
  static const _kCompletedKey = 'progress_completed';
  
  // Rank lessons progress keys (tách riêng với normal lessons)
  static const _kRankPercentKey = 'progress_rank_percent';
  static const _kRankCompletedKey = 'progress_rank_completed';

  /// percent: { lessonId: 0..100 }
  static Future<Map<String, int>> loadPercent() async {
    final sp = await SharedPreferences.getInstance();
    final raw = sp.getString(_kPercentKey);
    if (raw == null || raw.isEmpty) return {};
    final Map<String, dynamic> json = jsonDecode(raw);
    return json.map(
      (k, v) => MapEntry(k, (v is int) ? v : int.tryParse('$v') ?? 0),
    );
  }

  static Future<void> savePercent(Map<String, int> map) async {
    final sp = await SharedPreferences.getInstance();
    await sp.setString(_kPercentKey, jsonEncode(map));
  }

  /// completed: { lessonId: true/false }
  static Future<Map<String, bool>> loadCompleted() async {
    final sp = await SharedPreferences.getInstance();
    final raw = sp.getString(_kCompletedKey);
    if (raw == null || raw.isEmpty) return {};
    final Map<String, dynamic> json = jsonDecode(raw);
    return json.map((k, v) => MapEntry(k, v == true));
  }

  static Future<void> saveCompleted(Map<String, bool> map) async {
    final sp = await SharedPreferences.getInstance();
    await sp.setString(_kCompletedKey, jsonEncode(map));
  }

  /// tiện: cập nhật 1 bài học
  static Future<void> upsertOne({
    required String lessonId,
    int? percent,
    bool? completed,
  }) async {
    final p = await loadPercent();
    final c = await loadCompleted();
    if (percent != null) p[lessonId] = percent;
    if (completed != null) c[lessonId] = completed;
    await savePercent(p);
    await saveCompleted(c);
  }

  // Pending progress (offline sync) — lưu như list of maps
  // Save one pending record (map with lessonId, points, completedLesson, ts ...)
  static Future<void> savePendingProgress(Map<String, dynamic> p) async {
    final sp = await SharedPreferences.getInstance();
    final s = sp.getString(_kPendingKey);
    final list = s == null ? <Map<String, dynamic>>[] : List<Map<String, dynamic>>.from(jsonDecode(s) as List);
    list.add(p);
    await sp.setString(_kPendingKey, jsonEncode(list));
  }

  static Future<List<Map<String, dynamic>>> loadPendingProgress() async {
    final sp = await SharedPreferences.getInstance();
    final s = sp.getString(_kPendingKey);
    if (s == null) return [];
    return List<Map<String, dynamic>>.from(jsonDecode(s) as List);
  }

  static Future<void> clearPending() async {
    final sp = await SharedPreferences.getInstance();
    await sp.remove(_kPendingKey);
  }

  static Future<void> clearPendingProgressFor(String lessonId) async {
    final all = await loadPendingProgress();
    final filtered = all.where((m) => (m['lessonId']?.toString() ?? '') != lessonId).toList();
    final sp = await SharedPreferences.getInstance();
    await sp.setString(_kPendingKey, jsonEncode(filtered));
  }

  // Lưu toàn bộ rank object từ server
  static Future<void> saveRank(Map<String, dynamic> rank) async {
    final sp = await SharedPreferences.getInstance();
    await sp.setString(_kRankKey, jsonEncode(rank));
    debugPrint('ProgressStore.saveRank wrote key=$_kRankKey value=${jsonEncode(rank)}');
  }

  static Future<Map<String, dynamic>?> loadRank() async {
    final sp = await SharedPreferences.getInstance();
    final s = sp.getString(_kRankKey);
    return s == null ? null : Map<String, dynamic>.from(jsonDecode(s) as Map);
  }

  // Badges list
  static Future<void> saveBadges(List<dynamic> badges) async {
    final sp = await SharedPreferences.getInstance();
    await sp.setString(_kBadgesKey, jsonEncode(badges));
  }

  static Future<List<dynamic>> loadBadges() async {
    final sp = await SharedPreferences.getInstance();
    final s = sp.getString(_kBadgesKey);
    if (s == null) return [];
    return List<dynamic>.from(jsonDecode(s) as List);
  }

  // Thêm 1 badge (nếu chưa có) — dùng khi socket nhận badge.earned
  static Future<void> addBadge(dynamic badge) async {
    final badges = await loadBadges();
    bool exists = false;
    try {
      final name = (badge is Map) ? (badge['name'] ?? badge['title']) : badge.toString();
      for (final b in badges) {
        final bn = (b is Map) ? (b['name'] ?? b['title']) : b.toString();
        if (bn == name) {
          exists = true;
          break;
        }
      }
    } catch (_) {}
    if (!exists) {
      badges.add(badge);
      await saveBadges(badges);
    }
  }

  // ====== RANK LESSONS PROGRESS (tách riêng với normal lessons) ======
  
  /// Rank lessons percent: { rankLessonId: 0..100 }
  static Future<Map<String, int>> loadRankPercent() async {
    final sp = await SharedPreferences.getInstance();
    final raw = sp.getString(_kRankPercentKey);
    if (raw == null || raw.isEmpty) return {};
    final Map<String, dynamic> json = jsonDecode(raw);
    return json.map(
      (k, v) => MapEntry(k, (v is int) ? v : int.tryParse('$v') ?? 0),
    );
  }

  static Future<void> saveRankPercent(Map<String, int> map) async {
    final sp = await SharedPreferences.getInstance();
    await sp.setString(_kRankPercentKey, jsonEncode(map));
  }

  /// Rank lessons completed: { rankLessonId: true/false }
  static Future<Map<String, bool>> loadRankCompleted() async {
    final sp = await SharedPreferences.getInstance();
    final raw = sp.getString(_kRankCompletedKey);
    if (raw == null || raw.isEmpty) return {};
    final Map<String, dynamic> json = jsonDecode(raw);
    return json.map((k, v) => MapEntry(k, v == true));
  }

  static Future<void> saveRankCompleted(Map<String, bool> map) async {
    final sp = await SharedPreferences.getInstance();
    await sp.setString(_kRankCompletedKey, jsonEncode(map));
  }

  /// Tiện: cập nhật 1 rank lesson
  static Future<void> upsertRankOne({
    required String lessonId,
    int? percent,
    bool? completed,
  }) async {
    final p = await loadRankPercent();
    final c = await loadRankCompleted();
    if (percent != null) p[lessonId] = percent;
    if (completed != null) c[lessonId] = completed;
    await saveRankPercent(p);
    await saveRankCompleted(c);
  }

  // ====== TÍNH OVERALL PROGRESS (dùng chung cho Progress và Profile) ======
  
  /// Tính overall progress từ normal và rank lessons
  /// Trả về: { percent: double, completedCount: int, totalCount: int }
  static Future<Map<String, dynamic>> calculateOverallProgress() async {
    // Load normal lessons progress
    final normalPercent = await loadPercent();
    final normalCompleted = await loadCompleted();
    
    // Load rank lessons progress
    final rankPercent = await loadRankPercent();
    final rankCompleted = await loadRankCompleted();
    
    // Tính tổng từ cả 2 loại
    final allPercent = <String, int>{...normalPercent, ...rankPercent};
    final allCompleted = <String, bool>{...normalCompleted, ...rankCompleted};
    
    if (allPercent.isEmpty) {
      return {
        'percent': 0.0,
        'completedCount': 0,
        'totalCount': 0,
      };
    }
    
    // Tính trung bình percent
    final sum = allPercent.values.fold<int>(0, (prev, p) => prev + p.clamp(0, 100));
    final avgPercent = sum / allPercent.length;
    
    // Đếm completed
    final completedCount = allCompleted.values.where((c) => c == true).length;
    final totalCount = allPercent.length;
    
    return {
      'percent': avgPercent,
      'completedCount': completedCount,
      'totalCount': totalCount,
    };
  }
}
