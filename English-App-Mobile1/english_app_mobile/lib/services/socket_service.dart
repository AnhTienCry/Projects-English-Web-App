import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../config/api_config.dart';
import '../utils/progress_store.dart';

class SocketService {
  static io.Socket? _socket;
  static bool _isConnected = false;

  // Callbacks for different events
  static Function(Map<String, dynamic>)? onNotificationReceived;
  static Function()? onConnected;
  static Function()? onDisconnected;
  static Function(String)? onError;

  /// Initialize socket connection
  static void initialize(String userId) {
    if (_socket != null) {
      _socket!.dispose();
    }

    try {
      _socket = io.io(
        ApiConfig.baseUrl,
        <String, dynamic>{
          'transports': ['websocket'],
          'extraHeaders': {'Authorization': 'Bearer $userId'},
        },
      );

      _socket!.onConnect((_) {
        debugPrint('🔌 Socket connected');
        _isConnected = true;
        _socket!.emit('join', userId);
        onConnected?.call();
      });

      _socket!.onReconnect((_) {
        debugPrint('♻️ Socket reconnected — rejoin room');
        _socket!.emit('join', userId);
      });

      _socket!.onReconnectAttempt((attempt) {
        debugPrint('…reconnect attempt: $attempt');
      });

      _socket!.onReconnectError((error) {
        debugPrint('❌ reconnect error: $error');
      });

      _socket!.onDisconnect((_) {
        debugPrint('🔌 Socket disconnected');
        _isConnected = false;
        onDisconnected?.call();
      });

      _socket!.onConnectError((error) {
        debugPrint('❌ Socket connection error: $error');
        onError?.call(error.toString());
      });

      _socket!.on('notification.send', (data) {
        debugPrint('🔔 Received notification: $data');
        if (data is Map<String, dynamic>) {
          onNotificationReceived?.call(data);
        } else if (data is Map) {
          onNotificationReceived?.call(Map<String, dynamic>.from(data));
        }
      });

      _socket!.on('error', (error) {
        debugPrint('❌ Socket error: $error');
        onError?.call(error.toString());
      });
    } catch (e) {
      debugPrint('❌ Failed to initialize socket: $e');
      onError?.call(e.toString());
    }
  }

  /// Initialize socket connection with custom base URL and token
  static void init(String baseUrl, String token) {
    if (_socket != null) return;
    _socket = io.io(baseUrl, <String, dynamic>{
      'transports': ['websocket'],
      'extraHeaders': {'Authorization': 'Bearer $token'},
    });

    _socket!.onConnect((_) {
      debugPrint('socket connected');
    });
    _socket!.on('badge.earned', (data) async {
      debugPrint('socket badge.earned: $data');
      await ProgressStore.addBadge(data);
    });
    _socket!.on('rank.updated', (data) async {
      debugPrint('socket rank.updated: $data');
      try {
        final map = Map<String, dynamic>.from(data as Map);
        await ProgressStore.saveRank(map);
      } catch (_) {}
    });
  }

  /// Connect to socket
  static void connect() {
    if (_socket != null && !_isConnected) {
      _socket!.connect();
    }
  }

  /// Disconnect from socket
  static void disconnect() {
    if (_socket != null) {
      _socket!.disconnect();
      _socket!.dispose();
      _socket = null;
      _isConnected = false;
    }
  }

  /// Check if socket is connected
  static bool get isConnected => _isConnected;

  /// Join a room (for notifications)
  static void joinRoom(String roomId) {
    if (_socket != null && _isConnected) {
      _socket!.emit('join', roomId);
    }
  }

  /// Leave a room
  static void leaveRoom(String roomId) {
    if (_socket != null && _isConnected) {
      _socket!.emit('leave', roomId);
    }
  }

  /// Send a message through socket
  static void emit(String event, dynamic data) {
    if (_socket != null && _isConnected) {
      _socket!.emit(event, data);
    }
  }

  /// Listen to a specific event and return a function to unsubscribe this callback
  static VoidCallback on(String event, Function(dynamic) callback) {
    if (_socket != null) {
      _socket!.on(event, callback);
      // ✅ Trả về hàm gỡ đúng callback này
      return () {
        try {
          _socket!.off(event, callback);
        } catch (_) {}
      };
    }
    return () {};
  }

  /// Gỡ toàn bộ listener của event (hiếm khi cần dùng)
  static void offAll(String event) {
    if (_socket != null) {
      _socket!.off(event);
    }
  }
}
