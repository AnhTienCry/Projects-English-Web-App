import 'package:flutter/material.dart';

import '../../api/api_client.dart';
import '../../services/socket_service.dart';

class NotificationScreen extends StatefulWidget {
  const NotificationScreen({super.key});

  @override
  State<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  final ScrollController _scrollController = ScrollController();
  VoidCallback? _unsubscribeSocket;

  List<Map<String, dynamic>> notifications = [];
  bool loading = true;
  String? error;

  @override
  void initState() {
    super.initState();
    fetchNotifications();
    _setupSocketListeners();
  }

  @override
  void dispose() {
    // Gỡ listener đúng tên event để tránh memory leak
    _unsubscribeSocket?.call(); // gỡ riêng listener của trang
    _scrollController.dispose();
    super.dispose();
  }

  // ----- Helpers -----
  DateTime _parseDate(dynamic value) {
    if (value == null) return DateTime.fromMillisecondsSinceEpoch(0);
    try {
      if (value is String) return DateTime.parse(value);
      if (value is int) return DateTime.fromMillisecondsSinceEpoch(value);
      return DateTime.fromMillisecondsSinceEpoch(0);
    } catch (_) {
      return DateTime.fromMillisecondsSinceEpoch(0);
    }
  }

  void _sortNotificationsInPlace() {
    notifications.sort((a, b) {
      final aRead = (a['isRead'] ?? false) as bool;
      final bRead = (b['isRead'] ?? false) as bool;
      // 1) Unread lên trước
      if (aRead != bRead) return aRead ? 1 : -1;

      // 2) Mới nhất trước (desc)
      final aDate = _parseDate(a['createdAt']);
      final bDate = _parseDate(b['createdAt']);
      return bDate.compareTo(aDate);
    });
  }

  int _unreadCount() {
    return notifications.where((n) => !(n['isRead'] ?? false)).length;
  }

