import 'package:flutter/material.dart';

import '../../api/practice_api.dart';
import '../../utils/auth_helper.dart';
import 'practice_section_screen.dart';

class MySubmissionsScreen extends StatefulWidget {
  const MySubmissionsScreen({super.key});

  @override
  State<MySubmissionsScreen> createState() => _MySubmissionsScreenState();
}

class _MySubmissionsScreenState extends State<MySubmissionsScreen> {
  bool loading = true;
  List submissions = [];

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    setState(() => loading = true);
    final userId = await AuthHelper.getUserId();
    if (!mounted) return;
    if (userId == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Vui lòng đăng nhập lại')));
      setState(() => loading = false);
      return;
    }

    final res = await PracticeApi.getSubmissions(userId: userId);
    setState(() {
      submissions = res;
      loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return Scaffold(
        appBar: AppBar(title: const Text('📘 Bài đã nộp của tôi')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (submissions.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('📘 Bài đã nộp của tôi')),
        body: const Center(child: Text('Chưa có bài nộp nào.')),
      );
    }

    // ✅ Gom bài nộp theo “Đề”
    final grouped = <String, List<Map>>{};
    for (final s in submissions) {
      final setTitle = (s['setId']?['title'] ?? 'Đề chưa xác định') as String;
      grouped.putIfAbsent(setTitle, () => []).add(s);
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('📘 Bài đã nộp của tôi'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _fetch),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(12),
        children: grouped.entries.map((entry) {
          final setTitle = entry.key;
          final list = entry.value;

          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            elevation: 1,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            child: ExpansionTile(
              tilePadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 8,
              ),
              title: Text(
                setTitle,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              subtitle: Text('Số bài nộp: ${list.length}'),
              children: list.map((s) {
                final skill = (s['skill'] ?? '').toString().toLowerCase();
                final section = s['sectionId'] as Map?;
                final title = section?['title'] ?? '—';
                final date = DateTime.tryParse(s['createdAt'] ?? '');
                final teacherScore = s['teacherScore'];
                final feedback = s['teacherFeedback'];
                final score = s['score'] ?? 0;
                final total = s['total'] ?? 0;

                // ✅ Ẩn điểm hệ thống nếu là writing/speaking
                final showSystemScore =
                    !(skill == 'writing' || skill == 'speaking');

                return ListTile(
                  title: Text(
                    title,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Kỹ năng: ${skill.toUpperCase()}'),
                      if (showSystemScore) Text('Điểm hệ thống: $score/$total'),
                      if (teacherScore != null)
                        Text(
                          'Điểm giáo viên: $teacherScore',
                          style: const TextStyle(
                            color: Colors.blueAccent,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      if (feedback != null && feedback != "")
                        Text(
                          'Nhận xét: $feedback',
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontStyle: FontStyle.italic,
                            color: Colors.black87,
                          ),
                        ),
                      if (date != null)
                        Text(
                          'Ngày nộp: ${date.day}/${date.month}/${date.year} ${date.hour}:${date.minute.toString().padLeft(2, '0')}',
                          style: const TextStyle(
                            color: Colors.black54,
                            fontSize: 13,
                          ),
                        ),
                    ],
                  ),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () {
                    final sectionId = section?['_id'];
                    if (sectionId == null) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Không tìm thấy section cho bài này'),
                        ),
                      );
                      return;
                    }

                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => PracticeSectionScreen(
                          sectionId: sectionId,
                          title: title,
                          skill: skill,
                        ),
                      ),
                    );
                  },
                );
              }).toList(),
            ),
          );
        }).toList(),
      ),
    );
  }
}
