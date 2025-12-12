import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

class TowerProvider extends ChangeNotifier {
  final String baseUrl = 'https://your-api-domain.com/api/tower-levels';
  final String? authToken; // optional
  TowerProvider({this.authToken});

  List<dynamic> _towerLevels = [];        // danh sách level (có thể không kèm lock)
  List<dynamic> _levelsWithLock = [];     // danh sách kèm locked=true/false (từ /progress/me)
  Set<String> _completedLevelIds = {};    // id level đã hoàn thành
  bool isLoading = false;

  List<dynamic> get towerLevels => _towerLevels;
  List<dynamic> get levelsWithLock => _levelsWithLock;
  bool isLockedByNumber(int levelNumber) {
    final found = _levelsWithLock.firstWhere(
          (e) => e['levelNumber'] == levelNumber,
      orElse: () => null,
    );
    return found == null ? false : (found['locked'] == true);
  }

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (authToken != null) 'Authorization': 'Bearer $authToken',
  };

  Future<void> fetchTowerLevels() async {
    isLoading = true;
    notifyListeners();
    try {
      final res = await http.get(Uri.parse(baseUrl), headers: _headers);
      if (res.statusCode == 200) {
        _towerLevels = jsonDecode(res.body);
      }
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  /// NEW: Lấy lock/unlock theo user
  Future<void> fetchMyProgress() async {
    final res = await http.get(Uri.parse('$baseUrl/progress/me'), headers: _headers);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      _levelsWithLock = (data['items'] as List<dynamic>)..sort((a,b)=>a['levelNumber'].compareTo(b['levelNumber']));
      _completedLevelIds = {...List<String>.from(data['completedLevelIds'] ?? [])};
      notifyListeners();
    }
  }

  Future<List<dynamic>> fetchQuizOfLevel(String levelId) async {
    final res = await http.get(Uri.parse('$baseUrl/$levelId'), headers: _headers);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      return data['quizzes'] ?? [];
    }
    return [];
  }

  Future<Map<String, dynamic>?> fetchTowerByNumber(int levelNumber) async {
    final res = await http.get(Uri.parse('$baseUrl/by-number/$levelNumber'), headers: _headers);
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    }
    return null;
  }

  /// Hoàn thành level → backend sẽ chấm/ghi nhận & mở level kế tiếp
  Future<bool> completeTowerLevel({
    required String levelId,
    required int score,
    required int timeSpent,
  }) async {
    final res = await http.post(
      Uri.parse('$baseUrl/complete'),
      headers: _headers,
      body: jsonEncode({'levelId': levelId, 'score': score, 'timeSpent': timeSpent}),
    );

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      final passed = data['passed'] == true;
      if (passed) {
        _completedLevelIds.add(levelId);
        // reload lock state để mở tầng tiếp theo
        await fetchMyProgress();
      }
      return passed;
    }
    return false;
  }
}
