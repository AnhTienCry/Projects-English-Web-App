import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class TokenHelper {
  static const String _testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OGZkMTI4YWU0NjJjNzhlNTI0YzMzZWMiLCJyb2xlIjoic3R1ZGVudCIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImlhdCI6MTc2MTQxNTgxOCwiZXhwIjoxNzYxNTAyMjE4fQ.9PHIh9ajSp8eTO11gVrsiMJKNAxA4R_oSIo0wh2xU2Y';
  
  static Future<void> setTestToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('accessToken', _testToken);
    debugPrint('✅ Test token set successfully');
  }
  
  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('accessToken');
  }
  
  static Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('accessToken');
    debugPrint('✅ Token cleared');
  }
}


