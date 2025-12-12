import 'package:flutter/material.dart';

import '../../api/api_client.dart';
import '../../config/api_config.dart';
import '../lessons/lesson_option_screen.dart';
import '../lessons/lesson_screen.dart';
import '../practice/practice_mode_screen.dart';
import '../profile/profile_screen.dart';
import '../progress/progress_screen.dart';
import '../videos/video_learning_screen.dart';
import 'notification_screen.dart';
import 'translation_screen.dart';
import 'voice_chat_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with WidgetsBindingObserver {
  int _currentIndex = 0;
  Map<String, dynamic>? userProfile;
  Map<String, dynamic>? stats;
  bool isLoading = true;
  int _progressRefreshTrigger = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _loadUserData();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      // Trigger progress refresh when app resumes
      if (mounted) {
        setState(() => _progressRefreshTrigger++);
      }
    }
  }

  Future<void> _loadUserData() async {
    try {
      final profileRes = await dio.get(ApiConfig.profileEndpoint);

      // Try to get progress data
      try {
        final progressRes = await dio.get(ApiConfig.progressionEndpoint);
        if (mounted) {
          setState(() {
            userProfile = profileRes.data;
            stats = progressRes.data['stats'];
            isLoading = false;
          });
        }
      } catch (progressError) {
        // If progress not found, try to initialize it
        try {
          await dio.post(ApiConfig.initializeProgressEndpoint);
          final progressRes = await dio.get(ApiConfig.progressionEndpoint);
          if (mounted) {
            setState(() {
              userProfile = profileRes.data;
              stats = progressRes.data['stats'];
              isLoading = false;
            });
          }
        } catch (initError) {
          // If initialization fails, just load profile without stats
          if (mounted) {
            setState(() {
              userProfile = profileRes.data;
              stats = null;
              isLoading = false;
            });
          }
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => isLoading = false);
        _showErrorDialog('Failed to load user data');
      }
    }
  }

  void _showErrorDialog(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Error'),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return Scaffold(
        body: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Colors.blue, Colors.purple],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: const Center(
            child: CircularProgressIndicator(color: Colors.white),
          ),
        ),
      );
    }

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: [
          HomeTab(
            userProfile: userProfile,
            stats: stats,
            onRefresh: _loadUserData,
          ),
          LessonScreen(mode: 'normal'),
          const VoiceChatSocketScreen(),
          ProgressScreen(key: ValueKey(_progressRefreshTrigger)),
          const ProfileScreen(),
        ],
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          boxShadow: [
            BoxShadow(
              color: Colors.grey.withValues(alpha: 0.3),
              spreadRadius: 1,
              blurRadius: 10,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: BottomNavigationBar(
          type: BottomNavigationBarType.fixed,
          currentIndex: _currentIndex,
          onTap: (index) {
            setState(() {
              _currentIndex = index;
              // Trigger progress refresh when switching to Progress tab
              if (index == 3) {
                _progressRefreshTrigger++;
              }
              // Handle Lessons tab - Navigate to LessonOptionScreen
              if (index == 1) {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => LessonOptionScreen(
                      lessonId: '',
                      lessonTitle: 'Lessons',
                    ),
                  ),
                );
                // Reset to previous tab after navigation
                _currentIndex = 0;
              }
              // Handle AI Voice Chat tab - Now enabled!
              if (index == 2) {
                // Navigate to Voice Chat Screen
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const VoiceChatSocketScreen(),
                  ),
                );
                // Reset to previous tab after navigation
                _currentIndex = 0;
              }
            });
          },
          selectedItemColor: Colors.blue,
          unselectedItemColor: Colors.grey,
          backgroundColor: Colors.white,
          elevation: 0,
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.home_outlined),
              activeIcon: Icon(Icons.home),
              label: 'Home',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.book_outlined),
              activeIcon: Icon(Icons.book),
              label: 'Lessons',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.mic_outlined),
              activeIcon: Icon(Icons.mic),
              label: 'AI Voice Chat',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.trending_up_outlined),
              activeIcon: Icon(Icons.trending_up),
              label: 'Progress',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.person_outlined),
              activeIcon: Icon(Icons.person),
              label: 'Profile',
            ),
          ],
        ),
      ),
    );
  }
}

class HomeTab extends StatefulWidget {
  final Map<String, dynamic>? userProfile;
  final Map<String, dynamic>? stats;
  final VoidCallback onRefresh;

  const HomeTab({
    super.key,
    this.userProfile,
    this.stats,
    required this.onRefresh,
  });

