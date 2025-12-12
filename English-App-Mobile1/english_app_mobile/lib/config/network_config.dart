// lib/config/network_config.dart
import 'dart:io';

class NetworkConfig {
  /// BẬT = chạy Android Emulator; TẮT = máy thật (Android/iOS) + web/desktop
  static const bool useAndroidEmulator = true;

  /// IP/LAN của backend khi chạy máy thật
  static const String lanBase = 'http://172.16.16.36:4000';

  static String get baseUrl {
    if (Platform.isAndroid && useAndroidEmulator) {
      // Android emulator: 10.0.2.2 trỏ vào localhost của máy
      return 'http://10.0.2.2:4000';
    }
    if (Platform.isIOS) {
      // iOS simulator
      return 'http://localhost:4000';
    }
    // Android thật, iPhone thật, Web, Desktop
    return lanBase;
  }

  // Timeout (ms)
  static const int connectTimeout = 10000;
  static const int receiveTimeout = 10000;
  static const int sendTimeout = 10000;
}
