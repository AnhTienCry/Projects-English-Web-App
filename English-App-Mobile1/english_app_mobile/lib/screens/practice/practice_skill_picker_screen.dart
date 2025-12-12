// lib/screens/practice/practice_skill_picker_screen.dart
import 'package:flutter/material.dart';

import '../../api/practice_api.dart';
import 'practice_section_screen.dart';

class PracticeSkillPickerScreen extends StatefulWidget {
  final Map setData; // nhận từ PracticeSetListScreen: s
  const PracticeSkillPickerScreen({super.key, required this.setData});

  @override
  State<PracticeSkillPickerScreen> createState() =>
      _PracticeSkillPickerScreenState();
}

class _PracticeSkillPickerScreenState extends State<PracticeSkillPickerScreen> {
  String? _loadingSkill; // 'listening' | 'reading' | 'writing' | 'speaking'

  Future<void> _openSkill(String skill) async {
    if (_loadingSkill != null) return;
    setState(() => _loadingSkill = skill);

    try {
      final setId = widget.setData['_id'] as String;
      // Backend đã hỗ trợ filter theo skill
      final sections = await PracticeApi.fetchSections(setId, skill: skill);
      final List list = (sections as List?) ?? [];

      if (list.isEmpty) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Chưa có section cho kỹ năng $skill')),
        );
        return;
      }

      // Mỗi set chỉ có 1 section/skill → lấy phần tử đầu
      final Map sec = list.first as Map;

      if (!mounted) return;
      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => PracticeSectionScreen(
            sectionId: sec['_id'] as String,
            title: (sec['title'] ?? skill) as String,
            skill: skill,
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Lỗi tải section: $e')));
    } finally {
      if (mounted) setState(() => _loadingSkill = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final setTitle = (widget.setData['title'] ?? 'Practice') as String;

    final skills = [
      (
        'listening',
        'Listening',
        Icons.headset_mic,
        Colors.blue,
      ),
      (
        'reading',
        'Reading',
        Icons.menu_book,
        Colors.green,
      ),
      (
        'writing',
        'Writing',
        Icons.edit,
        Colors.orange,
      ),
      (
        'speaking',
        'Speaking',
        Icons.record_voice_over,
        Colors.purple,
      ),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text(setTitle),
        elevation: 0,
      ),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: skills.length,
        separatorBuilder: (_, __) => const SizedBox(height: 16),
        itemBuilder: (_, i) {
          final (id, title, icon, color) = skills[i];
          final loading = _loadingSkill == id;

          return Card(
            elevation: 2,
            shadowColor: Colors.black.withValues(alpha: 0.1),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            child: InkWell(
              onTap: () => _openSkill(id),
              borderRadius: BorderRadius.circular(16),
              child: Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  gradient: LinearGradient(
                    colors: [
                      color.shade50,
                      Colors.white,
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(
                        color: color.shade100,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(
                        icon,
                        color: color.shade700,
                        size: 26,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Text(
                        title,
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: Colors.black87,
                        ),
                      ),
                    ),
                    if (loading)
                      SizedBox(
                        height: 24,
                        width: 24,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          valueColor: AlwaysStoppedAnimation<Color>(color),
                        ),
                      )
                    else
                      Icon(
                        Icons.chevron_right,
                        color: Colors.grey.shade400,
                        size: 28,
                      ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