  @override
  State<HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<HomeTab> {
  int unreadNotifications = 0;
  List<Map<String, dynamic>> recentActivities = [];
  bool loadingActivities = true;

  @override
  void initState() {
    super.initState();
    _loadNotificationCount();
    _loadRecentActivities();
  }

  Future<void> _loadNotificationCount() async {
    try {
      final response = await dio.get(ApiConfig.notificationsEndpoint);
      if (response.data is Map && response.data['notifications'] is List) {
        final notifications = response.data['notifications'] as List;
        if (mounted) {
          setState(() {
            unreadNotifications = notifications
                .where((n) => n['isRead'] == false)
                .length;
          });
        }
      }
    } catch (e) {
      debugPrint('Error loading notification count: $e');
    }
  }

  Future<void> _loadRecentActivities() async {
    if (!mounted) return;
    setState(() => loadingActivities = true);

    try {
      final response = await dio.get(ApiConfig.notificationsEndpoint);
      if (response.data is Map && response.data['notifications'] is List) {
        final allNotifications = (response.data['notifications'] as List)
            .map<Map<String, dynamic>>((e) => Map<String, dynamic>.from(e as Map))
            .toList();

        // Sắp xếp theo thời gian mới nhất
        allNotifications.sort((a, b) {
          final aDate = _parseDate(a['createdAt']);
          final bDate = _parseDate(b['createdAt']);
          return bDate.compareTo(aDate);
        });

        // Lấy 3 mục đầu tiên
        if (mounted) {
          setState(() {
            recentActivities = allNotifications.take(3).toList();
            loadingActivities = false;
          });
        }
      }
    } catch (e) {
      debugPrint('Error loading recent activities: $e');
      if (mounted) {
        setState(() => loadingActivities = false);
      }
    }
  }

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

  String _formatTimeAgo(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inDays > 0) {
      return '${difference.inDays} ${difference.inDays == 1 ? 'ngày' : 'ngày'} trước';
    } else if (difference.inHours > 0) {
      return '${difference.inHours} ${difference.inHours == 1 ? 'giờ' : 'giờ'} trước';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes} ${difference.inMinutes == 1 ? 'phút' : 'phút'} trước';
    } else {
      return 'Vừa xong';
    }
  }

  IconData _getActivityIcon(String? type) {
    switch (type) {
      case 'lesson':
      case 'lesson_completed':
        return Icons.check_circle;
      case 'quiz':
      case 'quiz_completed':
        return Icons.quiz;
      case 'video':
      case 'video_watched':
        return Icons.play_circle;
      case 'lesson_published':
      case 'new_lesson':
        return Icons.book;
      case 'achievement':
        return Icons.emoji_events;
      default:
        return Icons.notifications;
    }
  }

  Color _getActivityColor(String? type) {
    switch (type) {
      case 'lesson':
      case 'lesson_completed':
        return Colors.green;
      case 'quiz':
      case 'quiz_completed':
        return Colors.blue;
      case 'video':
      case 'video_watched':
        return Colors.orange;
      case 'lesson_published':
      case 'new_lesson':
        return Colors.purple;
      case 'achievement':
        return Colors.amber;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async {
        widget.onRefresh();
        await _loadNotificationCount();
        await _loadRecentActivities();
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          children: [
            _buildHeader(context),
            _buildQuickActions(context),
            _buildStatsSection(context),
            _buildRecentActivity(context),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    final nickname = widget.userProfile?['nickname'] ?? 'Học viên';

    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.blue, Colors.purple],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(30),
          bottomRight: Radius.circular(30),
        ),
      ),
      padding: const EdgeInsets.fromLTRB(20, 60, 20, 30),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 25,
                backgroundColor: Colors.white.withValues(alpha: 0.2),
                child: Text(
                  nickname.isNotEmpty ? nickname[0].toUpperCase() : 'S',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 15),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Good morning!',
                      style: TextStyle(color: Colors.white70, fontSize: 14),
                    ),
                    Text(
                      nickname,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
              Stack(
                children: [
                  IconButton(
                    onPressed: () async {
                      await Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const NotificationScreen(),
                        ),
                      );
                      _loadNotificationCount();
                    },
                    icon: const Icon(
                      Icons.notifications_outlined,
                      color: Colors.white,
                    ),
                  ),
                  if (unreadNotifications > 0)
                    Positioned(
                      right: 8,
                      top: 8,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(
                          color: Colors.red,
                          shape: BoxShape.circle,
                        ),
                        constraints: const BoxConstraints(
                          minWidth: 18,
                          minHeight: 18,
                        ),
                        child: Text(
                          unreadNotifications > 9
                              ? '9+'
                              : '$unreadNotifications',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 20),
          const Text(
            'Ready to learn English today?',
            style: TextStyle(color: Colors.white, fontSize: 16),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActions(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Quick Actions',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 15),

          // Row 1: Start Lesson (Full width)
          _buildActionCard(
            context,
            'Start Lesson',
            Icons.play_circle_outline,
            Colors.blue,
            () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => LessonOptionScreen(
                  lessonId: '',
                  lessonTitle: 'Start Lesson',
                ),
              ),
            ),
            isFullWidth: true,
          ),

          const SizedBox(height: 15),

          // Practice (Luyện thi) – Full width
          _buildActionCard(
            context,
            'Practice (IELTS/TOEIC)',
            Icons.auto_awesome,
            Colors.green,
            () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const PracticeModeScreen()),
            ),
            isFullWidth: true,
          ),

          const SizedBox(height: 15),

          // AI Voice Chat - Full width button
          _buildActionCard(
            context,
            'AI Voice Chat',
            Icons.mic,
            Colors.deepOrange,
            () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => const VoiceChatSocketScreen(),
              ),
            ),
            isFullWidth: true,
          ),

          const SizedBox(height: 15),

          // Row 2: Video Learning (Full width)
          _buildActionCard(
            context,
            'Video Learning',
            Icons.video_library_outlined,
            Colors.orange,
            () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => const VideoLearningScreen(),
              ),
            ),
            isFullWidth: true,
          ),

          const SizedBox(height: 15),

          // Row 3: Translation & Progress
          Row(
            children: [
              Expanded(
                child: _buildActionCard(
                  context,
                  'Translation',
                  Icons.translate,
                  Colors.teal,
                  () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const TranslationScreen(),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 15),
              Expanded(
                child: _buildActionCard(
                  context,
                  'Progress',
                  Icons.trending_up,
                  Colors.indigo,
                  () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const ProgressScreen(),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActionCard(
    BuildContext context,
    String title,
    IconData icon,
    Color color,
    VoidCallback onTap, {
    bool isFullWidth = false,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(15),
      child: Container(
        width: isFullWidth ? double.infinity : null,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(15),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Column(
          children: [
            Icon(icon, size: 40, color: color),
            const SizedBox(height: 10),
            Text(
              title,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: color,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsSection(BuildContext context) {
    if (widget.stats == null) {
      return const SizedBox.shrink();
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Your Progress',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 15),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(15),
              boxShadow: [
                BoxShadow(
                  color: Colors.grey.withValues(alpha: 0.1),
                  spreadRadius: 1,
                  blurRadius: 10,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: _buildStatItem(
                    'Lessons',
                    '${widget.stats!['completedLessons'] ?? 0}/${widget.stats!['totalLessons'] ?? 10}',
                    Icons.book,
                    Colors.blue,
                  ),
                ),
                Expanded(
                  child: _buildStatItem(
                    'Quizzes',
                    '${widget.stats!['totalQuizAttempts'] ?? 0}',
                    Icons.quiz,
                    Colors.green,
                  ),
                ),
                Expanded(
                  child: _buildStatItem(
                    'Videos',
                    '${widget.stats!['videosWatched'] ?? 0}',
                    Icons.play_circle,
                    Colors.orange,
                  ),
                ),
                Expanded(
                  child: _buildStatItem(
                    'Score',
                    '${widget.stats!['averageQuizScore']?.toStringAsFixed(1) ?? '0'}',
                    Icons.star,
                    Colors.purple,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem(
    String label,
    String value,
    IconData icon,
    Color color,
  ) {
    return Column(
      children: [
        Icon(icon, color: color, size: 24),
        const SizedBox(height: 8),
        Text(
          value,
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        Text(label, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
      ],
    );
  }

  Widget _buildRecentActivity(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Recent Activity',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 15),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(15),
              boxShadow: [
                BoxShadow(
                  color: Colors.grey.withValues(alpha: 0.1),
                  spreadRadius: 1,
                  blurRadius: 10,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: loadingActivities
                ? const Center(
                    child: Padding(
                      padding: EdgeInsets.all(20.0),
                      child: CircularProgressIndicator(),
                    ),
                  )
                : recentActivities.isEmpty
                    ? Padding(
                        padding: const EdgeInsets.all(20.0),
                        child: Text(
                          'No recent activity',
                          style: TextStyle(
                            color: Colors.grey[600],
                            fontSize: 14,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      )
                    : Column(
                        children: [
                          ...recentActivities.asMap().entries.map((entry) {
                            final index = entry.key;
                            final activity = entry.value;
                            final type = activity['type'] as String?;
                            final title = activity['title'] as String? ?? 'Notification';
                            final createdAt = activity['createdAt'];
                            final date = _parseDate(createdAt);
                            final timeAgo = _formatTimeAgo(date);
                            final icon = _getActivityIcon(type);
                            final color = _getActivityColor(type);

                            return Column(
                              children: [
                                if (index > 0) const Divider(),
                                _buildActivityItem(
                                  icon,
                                  color,
                                  title,
                                  timeAgo,
                                ),
                              ],
                            );
                          }),
                        ],
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildActivityItem(
    IconData icon,
    Color color,
    String title,
    String time, {
    String? score,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 15),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                Text(
                  time,
                  style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                ),
              ],
            ),
          ),
          if (score != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                score,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
            ),
        ],
      ),
    );
  }

}
