// lib/api/practice_api.dart
import 'api_client.dart';

class PracticeApi {
  static const String _base = '/api/v2/practice';

  /// 📘 Lấy danh sách đề đã publish (lọc theo examType)
  static Future<List> fetchPublishedSets({required String examType}) async {
    final res = await dio.get(
      '$_base/sets/published',
      queryParameters: {'examType': examType},
    );
    return (res.data as List?) ?? [];
  }

  /// 📘 Lấy thông tin 1 đề (kèm sections)
  static Future<Map<String, dynamic>> fetchSet(String id) async {
    final res = await dio.get('$_base/sets/$id');
    return (res.data as Map).cast<String, dynamic>();
  }

  /// 📘 Lấy danh sách section của 1 đề (có thể truyền skill)
  static Future<List> fetchSections(String setId, {String? skill}) async {
    final res = await dio.get(
      '$_base/sets/$setId/sections',
      queryParameters: skill != null ? {'skill': skill} : null,
    );
    return (res.data as List?) ?? [];
  }

  /// 📘 Lấy danh sách item (câu hỏi) của section
  static Future<List> fetchItems(String sectionId) async {
    final res = await dio.get('$_base/sections/$sectionId/items');
    return (res.data as List?) ?? [];
  }

  /// 📘 Lấy metadata 1 section (audio, transcript, config...)
  static Future<Map<String, dynamic>> getSection(String sectionId) async {
    final res = await dio.get('$_base/sections/$sectionId');
    return (res.data as Map).cast<String, dynamic>();
  }

  /// ✅ Nộp bài theo section (Listening/Reading/Writing/Speaking)
  /// body: { userId?, answers: [{itemId, payload, timeSpentMs?}], durationSec? }
  static Future<Map<String, dynamic>> submitPracticeSection({
    required String sectionId,
    required Map<String, dynamic> body,
  }) async {
    final res = await dio.post('$_base/sections/$sectionId/submit', data: body);
    return (res.data as Map).cast<String, dynamic>();
  }

  /// 🧾 Lấy danh sách bài nộp của học viên (để xem lại)
  static Future<List> getSubmissions({
    String? sectionId,
    String? userId,
    String? skill,
  }) async {
    final res = await dio.get(
      '$_base/submissions',
      queryParameters: {
        if (sectionId != null) 'sectionId': sectionId,
        if (userId != null) 'userId': userId,
        if (skill != null) 'skill': skill,
      },
    );
    return (res.data as List?) ?? [];
  }

  /// 🔍 Lấy chi tiết 1 bài nộp (bao gồm điểm giáo viên và nhận xét)
  static Future<Map<String, dynamic>> getSubmissionDetail(String id) async {
    final res = await dio.get('$_base/submissions/$id');
    return (res.data as Map).cast<String, dynamic>();
  }
}
