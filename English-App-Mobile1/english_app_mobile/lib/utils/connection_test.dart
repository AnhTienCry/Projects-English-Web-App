import 'package:dio/dio.dart';

class ConnectionTest {
  static Future<Map<String, dynamic>> testAllUrls() async {
    final results = <String, dynamic>{};
    
    // Test different URLs that might work
    final urls = [
      'http://10.0.2.2:4000',  // Android emulator to host
      'http://localhost:4000',  // Direct localhost
      'http://127.0.0.1:4000', // Alternative localhost
    ];

    for (final url in urls) {
      try {
        final dio = Dio(BaseOptions(
          baseUrl: url,
          connectTimeout: const Duration(seconds: 5),
          receiveTimeout: const Duration(seconds: 5),
        ));

        // Test health endpoint
        final healthResponse = await dio.get('/health');
        
        // Test login endpoint
        final loginResponse = await dio.post('/api/auth/login', data: {
          'email': 'student@example.com',
          'password': '123123',
        });

        results[url] = {
          'health': {
            'success': true,
            'status': healthResponse.statusCode,
            'data': healthResponse.data,
          },
          'login': {
            'success': true,
            'status': loginResponse.statusCode,
            'user': loginResponse.data['user']['email'],
            'role': loginResponse.data['user']['role'],
          },
        };
      } catch (e) {
        results[url] = {
          'health': {
            'success': false,
            'error': e.toString(),
          },
          'login': {
            'success': false,
            'error': e.toString(),
          },
        };
      }
    }

    return results;
  }

  static String formatResults(Map<String, dynamic> results) {
    String output = '🔍 Connection Test Results:\n\n';
    
    results.forEach((url, result) {
      output += '📡 $url:\n';
      
      // Health test
      if (result['health']['success']) {
        output += '  ✅ Health: ${result['health']['status']} - ${result['health']['data']}\n';
      } else {
        output += '  ❌ Health: ${result['health']['error']}\n';
      }
      
      // Login test
      if (result['login']['success']) {
        output += '  ✅ Login: ${result['login']['user']} (${result['login']['role']})\n';
      } else {
        output += '  ❌ Login: ${result['login']['error']}\n';
      }
      
      output += '\n';
    });
    
    return output;
  }
}


