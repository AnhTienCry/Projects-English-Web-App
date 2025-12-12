import 'package:flutter/foundation.dart';
import 'package:flutter_tts/flutter_tts.dart';

class TTSService {
  static final TTSService _instance = TTSService._internal();
  factory TTSService() => _instance;
  TTSService._internal();

  FlutterTts? _flutterTts;
  bool _isInitialized = false;

  /// Khởi tạo TTS service
  Future<void> initialize() async {
    if (_isInitialized) return;

    _flutterTts = FlutterTts();
    
    // Cấu hình TTS
    await _flutterTts!.setLanguage("en-US"); // Tiếng Anh Mỹ
    await _flutterTts!.setSpeechRate(0.5); // Tốc độ nói chậm hơn
    await _flutterTts!.setVolume(1.0); // Âm lượng tối đa
    await _flutterTts!.setPitch(1.0); // Cao độ bình thường
    
    // Lắng nghe sự kiện
    _flutterTts!.setStartHandler(() {
      debugPrint("TTS: Started speaking");
    });

    _flutterTts!.setCompletionHandler(() {
      debugPrint("TTS: Completed speaking");
    });

    _flutterTts!.setErrorHandler((msg) {
      debugPrint("TTS Error: $msg");
    });

    _isInitialized = true;
    debugPrint("✅ TTS Service initialized");
  }

  /// Phát âm một từ với giọng US
  Future<void> speakUS(String text) async {
    if (!_isInitialized) await initialize();
    
    try {
      await _flutterTts!.setLanguage("en-US");
      await _flutterTts!.speak(text);
      debugPrint("🔊 Speaking US: $text");
    } catch (e) {
      debugPrint("❌ TTS US Error: $e");
    }
  }

  /// Phát âm một từ với giọng UK
  Future<void> speakUK(String text) async {
    if (!_isInitialized) await initialize();
    
    try {
      await _flutterTts!.setLanguage("en-GB");
      await _flutterTts!.speak(text);
      debugPrint("🔊 Speaking UK: $text");
    } catch (e) {
      debugPrint("❌ TTS UK Error: $e");
    }
  }

  /// Phát âm một từ (mặc định US)
  Future<void> speak(String text) async {
    await speakUS(text);
  }

  /// Dừng phát âm
  Future<void> stop() async {
    if (_isInitialized) {
      await _flutterTts!.stop();
    }
  }


  /// Lấy danh sách ngôn ngữ có sẵn
  Future<List<dynamic>> getLanguages() async {
    if (!_isInitialized) await initialize();
    return await _flutterTts!.getLanguages ?? [];
  }

  /// Giải phóng tài nguyên
  void dispose() {
    _flutterTts?.stop();
    _flutterTts = null;
    _isInitialized = false;
  }
}