  // ----- Socket -----
  void _setupSocketListeners() {
    // Nếu SocketService có API on(event, cb)
    _unsubscribeSocket = SocketService.on('notification.send', (
      dynamic notification,
    ) {
      if (!mounted) return;

      setState(() {
        // đảm bảo kiểu Map<String,dynamic>
        final n = Map<String, dynamic>.from(notification as Map);
        notifications.insert(0, n);
        _sortNotificationsInPlace();
      });

      // Snackbar
      final title = notification['title'] ?? 'Notification';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('🔔 $title'),
          duration: const Duration(seconds: 3),
          action: SnackBarAction(
            label: 'Xem',
            onPressed: () {
              if (_scrollController.hasClients) {
                _scrollController.animateTo(
                  0,
                  duration: const Duration(milliseconds: 250),
                  curve: Curves.easeOut,
                );
              }
            },
          ),
        ),
      );
    });

    // Nếu dự án của bạn đang dùng callback `onNotificationReceived`, giữ lại dòng này:
    // SocketService.onNotificationReceived = (notification) { ... như trên ... };
  }

  // ----- API -----
  Future<void> fetchNotifications() async {
    if (!mounted) return;

    setState(() {
      loading = true;
      error = null;
    });

    try {
      final res = await dio.get('/api/notifications');
      if (!mounted) return;

      final List data = (res.data['notifications'] ?? []) as List;
      final parsed = data
          .map<Map<String, dynamic>>((e) => Map<String, dynamic>.from(e as Map))
          .toList();

      setState(() {
        notifications = parsed;
        _sortNotificationsInPlace();
        loading = false;
      });
    } catch (e) {
      debugPrint('❌ Error fetching notifications: $e');
      if (mounted) {
        setState(() {
          error = 'Failed to load notifications';
          loading = false;
        });
      }
    }
  }

  Future<void> markAsRead(String notificationId) async {
    // Cập nhật lạc quan
    final idx = notifications.indexWhere((n) => n['_id'] == notificationId);
    if (idx != -1 && !(notifications[idx]['isRead'] ?? false)) {
      setState(() {
        notifications[idx]['isRead'] = true;
        _sortNotificationsInPlace();
      });
    }

    try {
      await dio.patch('/api/notifications/$notificationId/read');
    } catch (e) {
      debugPrint('❌ Error marking notification as read: $e');
      // rollback nếu cần
      if (idx != -1) {
        setState(() {
          notifications[idx]['isRead'] = false;
          _sortNotificationsInPlace();
        });
      }
    }
  }

  Future<void> markAllRead() async {
    // Cập nhật lạc quan
    setState(() {
      for (final n in notifications) {
        n['isRead'] = true;
      }
      _sortNotificationsInPlace();
    });

    try {
      await dio.patch('/api/notifications/mark-all-read');
    } catch (e) {
      debugPrint('❌ Error marking all as read: $e');
      // Nếu lỗi, reload từ server để đồng bộ
      fetchNotifications();
    }
  }

  Future<void> deleteReadNotifications() async {
    // Cập nhật lạc quan
    final backup = List<Map<String, dynamic>>.from(notifications);
    setState(() {
      notifications.removeWhere((n) => (n['isRead'] ?? false) == true);
    });

    try {
      await dio.delete('/api/notifications/delete-read');

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Đã xóa thông báo đã đọc'),
            duration: Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      debugPrint('❌ Error deleting read notifications: $e');
      // rollback
      setState(() {
        notifications = backup;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('❌ Lỗi khi xóa thông báo'),
            duration: Duration(seconds: 2),
          ),
        );
      }
    }
  }

  String formatDate(String? timestamp) {
    if (timestamp == null) return '';
    try {
      final date = DateTime.parse(timestamp);
      final now = DateTime.now();
      final diff = now.difference(date);

      if (diff.inMinutes < 1) return 'just now';
      if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
      if (diff.inHours < 24) return '${diff.inHours}h ago';
      if (diff.inDays < 7) return '${diff.inDays}d ago';
      return '${date.day}/${date.month}/${date.year}';
    } catch (_) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (error != null) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Notifications'),
          backgroundColor: Colors.blue,
          foregroundColor: Colors.white,
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(error!, style: const TextStyle(color: Colors.red)),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: fetchNotifications,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    final unread = _unreadCount();

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const Text('Notifications'),
            if (unread > 0) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.redAccent,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  '$unread',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ],
        ),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
        actions: [
          if (notifications.isNotEmpty) ...[
            IconButton(
              icon: const Icon(Icons.mark_email_read),
              onPressed: unread > 0 ? markAllRead : null,
              tooltip: 'Đánh dấu tất cả đã đọc',
            ),
            IconButton(
              icon: const Icon(Icons.delete_sweep),
              onPressed: deleteReadNotifications,
              tooltip: 'Xóa thông báo đã đọc',
            ),
          ],
        ],
      ),
      body: RefreshIndicator(
        onRefresh: fetchNotifications,
        child: notifications.isEmpty
            ? const Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.notifications_none,
                      size: 80,
                      color: Colors.grey,
                    ),
                    SizedBox(height: 16),
                    Text(
                      'No notifications',
                      style: TextStyle(fontSize: 18, color: Colors.grey),
                    ),
                  ],
                ),
              )
            : ListView.builder(
                controller: _scrollController,
                padding: const EdgeInsets.all(16),
                itemCount: notifications.length,
                itemBuilder: (context, index) {
                  final notification = notifications[index];
                  return NotificationCard(
                    notification: notification,
                    onMarkAsRead: markAsRead,
                    formatDate: formatDate,
                  );
                },
              ),
      ),
    );
  }
}

class NotificationCard extends StatelessWidget {
  final Map<String, dynamic> notification;
  final Function(String) onMarkAsRead;
  final String Function(String?) formatDate;

  const NotificationCard({
    super.key,
    required this.notification,
    required this.onMarkAsRead,
    required this.formatDate,
  });

  @override
  Widget build(BuildContext context) {
    final isRead = notification['isRead'] ?? false;
    final type = notification['type'] ?? 'general';
    final title = notification['title'] ?? 'Notification';
    final message = notification['message'] ?? '';
    final timestamp = notification['createdAt'] as String?;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: isRead ? 2 : 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: () {
          if (!isRead) {
            onMarkAsRead(notification['_id']);
          }
        },
        borderRadius: BorderRadius.circular(12),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: isRead
                ? null
                : Border.all(color: Colors.blue.shade200, width: 1),
          ),
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Icon(
                  type == 'lesson'
                      ? Icons.book
                      : type == 'quiz'
                      ? Icons.quiz
                      : type == 'achievement'
                      ? Icons.emoji_events
                      : Icons.notifications,
                  color: Colors.blue,
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            title,
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: isRead
                                  ? FontWeight.w500
                                  : FontWeight.bold,
                              color: Colors.black87,
                            ),
                          ),
                        ),
                        if (!isRead)
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: Colors.blue,
                              shape: BoxShape.circle,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      message,
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey.shade600,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      formatDate(timestamp),
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey.shade500,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: () {
                  if (!isRead) {
                    onMarkAsRead(notification['_id']);
                  }
                },
                icon: const Icon(Icons.chevron_right),
                color: Colors.grey.shade400,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
