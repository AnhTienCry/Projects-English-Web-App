import 'dart:async';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';

class PracticePlayer extends StatefulWidget {
  final String? url;
  final String? transcript;

  /// 'never' | 'afterFirstEnd' | 'always'
  final String transcriptMode;

  /// số lần **replay** cho phép (không tính lượt nghe đầu)
  final int maxReplay;

  /// phần trăm audio phải nghe trước khi mở câu hỏi (0.3 = 30%)
  final double gatePercent;
  final VoidCallback? onGateOpen;

  const PracticePlayer({
    super.key,
    this.url,
    this.transcript,
    this.transcriptMode = 'afterFirstEnd',
    this.maxReplay = 2,
    this.gatePercent = 0.3,
    this.onGateOpen,
  });

  @override
  State<PracticePlayer> createState() => _PracticePlayerState();
}

class _PracticePlayerState extends State<PracticePlayer> {
  final AudioPlayer player = AudioPlayer();

  StreamSubscription<Duration>? _durSub;
  StreamSubscription<Duration>? _posSub;
  StreamSubscription<void>? _endSub;

  double rate = 1.0;
  int replay = 0; // số lần phát lại sau lượt đầu
  bool seenEnd = false; // đã nghe hết ít nhất 1 lần
  bool gateOpen = false; // đã mở khoá câu hỏi
  Duration pos = Duration.zero;
  Duration dur = Duration.zero;

  @override
  void initState() {
    super.initState();
    _attachPlayerListeners();
    _loadUrl(initial: true);
  }

  @override
  void didUpdateWidget(covariant PracticePlayer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.url != oldWidget.url) {
      _resetStateForNewUrl();
      _loadUrl();
    }
  }

  void _attachPlayerListeners() {
    _durSub = player.onDurationChanged.listen((d) {
      setState(() => dur = d);
    });

    _posSub = player.onPositionChanged.listen((p) {
      setState(() => pos = p);
      // Gate mở khi vượt ngưỡng %
      if (!gateOpen && dur.inMilliseconds > 0) {
        final fraction = p.inMilliseconds / dur.inMilliseconds;
        if (fraction >= widget.gatePercent) {
          gateOpen = true;
          widget.onGateOpen?.call();
          setState(() {});
        }
      }
    });

    _endSub = player.onPlayerComplete.listen((_) {
      // kết thúc 1 lượt nghe (lượt đầu không tính vào replay)
      seenEnd = true;
      replay += 1;
      // đảm bảo thanh tiến độ full
      pos = dur;
      setState(() {});
    });
  }

  Future<void> _loadUrl({bool initial = false}) async {
    if (widget.url == null || widget.url!.isEmpty) return;

    // 🟢 Kiểm tra URL thật sự
    debugPrint("🎧 Audio URL => ${widget.url}");

    try {
      // ⚡ Dùng setSourceUrl thay cho UrlSource để tránh lỗi Android
      final uri = Uri.parse(widget.url!);
      final fixedUrl = uri.toString();

      await player.setSourceUrl(fixedUrl);

      if (initial) {
        await player.seek(Duration.zero);
        await player.setPlaybackRate(rate);
      }
    } catch (e) {
      debugPrint("❌ Lỗi load audio: $e");
    }
  }

  void _resetStateForNewUrl() {
    replay = 0;
    seenEnd = false;
    gateOpen = false;
    pos = Duration.zero;
    dur = Duration.zero;
    setState(() {});
  }

  Future<void> _handlePlayPressed() async {
    if (widget.url == null || widget.url!.isEmpty) return;

    final atEnd =
        dur.inMilliseconds > 0 && pos.inMilliseconds >= dur.inMilliseconds;

    // Chặn replay vượt quá giới hạn
    if (atEnd && replay >= widget.maxReplay) {
      debugPrint("⛔ Hết lượt replay được phép");
      return;
    }

    await player.setPlaybackRate(rate);

    if (atEnd) {
      // phát lại từ đầu
      await player.seek(Duration.zero);
      await player.resume();
    } else {
      // tiếp tục phát
      await player.resume();
    }
  }

  @override
  void dispose() {
    _durSub?.cancel();
    _posSub?.cancel();
    _endSub?.cancel();
    player.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final atEnd =
        dur.inMilliseconds > 0 && pos.inMilliseconds >= dur.inMilliseconds;
    final noMoreReplay = atEnd && replay >= widget.maxReplay;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: Colors.grey.shade300),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.play_arrow),
                onPressed: noMoreReplay ? null : _handlePlayPressed,
              ),
              IconButton(
                icon: const Icon(Icons.pause),
                onPressed: () => player.pause(),
              ),
              Expanded(
                child: LinearProgressIndicator(
                  value: dur.inMilliseconds == 0
                      ? 0
                      : (pos.inMilliseconds / dur.inMilliseconds).clamp(0, 1),
                  minHeight: 6,
                  backgroundColor: Colors.grey.shade200,
                ),
              ),
              const SizedBox(width: 8),
              DropdownButton<double>(
                value: rate,
                items: const [
                  DropdownMenuItem(value: 0.8, child: Text('0.8×')),
                  DropdownMenuItem(value: 1.0, child: Text('1.0×')),
                  DropdownMenuItem(value: 1.25, child: Text('1.25×')),
                ],
                onChanged: (v) async {
                  if (v == null) return;
                  setState(() => rate = v);
                  await player.setPlaybackRate(v);
                },
              ),
            ],
          ),
          Align(
            alignment: Alignment.centerRight,
            child: Text(
              'Replay: $replay/${widget.maxReplay}',
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ),
          if (widget.transcript != null &&
              (widget.transcriptMode == 'always' ||
                  (widget.transcriptMode == 'afterFirstEnd' && seenEnd)))
            Container(
              width: double.infinity,
              margin: const EdgeInsets.only(top: 8),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                widget.transcript!,
                style: const TextStyle(fontSize: 14),
              ),
            ),
          if (!gateOpen)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                '🔒 Questions unlock after listening ${(widget.gatePercent * 100).round()}% of audio.',
                style: const TextStyle(fontSize: 12, color: Colors.orange),
              ),
            ),
        ],
      ),
    );
  }
}
