import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AuthHelper {
  // Xóa toàn bộ dữ liệu đăng nhập
  static Future<void> clearAuthData() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('accessToken');
    await prefs.remove('refreshToken');
    await prefs.remove('userData');
    debugPrint('✅ Auth data cleared');
  }

  // Kiểm tra user đã đăng nhập chưa
  static Future<bool> isAuthenticated() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('accessToken');
    return token != null && token.isNotEmpty;
  }

  // Lấy access token
  static Future<String?> getAccessToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('accessToken');
  }

  // Alias
  static Future<String?> getToken() async => getAccessToken();

  // 🔐 Lưu thông tin đăng nhập (lưu JSON chứ không dùng toString)
  static Future<void> saveAuthData({
    required String accessToken,
    required String refreshToken,
    required Map<String, dynamic> userData,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('accessToken', accessToken);
    await prefs.setString('refreshToken', refreshToken);
    await prefs.setString('userData', jsonEncode(userData)); // ✅ JSON
    debugPrint('✅ Auth data saved');
  }

  // 🔍 Lấy userId từ dữ liệu user đã lưu
  static Future<String?> getUserId() async {
    final prefs = await SharedPreferences.getInstance();
    final userDataString = prefs.getString('userData');
    if (userDataString == null) return null;

    try {
      final data = jsonDecode(userDataString);
      // hỗ trợ cả 'id' hoặc '_id'
      return data['_id'] ?? data['id'];
    } catch (e) {
      debugPrint('⚠️ Error parsing userData: $e');
      return null;
    }
  }
}