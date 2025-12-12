import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class SystemNotificationService {
  static final SystemNotificationService _instance =
      SystemNotificationService._internal();
  factory SystemNotificationService() => _instance;
  SystemNotificationService._internal();

  final FlutterLocalNotificationsPlugin _notifications =
      FlutterLocalNotificationsPlugin();
  bool _isInitialized = false;

  Future<void> initialize() async {
    if (_isInitialized) return;

    const AndroidInitializationSettings initAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    const DarwinInitializationSettings initIOS = DarwinInitializationSettings();

    const InitializationSettings initSettings = InitializationSettings(
      android: initAndroid,
      iOS: initIOS,
    );

    await _notifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTapped,
    );

    // ✅ Yêu cầu quyền POST_NOTIFICATIONS trên Android 13+
    await _notifications
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >()
        ?.requestNotificationsPermission();

    _isInitialized = true;
    debugPrint('🔔 Local notification system initialized');
  }

  /// Hiển thị thông báo trên thanh trạng thái Android/iOS
  Future<void> showSystemNotification(Map<String, dynamic> data) async {
    try {
      // 🔧 BỔ SUNG: tạo ID ổn định, không trùng
      final int id = (data['_id'] != null)
          ? data['_id'].toString().hashCode & 0x7fffffff
          : DateTime.now().microsecondsSinceEpoch & 0x7fffffff;

      final title = data['title'] ?? 'New notification';
      final body = data['message'] ?? '';
      final payload = 'system_${data['_id'] ?? ''}';

      const AndroidNotificationDetails androidDetails =
          AndroidNotificationDetails(
            'general_notifications',
            'General Notifications',
            channelDescription: 'App notifications',
            importance: Importance.high,
            priority: Priority.high,
            playSound: true,
            enableVibration: true,
          );
      const DarwinNotificationDetails iosDetails = DarwinNotificationDetails(
        presentAlert: true,
        presentSound: true,
        presentBadge: true,
      );

      await _notifications.show(
        id,
        title,
        body,
        const NotificationDetails(android: androidDetails, iOS: iosDetails),
        payload: payload,
      );

      debugPrint('✅ System notification shown: $title (id=$id)');
    } catch (e) {
      debugPrint('❌ Error showing system notification: $e');
    }
  }

  void _onNotificationTapped(NotificationResponse response) {
    debugPrint('🔔 Notification tapped: ${response.payload}');
  }
}
