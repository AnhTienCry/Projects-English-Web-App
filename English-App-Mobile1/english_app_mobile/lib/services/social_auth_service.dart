import 'package:flutter/material.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter_facebook_auth/flutter_facebook_auth.dart';
import 'package:dio/dio.dart';
import '../config/api_config.dart';
import '../config/network_config.dart';

/// Service xử lý đăng nhập bằng Google và Facebook
class SocialAuthService {
  static final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: ['email', 'profile'],

    serverClientId: '492700278542-99sfef950bdnfi7jgv7r175paadr807b.apps.googleusercontent.com',
  );

  /// Đăng nhập bằng Google
  static Future<Map<String, dynamic>?> signInWithGoogle() async {
    try {
      // Đăng xuất user cũ nếu có (tránh conflict)
      await _googleSignIn.signOut();

      // Đăng nhập Google
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      
      if (googleUser == null) {
        // User hủy đăng nhập
        return null;
      }

      // Lấy thông tin authentication
      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;

      // Tạo request body gửi về backend
      final response = await _sendSocialAuthToBackend(
        email: googleUser.email,
        name: googleUser.displayName ?? '',
        provider: 'google',
        providerId: googleUser.id,
        accessToken: googleAuth.accessToken ?? '',
      );

      return response;
    } catch (e) {
      debugPrint('❌ Google Sign In Error: $e');
      rethrow;
    }
  }

  /// Đăng nhập bằng Facebook
  static Future<Map<String, dynamic>?> signInWithFacebook() async {
    try {
      // Đăng xuất user cũ nếu có
      await FacebookAuth.instance.logOut();

      // Đăng nhập Facebook
      final LoginResult result = await FacebookAuth.instance.login(
        permissions: ['email', 'public_profile'],
      );

      if (result.status != LoginStatus.success) {
        // User hủy hoặc có lỗi
        return null;
      }

      // Lấy thông tin user từ Facebook
      final userData = await FacebookAuth.instance.getUserData(
        fields: 'email,name,id',
      );

      // Tạo request body gửi về backend
      final response = await _sendSocialAuthToBackend(
        email: userData['email'] ?? '',
        name: userData['name'] ?? '',
        provider: 'facebook',
        providerId: userData['id'] ?? '',
        accessToken: result.accessToken?.tokenString ?? '',
      );

      return response;
    } catch (e) {
      debugPrint('❌ Facebook Sign In Error: $e');
      rethrow;
    }
  }

  /// Gửi thông tin social auth về backend
  /// 
  /// Note: Backend hiện tại chưa có endpoint cho social login.
  /// Tạm thời sử dụng cách tiếp cận: tạo password từ providerId để đăng ký/login.
  /// Khi backend có endpoint riêng cho social login, chỉ cần thay đổi hàm này.
  static Future<Map<String, dynamic>> _sendSocialAuthToBackend({
    required String email,
    required String name,
    required String provider,
    required String providerId,
    required String accessToken,
  }) async {
    final dio = Dio(BaseOptions(baseUrl: NetworkConfig.baseUrl));

    // Tạo password từ providerId để đảm bảo user có thể login sau này
    // Trong production, backend nên có endpoint riêng xử lý social login
    final socialPassword = '${provider}_${providerId}_social_auth';

    try {
      // Thử đăng ký trước (nếu user chưa tồn tại)
      try {
        final registerResponse = await dio.post(
          ApiConfig.registerEndpoint,
          data: {
            'email': email,
            'nickname': name.isNotEmpty ? name : email.split('@')[0],
            'password': socialPassword,
          },
        );

        return {
          'success': true,
          'accessToken': registerResponse.data['accessToken'],
          'refreshToken': registerResponse.data['refreshToken'],
          'user': registerResponse.data['user'],
        };
      } on DioException catch (e) {
        // Nếu email đã tồn tại (409), thử đăng nhập
        if (e.response?.statusCode == 409) {
          try {
            final loginResponse = await dio.post(
              ApiConfig.loginEndpoint,
              data: {
                'email': email,
                'password': socialPassword,
              },
            );

            return {
              'success': true,
              'accessToken': loginResponse.data['accessToken'],
              'refreshToken': loginResponse.data['refreshToken'],
              'user': loginResponse.data['user'],
            };
          } on DioException {
            // Nếu không login được (có thể user đã đăng ký bằng cách khác)
            // Trong production, backend nên có logic xử lý liên kết tài khoản social
            debugPrint('⚠️ Cannot login with social password. User might have registered with different method.');
            throw Exception('Không thể đăng nhập. Email này đã được đăng ký bằng phương thức khác.');
          }
        }
        rethrow;
      }
    } catch (e) {
      debugPrint('❌ Backend Social Auth Error: $e');
      rethrow;
    }
  }

  /// Đăng xuất Google
  static Future<void> signOutGoogle() async {
    await _googleSignIn.signOut();
  }

  /// Đăng xuất Facebook
  static Future<void> signOutFacebook() async {
    await FacebookAuth.instance.logOut();
  }
}

