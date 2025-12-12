String _norm(String s) =>
    s.trim().toLowerCase().replaceAll(RegExp(r'''[.,!?;:'"]'''), '');

bool gradeItem(Map item, dynamic payload) {
  final type = item['type'];
  switch (type) {
    case 'mcq':
    case 'heading':
      // payload là text option đã chọn
      final List ans = (item['answers'] ?? []) as List;
      final List options = (item['options'] ?? []) as List;
      if (ans.isEmpty) return false;
      
      // Convert answers từ chữ cái (A, B, C, D) sang text của option
      final correctAnswers = ans.map((a) {
        final aStr = a.toString().trim().toLowerCase();
        // Nếu answer là chữ cái đơn (a, b, c, d), convert thành option text
        if (RegExp(r'^[a-d]$').hasMatch(aStr) && options.isNotEmpty) {
          final index = aStr.codeUnitAt(0) - 'a'.codeUnitAt(0);
          if (index >= 0 && index < options.length) {
            return options[index].toString();
          }
        }
        // Nếu không phải chữ cái, giữ nguyên (đã là text)
        return a.toString();
      }).toList();
      
      // So sánh payload với các đáp án đúng
      return correctAnswers.any((correct) => correct.toString() == payload.toString());

    case 'truefalse':
    case 'yesno_ng':
      return (item['answerBool'] ?? '') ==
          payload; // 'true'|'false'|'not_given'

    case 'gap':
      final List list = (item['answers'] ?? item['gapAnswers'] ?? []) as List;
      final bool strict = (item['strict'] ?? false) as bool;
      final String p = _norm(payload?.toString() ?? '');
      return list.any((a) {
        final normA = _norm(a.toString());
        return strict ? normA == p : (normA == p || normA.contains(p));
      });

    case 'matching':
      // payload: List<List<String>> [[L,R],...]
      final expected = Set<String>.from(
        ((item['pairs'] ?? []) as List).map(
          (p) => "${p['left'] ?? p['leftId']}:::${p['right'] ?? p['rightId']}",
        ),
      );
      final got = Set<String>.from(
        ((payload ?? []) as List).map((p) => "${p[0]}:::${p[1]}"),
      );
      if (expected.length != got.length) return false;
      for (final x in expected) {
        if (!got.contains(x)) return false;
      }
      return true;

    default:
      return false;
  }
}
