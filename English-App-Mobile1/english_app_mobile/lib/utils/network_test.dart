import 'package:dio/dio.dart';

class NetworkTest {
  static Future<Map<String, dynamic>> testConnection(String baseUrl) async {
    final dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 5),
      receiveTimeout: const Duration(seconds: 5),
    ));

    try {
      // Test basic connection
      final response = await dio.get('/health');
      return {
        'success': true,
        'message': 'Connection successful',
        'data': response.data,
        'statusCode': response.statusCode,
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Connection failed',
        'error': e.toString(),
      };
    }
  }

  static Future<Map<String, dynamic>> testLogin(String baseUrl) async {
    final dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 5),
      receiveTimeout: const Duration(seconds: 5),
    ));

    try {
      final response = await dio.post('/api/auth/login', data: {
        'email': 'student@example.com',
        'password': '123123',
      });
      
      return {
        'success': true,
        'message': 'Login successful',
        'data': response.data,
        'statusCode': response.statusCode,
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Login failed',
        'error': e.toString(),
      };
    }
  }

  static Future<Map<String, dynamic>> testAllConnections() async {
    final results = <String, dynamic>{};
    
    // Test different base URLs
    final urls = [
      'http://localhost:4000',
      'http://10.0.2.2:4000',
      'http://127.0.0.1:4000',
    ];

    for (final url in urls) {
      results[url] = {
        'connection': await testConnection(url),
        'login': await testLogin(url),
      };
    }

    return results;
  }
}


