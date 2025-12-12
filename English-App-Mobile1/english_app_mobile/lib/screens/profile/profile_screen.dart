import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../api/api_client.dart';
import '../../config/network_config.dart';
import '../../config/api_config.dart';
import '../../providers/theme_provider.dart';
import '../../utils/progress_store.dart';
import './edit_profile_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Map<String, dynamic>? userProfile;
  Map<String, dynamic>? rankData;
  Map<String, dynamic>? progressionData;
  List<DateTime> activityDates = []; // Danh sách ngày đã học
  bool loading = true;
  String? error;
  
  // Overall progress (tính từ normal + rank lessons)
  double overallProgressPercent = 0.0;
  int completedLessonsCount = 0;
  int totalLessonsCount = 0;

  @override
  void initState() {
    super.initState();
    fetchUserProfile();
  }

  Future<void> fetchUserProfile() async {
    setState(() {
      loading = true;
      error = null;
    });

    try {
      // Lấy profile
      final profileRes = await dio.get('/api/protected/me');

      // Lấy rank data (XP)
      Map<String, dynamic>? rank;
      try {
        final rankRes = await dio.get('/api/ranks/me');
        rank = rankRes.data;
      } catch (e) {
        rank = null; // Rank chưa khởi tạo
      }

      // Lấy progression data (streak, progress %)
      Map<String, dynamic>? progression;
      try {
        final progressRes = await dio.get('/api/progressions/me');
        progression = progressRes.data;
      } catch (e) {
        progression = null; // Progression chưa khởi tạo
      }

      // Lấy activity history (ngày đã học)
      List<DateTime> activities = [];
      try {
        final now = DateTime.now();
        final activityRes = await dio.get(
          '/api/progressions/activity-history',
          queryParameters: {'year': now.year, 'month': now.month},
        );

        if (activityRes.data['history'] != null) {
          activities = (activityRes.data['history'] as List)
              .map((item) => DateTime.parse(item['date']))
              .toList();
        }
      } catch (e) {
        activities = []; // Không có activity history
      }

      // Tính overall progress từ normal + rank lessons (giống Progress screen)
      // Load lessons từ API để có dữ liệu mới nhất
      try {
        final responses = await Future.wait([
          dio.get("/api/lessons/progress/me"),
          dio.get(ApiConfig.quizRankLessonsEndpoint),
        ]);
        
        final lessonsData = responses[0].data;
        final rankLessonsData = responses[1].data;
        
        // Xử lý normal lessons
        List<dynamic> normalLessons = [];
        if (lessonsData is Map && lessonsData['items'] is List) {
          normalLessons = List.from(lessonsData['items']);
        }
        
        // Xử lý rank lessons
        List<dynamic> rankLessons = [];
        if (rankLessonsData is List) {
          rankLessons = List.from(rankLessonsData);
        }
        
        // Load cache để merge
        final normalPercent = await ProgressStore.loadPercent();
        final normalCompleted = await ProgressStore.loadCompleted();
        final rankPercent = await ProgressStore.loadRankPercent();
        final rankCompleted = await ProgressStore.loadRankCompleted();
        
        // Merge và tính overall progress (giống Progress screen)
        final allLessons = [...normalLessons, ...rankLessons];
        if (allLessons.isNotEmpty) {
          // Merge progress cho normal lessons
          final completedFromServer = <String>{};
          if (lessonsData is Map && lessonsData['progress'] is Map &&
              lessonsData['progress']['completedLessons'] is List) {
            for (final id in lessonsData['progress']['completedLessons']) {
              completedFromServer.add(id.toString());
            }
          }
          
          int totalPercent = 0;
          int completedCount = 0;
          
          for (final lesson in allLessons) {
            final id = (lesson['id'] ?? lesson['_id'] ?? '').toString();
            final isNormal = normalLessons.any((l) => (l['id'] ?? l['_id'] ?? '').toString() == id);
            
            // Lấy percent và completed (giống Progress screen)
            int percent = 0;
            bool completed = false;
            
            if (isNormal) {
              // Normal lesson: ưu tiên server, fallback cache
              completed = completedFromServer.contains(id) || 
                         (lesson['isCompleted'] == true) || 
                         (normalCompleted[id] ?? false);
              
              final p = lesson['percent'];
              if (p is int) {
                percent = p;
              } else if (p is String) {
                percent = int.tryParse(p) ?? 0;
              } else {
                percent = normalPercent[id] ?? 0;
              }
              if (percent <= 0 && completed) percent = 100;
            } else {
              // Rank lesson: ưu tiên cache
              completed = rankCompleted[id] ?? (lesson['isCompleted'] == true);
              percent = rankPercent[id] ?? 0;
              if (percent <= 0 && completed) percent = 100;
            }
            
            if (completed) completedCount++;
            totalPercent += percent.clamp(0, 100);
          }
          
          final calculatedPercent = totalPercent / allLessons.length;
          final totalCount = allLessons.length;
          
          setState(() {
            userProfile = profileRes.data;
            rankData = rank;
            progressionData = progression;
            activityDates = activities;
            overallProgressPercent = calculatedPercent;
            completedLessonsCount = completedCount;
            totalLessonsCount = totalCount;
            loading = false;
          });
        } else {
          // Nếu không có lessons, tính từ cache
          final overallProgress = await ProgressStore.calculateOverallProgress();
          setState(() {
            userProfile = profileRes.data;
            rankData = rank;
            progressionData = progression;
            activityDates = activities;
            overallProgressPercent = overallProgress['percent'] as double;
            completedLessonsCount = overallProgress['completedCount'] as int;
            totalLessonsCount = overallProgress['totalCount'] as int;
            loading = false;
          });
        }
      } catch (e) {
        // Nếu lỗi, tính từ cache
        final overallProgress = await ProgressStore.calculateOverallProgress();
        setState(() {
          userProfile = profileRes.data;
          rankData = rank;
          progressionData = progression;
          activityDates = activities;
          overallProgressPercent = overallProgress['percent'] as double;
          completedLessonsCount = overallProgress['completedCount'] as int;
          totalLessonsCount = overallProgress['totalCount'] as int;
          loading = false;
        });
      }

      debugPrint('👤 Profile loaded:');
      debugPrint('   Nickname: ${profileRes.data['nickname']}');
      debugPrint('   Has avatar: ${profileRes.data['avatarUrl'] != null}');
      if (profileRes.data['avatarUrl'] != null) {
        debugPrint(
          '   Avatar preview: ${profileRes.data['avatarUrl'].toString().substring(0, 50)}...',
        );
      }
    } catch (e) {
      setState(() {
        error = 'Failed to load profile';
        loading = false;
      });
    }
  }

  Future<void> _navigateToEditProfile() async {
    if (userProfile == null) return;

    if (Navigator.canPop(context)) {
      Navigator.pop(context);
    }

    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => EditProfileScreen(currentProfile: userProfile!),
      ),
    );

    // Always refresh profile after edit, regardless of result
    debugPrint('🔄 Refreshing profile after edit...');
    await fetchUserProfile();
  }

  Future<void> _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    if (!mounted) return;
    Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
  }

  void _showLogoutDialog() {
    Navigator.pop(context); // Đóng bottom sheet

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Đăng xuất'),
        content: const Text('Bạn có chắc chắn muốn đăng xuất không?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Hủy'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);

              _logout();
            },
            child: const Text('Đăng xuất'),
          ),
        ],
      ),
    );
  }

  void _showAboutDialog() {
    Navigator.pop(context); // Đóng bottom sheet

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Về ứng dụng'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Version: 1.0.0'),
            SizedBox(height: 8),
            Text('Một ứng dụng học tập tuyệt vời được xây dựng bằng Flutter.'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Đóng'),
          ),
        ],
      ),
    );
  }

  void _showSettingsMenu() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Wrap(
          children: [
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Text(
                'Cài đặt',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey[800],
                ),
              ),
            ),
            ListTile(
              leading: const Icon(Icons.edit, color: Colors.blue),
              title: const Text('Sửa hồ sơ'),
              trailing: const Icon(Icons.chevron_right, color: Colors.grey),
              onTap: _navigateToEditProfile,
            ),
            ListTile(
              leading: const Icon(Icons.notifications, color: Colors.orange),
              title: const Text('Thông báo'),
              trailing: const Icon(Icons.chevron_right, color: Colors.grey),
              onTap: () {
                Navigator.pop(context);
                Navigator.pushNamed(context, '/notifications');
              },
            ),
            Consumer<ThemeProvider>(
              builder: (context, themeProvider, _) {
                return SwitchListTile(
                  secondary: Icon(
                    themeProvider.isDarkMode ? Icons.dark_mode : Icons.light_mode,
                    color: themeProvider.isDarkMode ? Colors.amber : Colors.blue,
                  ),
                  title: const Text('Chế độ tối'),
                  subtitle: Text(
                    themeProvider.isDarkMode ? 'Đang bật' : 'Đang tắt',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                    ),
                  ),
                  value: themeProvider.isDarkMode,
                  onChanged: (value) {
                    themeProvider.toggleTheme();
                  },
                );
              },
            ),
            ListTile(
              leading: const Icon(Icons.help, color: Colors.purple),
              title: const Text('Trợ giúp & Hỗ trợ'),
              trailing: const Icon(Icons.chevron_right, color: Colors.grey),
              onTap: () {
                Navigator.pop(context);
                _showHelpDialog();
              },
            ),
            ListTile(
              leading: const Icon(Icons.info, color: Colors.teal),
              title: const Text('Về ứng dụng'),
              trailing: const Icon(Icons.chevron_right, color: Colors.grey),
              onTap: _showAboutDialog,
            ),
            const Divider(height: 1, indent: 16, endIndent: 16),
            ListTile(
              leading: Icon(Icons.logout, color: Colors.red[700]),
              title: Text(
                'Đăng xuất',
                style: TextStyle(color: Colors.red[700]),
              ),
              onTap: _showLogoutDialog,
            ),
            const SizedBox(height: 16),
          ],
        );
      },
    );
  }


  void _showHelpDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Trợ giúp & Hỗ trợ'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Cần hỗ trợ?',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              _buildHelpItem(Icons.email, 'Email', 'support@englishapp.com'),
              const SizedBox(height: 12),
              _buildHelpItem(Icons.phone, 'Hotline', '1900 1234'),
              const SizedBox(height: 12),
              _buildHelpItem(Icons.chat, 'Live Chat', 'Chat trực tuyến'),
              const SizedBox(height: 16),
              const Divider(),
              const SizedBox(height: 16),
              const Text(
                'Câu hỏi thường gặp',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              ExpansionTile(
                title: const Text('Làm sao để reset password?'),
                children: const [
                  Padding(
                    padding: EdgeInsets.all(16.0),
                    child: Text(
                      'Bạn có thể reset password bằng cách nhấn "Quên mật khẩu" tại màn hình đăng nhập.',
                    ),
                  ),
                ],
              ),
              ExpansionTile(
                title: const Text('Làm sao để liên hệ giáo viên?'),
                children: const [
                  Padding(
                    padding: EdgeInsets.all(16.0),
                    child: Text(
                      'Bạn có thể liên hệ giáo viên qua tính năng chat trong ứng dụng.',
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Đóng'),
          ),
        ],
      ),
    );
  }

  Widget _buildHelpItem(IconData icon, String title, String subtitle) {
    return Row(
      children: [
        Icon(icon, color: Colors.blue),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w500)),
              Text(
                subtitle,
                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
              ),
            ],
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : error != null
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.error_outline, size: 64, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  Text(error!, style: const TextStyle(color: Colors.red)),
                  const SizedBox(height: 20),
                  ElevatedButton(
                    onPressed: fetchUserProfile,
                    child: const Text('Thử lại'),
                  ),
                ],
              ),
            )
          : RefreshIndicator(
              onRefresh: fetchUserProfile,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: Column(
                  children: [
                    _buildProfileHeader(),
                    Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        children: [
                          _buildStatsGrid(),
                          const SizedBox(height: 16),
                          _buildCalendarView(),
                          const SizedBox(height: 16),
                          _buildStreakInfo(),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildProfileHeader() {
    final nickname = userProfile?['nickname'] ?? 'Người dùng';
    final avatarUrl = userProfile?['avatarUrl'];
    final initial = nickname.isNotEmpty ? nickname[0].toUpperCase() : 'A';

    // Build full avatar URL
    String? fullAvatarUrl;
    if (avatarUrl != null &&
        avatarUrl.isNotEmpty &&
        !avatarUrl.startsWith('data:')) {
      if (avatarUrl.startsWith('http')) {
        fullAvatarUrl = avatarUrl; // External URL
      } else if (avatarUrl.startsWith('/uploads')) {
        fullAvatarUrl = '${NetworkConfig.baseUrl}$avatarUrl'; // Local file
      }
    }

    // 🧩 Thêm dòng này để ép Flutter tải lại ảnh mới khi URL không đổi
    if (fullAvatarUrl != null) {
      fullAvatarUrl = '$fullAvatarUrl?${DateTime.now().millisecondsSinceEpoch}';
    }

    return Container(
      padding: const EdgeInsets.only(top: 20, bottom: 20, left: 20, right: 20),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.blue, Colors.purple],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                IconButton(
                  icon: const Icon(Icons.settings, color: Colors.white70),
                  onPressed: _showSettingsMenu,
                ),
              ],
            ),
            CircleAvatar(
              key: ValueKey(fullAvatarUrl ?? 'default'),
              radius: 40,
              backgroundColor: Colors.white,
              backgroundImage: fullAvatarUrl != null
                  ? NetworkImage(fullAvatarUrl) as ImageProvider
                  : null,
              child: fullAvatarUrl == null
                  ? Text(
                      initial,
                      style: const TextStyle(
                        fontSize: 40,
                        fontWeight: FontWeight.bold,
                        color: Colors.blue,
                      ),
                    )
                  : null,
            ),
            const SizedBox(height: 12),
            Text(
              nickname,
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsGrid() {
    // XP từ rank points
    final xp = rankData?['points'] ?? 0;

    // Streak từ progression
    final streak = progressionData?['streak'] ?? 0;

    // Learning Score (%) - dùng overall progress đã tính (giống Progress screen)
    // Thay vì dùng progressionData['progressPercentage'], dùng overallProgressPercent
    final progressPercent = overallProgressPercent.round();

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            Expanded(
              child: _buildGridItem(
                Icons.bolt,
                '$xp',
                'XP',
                iconColor: Colors.blue,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildGridItem(
                Icons.local_fire_department,
                '$streak',
                'Ngày liên tục',
                iconColor: Colors.orange,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildGridItem(
                Icons.bar_chart,
                '$progressPercent%',
                'Kết quả học tập',
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGridItem(
    IconData icon,
    String value,
    String title, {
    Color iconColor = Colors.grey,
    bool isHighlighted = false,
  }) {
    final color = isHighlighted ? Colors.blue : iconColor;
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: isHighlighted
          ? BoxDecoration(
              color: Colors.blue.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.blue),
            )
          : null,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: color),
              const SizedBox(width: 4),
              Text(
                value,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: isHighlighted ? Colors.blue : Colors.black87,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            title,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12,
              color: isHighlighted ? Colors.blue : Colors.black54,
              fontWeight: FontWeight.w500,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildCalendarView() {
    final List<String> daysOfWeek = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    // Logic lấy ngày tháng hiện tại
    final now = DateTime.now();
    final today = now.day;
    final currentMonth = now.month;
    final currentYear = now.year;

    // Lấy ngày đầu tiên của tháng và ngày trong tuần của nó
    final firstDayOfMonth = DateTime(currentYear, currentMonth, 1);
    // .weekday: T2=1, T3=2, ..., CN=7
    // Ta cần: CN=0, T2=1, ..., T7=6
    final firstDayIndex = firstDayOfMonth.weekday % 7;

    // Lấy số ngày trong tháng
    final daysInMonth = DateTime(currentYear, currentMonth + 1, 0).day;

    // Tạo danh sách các ngày để hiển thị
    final List<String> calendarDays = [];
    // Thêm các ô trống cho các ngày trước ngày 1
    for (int i = 0; i < firstDayIndex; i++) {
      calendarDays.add('');
    }
    // Thêm các ngày trong tháng
    for (int i = 1; i <= daysInMonth; i++) {
      calendarDays.add(i.toString());
    }
    // Thêm các ô trống ở cuối (nếu cần)
    while (calendarDays.length % 7 != 0) {
      calendarDays.add('');
    }

    // Tên tháng (cách đơn giản)
    final monthTitle = 'Tháng ${now.month} ${now.year}';

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  icon: const Icon(Icons.chevron_left),
                  onPressed: null, // Vô hiệu hóa
                ),
                Text(
                  monthTitle,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.chevron_right),
                  onPressed: null, // Vô hiệu hóa
                ),
              ],
            ),
            const SizedBox(height: 12),
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 7,
              ),
              itemCount: daysOfWeek.length,
              itemBuilder: (context, index) {
                return Center(
                  child: Text(
                    daysOfWeek[index],
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Colors.black54,
                    ),
                  ),
                );
              },
            ),
            const Divider(height: 16),
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 7,
              ),
              itemCount: calendarDays.length,
              itemBuilder: (context, index) {
                final day = calendarDays[index];
                if (day.isEmpty) return const SizedBox.shrink();

                // Kiểm tra xem có phải ngày hôm nay không
                final isToday = (day == today.toString());

                // Kiểm tra xem ngày này có activity không
                final dayDate = DateTime(
                  currentYear,
                  currentMonth,
                  int.parse(day),
                );
                final hasActivity = activityDates.any(
                  (activityDate) =>
                      activityDate.year == dayDate.year &&
                      activityDate.month == dayDate.month &&
                      activityDate.day == dayDate.day,
                );

                return Center(
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      Container(
                        width: 32,
                        height: 32,
                        decoration: isToday
                            ? BoxDecoration(
                                color: Colors.blue[300], // Màu tô đậm ngày hôm nay
                                shape: BoxShape.circle,
                              )
                            : (hasActivity
                                  ? BoxDecoration(
                                      color: Colors.blue.withValues(alpha: 
                                        0.2,
                                      ), // Màu cho ngày đã học
                                      shape: BoxShape.circle,
                                      border: Border.all(
                                        color: Colors.blue,
                                        width: 2,
                                      ),
                                    )
                                  : null),
                        child: Center(
                          child: Text(
                            day,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: isToday || hasActivity
                                  ? FontWeight.bold
                                  : FontWeight.normal,
                              color: isToday
                                  ? Colors.white
                                  : (hasActivity ? Colors.blue : Colors.black54),
                            ),
                          ),
                        ),
                      ),
                      // Thêm dot phía trên số nếu có activity
                      if (hasActivity && !isToday)
                        Positioned(
                          top: 2,
                          child: Container(
                            width: 6,
                            height: 6,
                            decoration: BoxDecoration(
                              color: Colors.green, // Màu dot
                              shape: BoxShape.circle,
                            ),
                          ),
                        ),
                    ],
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStreakInfo() {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            const Icon(
              Icons.local_fire_department,
              color: Colors.blue,
              size: 36,
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Ngày liên tục',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Học mỗi ngày để duy trì chuỗi ngày học của bạn.',
                    style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
