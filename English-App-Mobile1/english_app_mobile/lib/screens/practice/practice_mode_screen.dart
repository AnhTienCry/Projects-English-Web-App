import 'package:flutter/material.dart';

import 'my_submissions_screen.dart'; // ✅ Thêm import
import 'practice_set_list_screen.dart';

class PracticeModeScreen extends StatelessWidget {
  const PracticeModeScreen({super.key});

  Widget _modeCard(
    BuildContext context, {
    required String label,
    required String examType, // 'ielts' | 'toeic'
    required Color color,
    required IconData icon,
  }) {
    return InkWell(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => PracticeSetListScreen(examType: examType),
          ),
        );
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [color.withValues(alpha: .85), color],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: color.withValues(alpha: .25),
              blurRadius: 16,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Row(
          children: [
            Icon(icon, color: Colors.white, size: 36),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                label,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  letterSpacing: .2,
                ),
              ),
            ),
            const Icon(Icons.chevron_right, color: Colors.white, size: 28),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Practice'), centerTitle: false),
      body: Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Choose your exam',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 16),
            _modeCard(
              context,
              label: 'IELTS',
              examType: 'ielts',
              color: Colors.deepPurple,
              icon: Icons.school,
            ),
            const SizedBox(height: 16),
            _modeCard(
              context,
              label: 'TOEIC',
              examType: 'toeic',
              color: Colors.teal,
              icon: Icons.auto_awesome,
            ),
            const SizedBox(height: 24),
            const Divider(),
            const SizedBox(height: 8),

            // ✅ Nút "Xem bài đã nộp của tôi"
            Center(
              child: TextButton.icon(
                icon: const Icon(Icons.assignment_turned_in_outlined),
                label: const Text(
                  "Xem bài đã nộp của tôi",
                  style: TextStyle(fontSize: 16),
                ),
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const MySubmissionsScreen(),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
