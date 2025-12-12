import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../../api/api_client.dart';
import '../../config/api_config.dart';

class LeaderboardScreen extends StatefulWidget {
  const LeaderboardScreen({super.key});

  @override
  State<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends State<LeaderboardScreen> with SingleTickerProviderStateMixin {
  bool _loading = true;
  String? _error;
  List<dynamic> _items = [];
  Timer? _debounceTimer;
  String? _myUserId;
  io.Socket? _socket;
  late AnimationController _animationController;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _initMyId();
    _fetch();
    _connectSocket();
  }

  Future<void> _initMyId() async {
    final sp = await SharedPreferences.getInstance();
    final ud = sp.getString('userData');
    if (ud != null && ud.isNotEmpty) {
      try {
        final m = ud.startsWith('{') ? jsonDecode(ud) as Map<String, dynamic> : null;
        _myUserId = m?['id']?.toString() ?? m?['_id']?.toString() ?? m?['sub']?.toString();
      } catch (_) {}
    }
  }

  void _connectSocket() async {
    try {
      final sp = await SharedPreferences.getInstance();
      final token = sp.getString('accessToken');
      final url = ApiConfig.baseUrl.replaceFirst(RegExp(r'\/$'), '');
      _socket = io.io(url, <String, dynamic>{
        'transports': ['websocket'],
        'autoConnect': true,
        'auth': {'token': token}
      });
      _socket?.on('connect', (_) => debugPrint('socket connected'));
      _socket?.on('disconnect', (_) => debugPrint('socket disconnected'));
      _socket?.on('leaderboard.update', (data) {
        debugPrint('leaderboard.update event: $data');
        _debounceTimer?.cancel();
        _debounceTimer = Timer(const Duration(milliseconds: 500), () => _fetch());
      });
    } catch (e) {
      debugPrint('socket connect error: $e');
    }
  }

  @override
  void dispose() {
    _socket?.disconnect();
    _debounceTimer?.cancel();
    _animationController.dispose();
    super.dispose();
  }

  Future<void> _fetch() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final sp = await SharedPreferences.getInstance();
      final token = sp.getString('accessToken');
      if (token != null && token.isNotEmpty) {
        dio.options.headers['Authorization'] = 'Bearer $token';
      }

      final resp = await dio.get('${ApiConfig.baseUrl}${ApiConfig.leaderboardEndpoint}');
      final data = resp.data;
      List<dynamic> list = [];
      if (data is List) {
        list = List<dynamic>.from(data);
      } else if (data is Map && data['items'] is List) {
        list = List<dynamic>.from(data['items']);
      } else if (data is Map && data['leaderboard'] is List) {
        list = List<dynamic>.from(data['leaderboard']);
      }

      final normalized = list.map((e) {
        final m = (e is Map) ? Map<String, dynamic>.from(e) : {'nickname': e.toString()};
        m['totalScore'] = m['totalScore'] ?? m['points'] ?? m['score'] ?? 0;
        m['streak'] = m['streak'] ?? 0;
        m['badges'] = m['badges'] ?? m['earnedBadges'] ?? <dynamic>[];
        
        // Handle userId/user object
        if (e is Map && e['userId'] is Map) {
          m['user'] = e['userId'];
          m['userId'] = e['userId']['_id'] ?? e['userId']['id'] ?? e['userId']['_id']?.toString();
        } else if (e is Map && e['user'] is Map) {
          m['user'] = e['user'];
          m['userId'] = e['user']['_id'] ?? e['user']['id'] ?? e['user']['_id']?.toString();
        } else {
          m['userId'] = m['userId'] ?? m['_id'] ?? m['id'];
        }
        
        // Extract nickname from user object or direct field
        final userObj = m['user'] ?? e['userId'];
        if (userObj is Map) {
          m['nickname'] = userObj['nickname'] ?? userObj['name'] ?? '';
          m['avatar'] = userObj['avatar'] ?? userObj['avatarUrl'];
          final roleValue = userObj['role'];
          m['role'] = roleValue?.toString().toUpperCase();
        } else {
          m['nickname'] = m['nickname'] ?? m['name'] ?? 'User';
          m['avatar'] = m['avatar'] ?? m['avatarUrl'];
          final roleValue = m['role'];
          m['role'] = roleValue?.toString().toUpperCase();
        }
        
        // Ensure userId is string
        if (m['userId'] != null) {
          m['userId'] = m['userId'].toString();
        }
        
        return m;
      }).toList();

