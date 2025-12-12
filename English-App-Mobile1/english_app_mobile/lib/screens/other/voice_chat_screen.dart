import 'dart:convert';
import 'dart:io';

import 'package:avatar_glow/avatar_glow.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:just_audio/just_audio.dart';
import 'package:lottie/lottie.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:record/record.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../../config/api_config.dart';
import '../../utils/auth_helper.dart';

class VoiceChatSocketScreen extends StatefulWidget {
  const VoiceChatSocketScreen({super.key});

  @override
  State<VoiceChatSocketScreen> createState() => _VoiceChatSocketScreenState();
}

class _VoiceChatSocketScreenState extends State<VoiceChatSocketScreen> {
  final _recorder = AudioRecorder();
  final _player = AudioPlayer();
  late io.Socket _socket;
  final _scroll = ScrollController();
  final _dio = Dio(BaseOptions(baseUrl: ApiConfig.baseUrl));

  bool isRecording = false;
  bool isLoadingAI = false;
  bool isLoadingHistory = true;
  String? userId;

  final List<Map<String, String>> messages = [];

  @override
  void initState() {
    super.initState();
    _initUserThenSocket();
  }

  Future<void> _initUserThenSocket() async {
    userId = await AuthHelper.getUserId();
    await _loadHistory();

    _socket = io.io(ApiConfig.baseUrl, {
      'transports': ['websocket'],
      'autoConnect': false,
    });
    _socket.connect();

    _socket.onConnect((_) {
      debugPrint('✅ Socket connected');
      if (userId != null) _socket.emit('join', userId);
    });

    _socket.on('ai_reply', (data) async {
      if (!mounted) return;

      final ai = (data['aiResponse'] ?? '').toString();
      final url = data['audioUrl']?.toString();
      final transcript = (data['transcript'] ?? '').toString();

      debugPrint("🗣️ You said: $transcript");
      debugPrint("🤖 AI replied: $ai");

      // ✅ Cập nhật lại tin nhắn user cuối cùng (đang là "(You spoke...)")
      if (messages.isNotEmpty && messages.last['from'] == 'user') {
        setState(() {
          messages[messages.length - 1]['text'] = transcript;
        });
      } else {
        setState(() {
          messages.add({'from': 'user', 'text': transcript});
        });
      }

      // ✅ Thêm phản hồi của AI
      setState(() {
        isLoadingAI = false;
        messages.add({'from': 'ai', 'text': ai});
      });

      // 🎧 Phát âm thanh nếu có
      if (url != null && url.isNotEmpty) {
        try {
          await _player.setUrl(url);
          await _player.play();
        } catch (e) {
          if (mounted) {
            ScaffoldMessenger.of(
              context,
            ).showSnackBar(SnackBar(content: Text('Cannot play audio: $e')));
          }
        }
      }

      _autoScroll();
    });

    _socket.onDisconnect((_) => debugPrint('🔌 Socket disconnected'));
  }

  /// 📜 Tải lịch sử hội thoại từ backend (REST API)
  Future<void> _loadHistory() async {
    try {
      final id = await AuthHelper.getUserId();
      if (id == null) return;

      final res = await _dio.get('/api/conversation/$id');
      final List data = res.data;

      setState(() {
        messages.clear();
        for (var item in data) {
          messages.add({'from': 'user', 'text': item['transcript'] ?? ''});
          messages.add({'from': 'ai', 'text': item['aiResponse'] ?? ''});
        }
        isLoadingHistory = false;
      });

      await Future.delayed(const Duration(milliseconds: 100));
      _autoScroll();
    } catch (e) {
      debugPrint("⚠️ Load history failed: $e");
      setState(() => isLoadingHistory = false);
    }
  }

  Future<void> _autoScroll() async {
    await Future.delayed(const Duration(milliseconds: 150));
    if (!_scroll.hasClients) return;
    _scroll.animateTo(
      _scroll.position.maxScrollExtent,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOut,
    );
  }

  /* 🎙️ GHI ÂM & GỬI LÊN SOCKET */
  Future<void> _startRecording() async {
    if (!mounted) return;

    final ok = await Permission.microphone.request().isGranted;
    if (!mounted) return;
    if (!ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Microphone permission required')),
      );
      return;
    }

