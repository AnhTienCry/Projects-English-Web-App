import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'api/api_client.dart';
import 'config/network_config.dart';
import 'providers/theme_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/register_screen.dart';
import 'screens/other/home_screen.dart';
import 'screens/other/notification_screen.dart';
import 'screens/other/voice_chat_screen.dart';
import 'services/socket_service.dart';
import 'services/system_notification_service.dart';
import 'utils/auth_helper.dart';

/// ✅ Global key để show SnackBar & điều hướng toàn app
final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();
final GlobalKey<ScaffoldMessengerState> scaffoldMessengerKey =
    GlobalKey<ScaffoldMessengerState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await setupInterceptors();
  await SystemNotificationService().initialize();
  debugPrint('📡 Using Base URL: ${NetworkConfig.baseUrl}');

  runApp(const EnglishApp());
}

/// ✅ Listener toàn cục — sẽ hoạt động ở mọi màn hình
void setupGlobalSocketListener() {
  if (SocketService.onNotificationReceived != null) return; // tránh gán trùng

  SocketService.onNotificationReceived = (notification) async {
    final title = notification['title'] ?? 'Notification';
    final message = notification['message'] ?? '';

    debugPrint('📩 Global notification received: $title');

    // 🔧 BỔ SUNG: dọn cái cũ trước khi show cái mới
    scaffoldMessengerKey.currentState
      ?..removeCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text('🔔 $title\n$message'),
          duration: const Duration(seconds: 4),
          action: SnackBarAction(
            label: 'Xem',
            onPressed: () {
              navigatorKey.currentState?.push(
                MaterialPageRoute(builder: (_) => const NotificationScreen()),
              );
            },
          ),
        ),
      );

    await SystemNotificationService().showSystemNotification(notification);
  };
}

class EnglishApp extends StatelessWidget {
  const EnglishApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => ThemeProvider(),
      child: Consumer<ThemeProvider>(
        builder: (context, themeProvider, _) {
          return MaterialApp(
            debugShowCheckedModeBanner: false,
            title: 'English Learning App',
            navigatorKey: navigatorKey, // ✅ Điều hướng toàn cục
            scaffoldMessengerKey: scaffoldMessengerKey, // ✅ SnackBar toàn cục
            theme: ThemeData(
              primarySwatch: Colors.blue,
              visualDensity: VisualDensity.adaptivePlatformDensity,
              fontFamily: 'Inter', // Font tốt cho tiếng Việt
              brightness: Brightness.light,
              scaffoldBackgroundColor: const Color(0xFFF3F4F6),
              cardColor: Colors.white,
              textTheme: const TextTheme(
                // Sử dụng Inter cho tiếng Việt rõ ràng hơn
                bodyLarge: TextStyle(fontFamily: 'Inter'),
                bodyMedium: TextStyle(fontFamily: 'Inter'),
                bodySmall: TextStyle(fontFamily: 'Inter'),
                titleLarge: TextStyle(fontFamily: 'Inter'),
                titleMedium: TextStyle(fontFamily: 'Inter'),
                titleSmall: TextStyle(fontFamily: 'Inter'),
              ),
            ),
            darkTheme: ThemeData(
              primarySwatch: Colors.blue,
              visualDensity: VisualDensity.adaptivePlatformDensity,
              fontFamily: 'Inter', // Font tốt cho tiếng Việt
              brightness: Brightness.dark,
              textTheme: const TextTheme(
                // Sử dụng Inter cho tiếng Việt rõ ràng hơn
                bodyLarge: TextStyle(fontFamily: 'Inter'),
                bodyMedium: TextStyle(fontFamily: 'Inter'),
                bodySmall: TextStyle(fontFamily: 'Inter'),
                titleLarge: TextStyle(fontFamily: 'Inter'),
                titleMedium: TextStyle(fontFamily: 'Inter'),
                titleSmall: TextStyle(fontFamily: 'Inter'),
              ),
              scaffoldBackgroundColor: const Color(0xFF121212),
              cardColor: const Color(0xFF1E1E1E),
              appBarTheme: const AppBarTheme(
                backgroundColor: Color(0xFF1E1E1E),
                foregroundColor: Colors.white,
              ),
              cardTheme: CardThemeData(
                color: const Color(0xFF1E1E1E),
                elevation: 2,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
            ),
            themeMode: themeProvider.themeMode,
            home: const AuthWrapper(),
            routes: {
              '/login': (context) => const LoginScreen(),
              '/register': (context) => const RegisterScreen(),
              '/home': (context) => const HomeScreen(),
              '/voice-chat': (context) => const VoiceChatSocketScreen(),
              '/notifications': (context) => const NotificationScreen(),
            },
          );
        },
      ),
    );
  }
}

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<bool>(
      future: AuthHelper.isAuthenticated(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        if (snapshot.data == true) {
          _initializeSocket();
          return const HomeScreen();
        } else {
          SocketService.disconnect();
          return const LoginScreen();
        }
      },
    );
  }

  void _initializeSocket() async {
    try {
      final userId = await AuthHelper.getUserId();
      if (userId != null) {
        SocketService.initialize(userId);
        SocketService.connect();

        // ✅ Gắn listener toàn cục (chỉ một lần)
        setupGlobalSocketListener();
      }
    } catch (e) {
      debugPrint('❌ Failed to initialize socket: $e');
    }
  }
}