      final students = normalized.where((m) {
        final userId = (m['userId'] ?? m['_id'] ?? m['id'])?.toString();
        return userId?.isNotEmpty ?? false;
      }).toList();

      students.sort((a, b) {
        final pa = (a['totalScore'] is int) ? a['totalScore'] as int : int.tryParse('${a['totalScore'] ?? 0}') ?? 0;
        final pb = (b['totalScore'] is int) ? b['totalScore'] as int : int.tryParse('${b['totalScore'] ?? 0}') ?? 0;
        if (pb != pa) return pb.compareTo(pa);
        final sa = (a['streak'] is int) ? a['streak'] as int : int.tryParse('${a['streak'] ?? 0}') ?? 0;
        final sb = (b['streak'] is int) ? b['streak'] as int : int.tryParse('${b['streak'] ?? 0}') ?? 0;
        return sb.compareTo(sa);
      });

      if (!mounted) return;
      setState(() {
        _items = students;
      });
      _animationController.forward(from: 0);
    } on DioException catch (e) {
      setState(() => _error = e.response?.data?.toString() ?? e.message);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _onRefresh() async => _fetch();

  Color _getRankColor(int rank) {
    if (rank == 1) return const Color(0xFFFFD700);
    if (rank == 2) return const Color(0xFFC0C0C0);
    if (rank == 3) return const Color(0xFFCD7F32);
    return Colors.grey.shade300;
  }

  /// Build full avatar URL from relative path or full URL
  String? _buildAvatarUrl(String? avatarUrl) {
    if (avatarUrl == null || avatarUrl.isEmpty) {
      return null;
    }

    // If already a full URL (starts with http:// or https://), return as is
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      return avatarUrl;
    }

    // If starts with /uploads, prepend baseUrl
    if (avatarUrl.startsWith('/uploads')) {
      return '${ApiConfig.baseUrl}$avatarUrl';
    }

    // If it's a relative path without leading slash, add /uploads/avatars prefix
    // (assuming backend might return just filename)
    if (!avatarUrl.startsWith('/')) {
      return '${ApiConfig.baseUrl}/uploads/avatars/$avatarUrl';
    }

    // Default: prepend baseUrl
    return '${ApiConfig.baseUrl}$avatarUrl';
  }

  Widget _buildTopThree() {
    if (_items.length < 3) {
      return const SizedBox.shrink();
    }

    final top1 = _items.isNotEmpty ? _items[0] : null;
    final top2 = _items.length > 1 ? _items[1] : null;
    final top3 = _items.length > 2 ? _items[2] : null;

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.purple.shade600,
            Colors.purple.shade800,
            Colors.deepPurple.shade900,
          ],
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.purple.withValues(alpha: 0.4),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        children: [
          Text(
            '🏆 TOP 3 🏆',
            style: GoogleFonts.poppins(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: Colors.white,
              letterSpacing: 2,
            ),
          ),
          const SizedBox(height: 24),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (top2 != null) _buildPodiumCard(top2, 2, 140),
              const SizedBox(width: 12),
              if (top1 != null) _buildPodiumCard(top1, 1, 160),
              const SizedBox(width: 12),
              if (top3 != null) _buildPodiumCard(top3, 3, 120),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPodiumCard(dynamic user, int rank, double height) {
    final name = user['nickname']?.toString() ?? 'User';
    final score = user['totalScore'] is int ? user['totalScore'] as int : int.tryParse('${user['totalScore'] ?? 0}') ?? 0;
    final avatarUrl = _buildAvatarUrl(user['avatar']?.toString());

    return Column(
      children: [
        Stack(
          clipBehavior: Clip.none,
          children: [
            Container(
              width: 70,
              height: 70,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: [_getRankColor(rank), _getRankColor(rank).withValues(alpha: 0.6)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                border: Border.all(color: Colors.white, width: 3),
                boxShadow: [
                  BoxShadow(
                    color: _getRankColor(rank).withValues(alpha: 0.5),
                    blurRadius: 12,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: CircleAvatar(
                radius: 32,
                backgroundColor: Colors.purple.shade100,
                backgroundImage: (avatarUrl != null && avatarUrl.isNotEmpty) ? NetworkImage(avatarUrl) : null,
                child: (avatarUrl == null || avatarUrl.isEmpty)
                    ? Text(
                  name.isNotEmpty ? name[0].toUpperCase() : 'U',
                  style: GoogleFonts.poppins(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 24,
                  ),
                )
                    : null,
              ),
            ),
            Positioned(
              bottom: -8,
              left: 0,
              right: 0,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: _getRankColor(rank),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white, width: 2),
                ),
                child: Text(
                  rank == 1 ? '👑' : rank == 2 ? '🥈' : '🥉',
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 16),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Container(
          width: 90,
          height: height,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.95),
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(16),
              topRight: Radius.circular(16),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.1),
                blurRadius: 8,
              ),
            ],
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.start,
            children: [
              Text(
                name,
                style: GoogleFonts.poppins(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: Colors.black87,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Colors.amber.shade400, Colors.orange.shade600],
                  ),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.star, size: 12, color: Colors.white),
                    const SizedBox(width: 4),
                    Text(
                      '$score',
                      style: GoogleFonts.poppins(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildBadgeWidget(dynamic b) {
    if (b == null) return const SizedBox.shrink();
    if (b is Map && (b['icon'] != null && b['icon'].toString().isNotEmpty)) {
      final badgeIconUrl = _buildAvatarUrl(b['icon']?.toString());
      return Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          gradient: LinearGradient(
            colors: [Colors.purple.shade300, Colors.purple.shade600],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.purple.withValues(alpha: 0.3),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: badgeIconUrl != null
              ? Image.network(
                  badgeIconUrl,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Center(
                    child: Text(
                      (b['name'] ?? 'B')[0],
                      style: GoogleFonts.poppins(
                        fontSize: 14,
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                )
              : Center(
                  child: Text(
                    (b['name'] ?? 'B')[0],
                    style: GoogleFonts.poppins(
                      fontSize: 14,
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
        ),
      );
    }
    final name = (b is Map ? b['name'] ?? b['title'] : b.toString()) ?? '';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.purple.shade400, Colors.deepPurple.shade600],
        ),
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.purple.withValues(alpha: 0.3),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Text(
        name.toString(),
        style: GoogleFonts.poppins(
          fontSize: 10,
          color: Colors.white,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        elevation: 0,
        flexibleSpace: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [Colors.purple.shade600, Colors.deepPurple.shade800],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
        ),
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('🏆', style: TextStyle(fontSize: 24)),
            const SizedBox(width: 8),
            Text(
              'Bảng Xếp Hạng',
              style: GoogleFonts.poppins(
                fontWeight: FontWeight.w700,
                fontSize: 20,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
        centerTitle: true,
      ),
      body: _loading
          ? Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(Colors.purple.shade600),
            ),
            const SizedBox(height: 16),
            Text(
              'Đang tải bảng xếp hạng...',
              style: GoogleFonts.poppins(color: Colors.grey.shade600),
            ),
          ],
        ),
      )
          : _error != null
          ? Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: Colors.red.shade300),
            const SizedBox(height: 16),
            Text(_error!, style: GoogleFonts.poppins(color: Colors.red)),
          ],
        ),
      )
          : _items.isEmpty
          ? Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.leaderboard_outlined, size: 64, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            Text(
              'Chưa có dữ liệu bảng xếp hạng',
              style: GoogleFonts.poppins(
                fontSize: 16,
                color: Colors.grey.shade600,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Hãy bắt đầu học để xuất hiện trên bảng xếp hạng!',
              style: GoogleFonts.poppins(
                fontSize: 14,
                color: Colors.grey.shade500,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _onRefresh,
              icon: const Icon(Icons.refresh),
              label: const Text('Tải lại'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.purple.shade600,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              ),
            ),
          ],
        ),
      )
          : RefreshIndicator(
        onRefresh: _onRefresh,
        color: Colors.purple.shade600,
        child: ListView.builder(
          padding: const EdgeInsets.only(bottom: 20),
          itemCount: _items.length + 1,
          itemBuilder: (context, index) {
            if (index == 0) {
              return _buildTopThree();
            }

            final actualIndex = index - 1;
            if (actualIndex < 3) return const SizedBox.shrink();

            final u = _items[actualIndex];
            final rankPos = actualIndex + 1;
            final name = u['nickname']?.toString() ?? 'User';
            final score = u['totalScore'] is int ? u['totalScore'] as int : int.tryParse('${u['totalScore'] ?? 0}') ?? 0;
            final badges = (u['badges'] is List) ? List<dynamic>.from(u['badges']) : <dynamic>[];
            final isMe = _myUserId != null && _myUserId == (u['userId']?.toString() ?? u['_id']?.toString());
            final avatarUrl = _buildAvatarUrl(u['avatar']?.toString());

            return AnimatedBuilder(
              animation: _animationController,
              builder: (context, child) {
                final slideAnimation = Tween<Offset>(
                  begin: const Offset(1, 0),
                  end: Offset.zero,
                ).animate(CurvedAnimation(
                  parent: _animationController,
                  curve: Interval(
                    (actualIndex * 0.1).clamp(0.0, 1.0),
                    ((actualIndex * 0.1) + 0.3).clamp(0.0, 1.0),
                    curve: Curves.easeOut,
                  ),
                ));

                return SlideTransition(
                  position: slideAnimation,
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    decoration: BoxDecoration(
                      gradient: isMe
                          ? LinearGradient(
                        colors: [Colors.purple.shade100, Colors.purple.shade50],
                      )
                          : null,
                      color: isMe ? null : Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: isMe
                          ? Border.all(color: Colors.purple.shade400, width: 2)
                          : null,
                      boxShadow: [
                        BoxShadow(
                          color: isMe
                              ? Colors.purple.withValues(alpha: 0.2)
                              : Colors.black.withValues(alpha: 0.05),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: LinearGradient(
                              colors: isMe
                                  ? [Colors.purple.shade400, Colors.purple.shade600]
                                  : [Colors.grey.shade300, Colors.grey.shade400],
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: (isMe ? Colors.purple : Colors.grey).withValues(alpha: 0.3),
                                blurRadius: 6,
                              ),
                            ],
                          ),
                          child: Center(
                            child: Text(
                              '#$rankPos',
                              style: GoogleFonts.poppins(
                                color: Colors.white,
                                fontSize: 14,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Container(
                          width: 52,
                          height: 52,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: isMe ? Colors.purple.shade400 : Colors.grey.shade300,
                              width: 2,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.1),
                                blurRadius: 4,
                              ),
                            ],
                          ),
                          child: CircleAvatar(
                            radius: 24,
                            backgroundColor: Colors.purple.shade100,
                            backgroundImage: (avatarUrl != null && avatarUrl.isNotEmpty)
                                ? NetworkImage(avatarUrl)
                                : null,
                            child: (avatarUrl == null || avatarUrl.isEmpty)
                                ? Text(
                              name.isNotEmpty ? name[0].toUpperCase() : 'U',
                              style: GoogleFonts.poppins(
                                color: Colors.white,
                                fontWeight: FontWeight.w700,
                                fontSize: 18,
                              ),
                            )
                                : null,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                name,
                                style: GoogleFonts.poppins(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.black87,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  if (u['currentLevel'] != null)
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        gradient: LinearGradient(
                                          colors: [Colors.blue.shade400, Colors.blue.shade600],
                                        ),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        'Lv ${u['currentLevel']}',
                                        style: GoogleFonts.poppins(
                                          fontSize: 10,
                                          color: Colors.white,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                  if (u['currentLevel'] != null && u['streak'] != null)
                                    const SizedBox(width: 6),
                                  if (u['streak'] != null)
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        gradient: LinearGradient(
                                          colors: [Colors.orange.shade400, Colors.deepOrange.shade600],
                                        ),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        '🔥 ${u['streak']}',
                                        style: GoogleFonts.poppins(
                                          fontSize: 10,
                                          color: Colors.white,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                              if (badges.isNotEmpty) ...[
                                const SizedBox(height: 6),
                                SizedBox(
                                  height: 32,
                                  child: ListView.separated(
                                    scrollDirection: Axis.horizontal,
                                    itemCount: badges.length > 4 ? 4 : badges.length,
                                    separatorBuilder: (_, __) => const SizedBox(width: 4),
                                    itemBuilder: (_, bi) => _buildBadgeWidget(badges[bi]),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [Colors.amber.shade400, Colors.orange.shade600],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.orange.withValues(alpha: 0.3),
                                blurRadius: 6,
                              ),
                            ],
                          ),
                          child: Column(
                            children: [
                              const Icon(Icons.star, size: 18, color: Colors.white),
                              const SizedBox(height: 2),
                              Text(
                                '$score',
                                style: GoogleFonts.poppins(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}