    final config = const RecordConfig(
      encoder: AudioEncoder.wav,
      sampleRate: 16000,
      bitRate: 128000,
      numChannels: 1,
    );

    final dir = await getTemporaryDirectory();
    final filePath = '${dir.path}/voice_input.wav';
    await _recorder.start(config, path: filePath);
    setState(() => isRecording = true);
  }

  Future<void> _stopRecording() async {
    if (!mounted) return;
    final path = await _recorder.stop();
    setState(() {
      isRecording = false;
      isLoadingAI = true;
    });

    if (path == null) return;

    final bytes = await File(path).readAsBytes();
    final b64 = base64Encode(bytes);

    setState(() {
      messages.add({'from': 'user', 'text': '(You spoke...)'});
    });
    _autoScroll();

    debugPrint("🎤 Emitting voice_message to socket...");
    _socket.emit('voice_message', {'userId': userId, 'audioBase64': b64});
  }

  Future<void> _toggleRecording() async {
    if (isRecording) {
      await _stopRecording();
    } else {
      await _startRecording();
    }
  }

  @override
  void dispose() {
    _player.dispose();
    _recorder.dispose();
    _socket.dispose();
    super.dispose();
  }

  /* 🧱 UI PHẦN GIAO DIỆN */
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xffF4F6FA),
      appBar: AppBar(
        elevation: 0,
        centerTitle: true,
        backgroundColor: Colors.indigo,
        title: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.headphones_rounded, color: Colors.white),
            SizedBox(width: 8),
            Text(
              "AI Voice Tutor",
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          if (isLoadingHistory)
            const Padding(
              padding: EdgeInsets.all(32.0),
              child: CircularProgressIndicator(),
            ),

          if (!isLoadingHistory)
            Expanded(
              child: ListView.builder(
                controller: _scroll,
                padding: const EdgeInsets.all(16),
                itemCount: messages.length,
                itemBuilder: (context, i) {
                  final m = messages[i];
                  final isUser = m['from'] == 'user';
                  return Align(
                    alignment: isUser
                        ? Alignment.centerRight
                        : Alignment.centerLeft,
                    child: Container(
                      margin: const EdgeInsets.symmetric(vertical: 6),
                      padding: const EdgeInsets.all(14),
                      constraints: BoxConstraints(
                        maxWidth: MediaQuery.of(context).size.width * 0.8,
                      ),
                      decoration: BoxDecoration(
                        color: isUser
                            ? Colors.indigo.shade400
                            : Colors.grey.shade100,
                        borderRadius: BorderRadius.only(
                          topLeft: const Radius.circular(16),
                          topRight: const Radius.circular(16),
                          bottomLeft: isUser
                              ? const Radius.circular(16)
                              : const Radius.circular(4),
                          bottomRight: isUser
                              ? const Radius.circular(4)
                              : const Radius.circular(16),
                        ),
                      ),
                      child: Text(
                        m['text'] ?? '',
                        style: TextStyle(
                          fontSize: 16,
                          color: isUser ? Colors.white : Colors.black87,
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),

          if (isLoadingAI)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 20),
              child: Lottie.asset(
                'assets/lottie/voice_loading.json',
                width: 120,
                height: 120,
              ),
            ),

          // 🎙️ MIC BUTTON
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
              child: AvatarGlow(
                glowColor: isRecording ? Colors.redAccent : Colors.indigoAccent,
                repeat: true,
                duration: const Duration(milliseconds: 1500),
                animate: isRecording,
                endRadius: 55.0,
                child: GestureDetector(
                  onTap: _toggleRecording,
                  child: Container(
                    height: 80,
                    width: 80,
                    decoration: BoxDecoration(
                      color: isRecording
                          ? Colors.redAccent
                          : Colors.indigoAccent,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color:
                              (isRecording
                                      ? Colors.redAccent
                                      : Colors.indigoAccent)
                                  .withValues(alpha: 0.6),
                          blurRadius: 20,
                          spreadRadius: 5,
                        ),
                      ],
                    ),
                    child: Icon(
                      isRecording ? Icons.stop_rounded : Icons.mic_rounded,
                      color: Colors.white,
                      size: 38,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
