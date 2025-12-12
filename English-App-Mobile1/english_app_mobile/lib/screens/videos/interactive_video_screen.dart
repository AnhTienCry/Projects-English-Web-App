import 'dart:io'; // Để dùng File
import 'package:video_player/video_player.dart'; // Thư viện mới
import 'package:flutter/material.dart';
import 'package:youtube_player_flutter/youtube_player_flutter.dart';

import '../../api/api_client.dart';
import '../../config/api_config.dart';
import '../../services/tts_service.dart';
import '../../services/video_download_service.dart';

class InteractiveVideoScreen extends StatefulWidget {
  final String videoId;
  final String videoTitle;
  final String videoUrl;
  final String? localFilePath;
  final Map<String, dynamic>? videoData; // Tối ưu: Pass data từ list để tránh gọi API lại

  const InteractiveVideoScreen({
    super.key,
    required this.videoId,
    required this.videoTitle,
    required this.videoUrl,
    this.localFilePath,
    this.videoData, // Optional: Nếu có thì dùng luôn, không cần gọi API
  });

  @override
  State<InteractiveVideoScreen> createState() => _InteractiveVideoScreenState();
}

class _InteractiveVideoScreenState extends State<InteractiveVideoScreen> {
  // Video data
  Map<String, dynamic>? videoData;
  List<dynamic> subtitles = [];
  List<dynamic> wordDefinitions = [];

  // YouTube Player
  YoutubePlayerController? _youtubeController;
  // File Player
  VideoPlayerController? _fileController;

  // UI state
  bool isLoading = true;
  String? error;

  // Video player state
  bool isPlaying = false;
  double currentTime = 0.0;
  double duration = 0.0;

  // Current subtitle
  int? currentSubtitleIndex;

  // Auto-scroll controller
  final ScrollController _scrollController = ScrollController();

  // Keys for subtitle items to calculate exact positions
  final Map<int, GlobalKey> _subtitleKeys = {};

  // Auto-scroll settings
  bool _autoScrollEnabled = true;

  // Debounce mechanism to prevent excessive scrolling
  int? _lastScrollIndex;
  DateTime? _lastScrollTime;

  // Auto-scroll sensitivity settings
  double _scrollSensitivity = 0.3; // 30% margin from viewport edges

  // Force center mode - always center current subtitle
  bool _forceCenterMode = true;

  @override
  void initState() {
    super.initState();

    // Initialize TTS service (async, không block)
    TTSService().initialize();

    // Tối ưu: Sử dụng data từ props nếu có, không cần gọi API
    if (widget.videoData != null) {
      _processVideoData(widget.videoData!);
      setState(() {
        isLoading = false;
      });
    } else {
      // Chỉ gọi API nếu không có data từ props
      _loadVideoData();
    }

    // Check local path async không block UI
    _checkLocalPath();

    // Initialize player
    if (widget.localFilePath != null) {
      _initializeFilePlayer();
    } else {
      _initializeYouTubePlayer();
    }
  }

  // Check local path async
  Future<void> _checkLocalPath() async {
    final localPath = await VideoDownloadService.getDownloadedVideoPath(widget.videoId);
    if (localPath != null && mounted && widget.localFilePath == null) {
      // Nếu tìm thấy local file và chưa có file controller, switch sang local player
      if (_fileController == null) {
        _youtubeController?.dispose();
        _initializeFilePlayerWithPath(localPath);
      }
    }
  }

  // Process video data từ props
  void _processVideoData(Map<String, dynamic> data) {
    videoData = data;
    subtitles = data['subtitles'] ?? [];
    wordDefinitions = data['wordDefinitions'] ?? [];
  }

  // Initialize file player với path
  void _initializeFilePlayerWithPath(String path) {
    try {
      _fileController = VideoPlayerController.file(File(path))
        ..initialize().then((_) {
          if (mounted) {
            setState(() {
              duration = _fileController!.value.duration.inSeconds.toDouble();
            });
            _fileController!.play();
          }
        });

      _fileController!.addListener(() {
        if (!mounted) return;
        final newTime = _fileController!.value.position.inSeconds.toDouble();
        setState(() {
          isPlaying = _fileController!.value.isPlaying;
          currentTime = newTime;
          _updateCurrentSubtitle(newTime);
        });
      });
    } catch (e) {
      setState(() {
        error = 'Failed to load local video file';
        isLoading = false;
      });
    }
  }

  @override
  void dispose() {
    _youtubeController?.dispose();
    _fileController?.dispose();
    _scrollController.dispose();
    TTSService().dispose();
    super.dispose();
  }

  void _initializeYouTubePlayer() {
    try {
      // Extract video ID from URL
      final videoId = YoutubePlayer.convertUrlToId(widget.videoUrl);

      if (videoId == null) {
        setState(() {
          error = 'Invalid YouTube URL';
          isLoading = false;
        });
        return;
      }

      // Initialize YouTube Player Controller
      _youtubeController = YoutubePlayerController(
        initialVideoId: videoId,
        flags: const YoutubePlayerFlags(
          autoPlay: true,
          mute: false,
          hideControls: false,
          controlsVisibleAtStart: false,
          disableDragSeek: false,
          enableCaption: false,
          forceHD: false,
          loop: false,
        ),
      );

      // Add listener for player state changes
      _youtubeController?.addListener(() {
        if (!mounted || _youtubeController == null) return;
        final ctrl = _youtubeController!;
        final newTime = ctrl.value.position.inSeconds.toDouble();

        setState(() {
          isPlaying = ctrl.value.isPlaying;
          currentTime = newTime;

          // Get duration when metadata is loaded
          if (ctrl.metadata.duration.inSeconds > 0) {
            duration = ctrl.metadata.duration.inSeconds.toDouble();
          }

          // Update current subtitle based on video time
          _updateCurrentSubtitle(newTime);
        });
      });
    } catch (e) {
      setState(() {
        error = 'Failed to load video';
        isLoading = false;
      });
    }
  }

  void _initializeFilePlayer() {
    try {
      _fileController = VideoPlayerController.file(File(widget.localFilePath!))
        ..initialize().then((_) {
          if (mounted) {
            setState(() {
              duration = _fileController!.value.duration.inSeconds.toDouble();
              // Chỉ set isLoading = false khi file player đã sẵn sàng
              // (tránh lỗi race condition)
            });
            _fileController!.play();
          }
        });

      _fileController!.addListener(() {
        if (!mounted) return;
        final newTime = _fileController!.value.position.inSeconds.toDouble();
        setState(() {
          isPlaying = _fileController!.value.isPlaying;
          currentTime = newTime;
          _updateCurrentSubtitle(newTime);
        });
      });
    } catch (e) {
      setState(() {
        error = 'Failed to load local video file';
        isLoading = false;
      });
    }
  }

  Future<void> _loadVideoData() async {
    if (!mounted) return;

    try {
      final response = await dio.get(
        '${ApiConfig.videosEndpoint}/${widget.videoId}',
      );

      if (!mounted) return;

      _processVideoData(response.data);
      setState(() {
        isLoading = false; // Set loading = false sau khi data đã tải
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          error = 'Failed to load video data';
          isLoading = false;
        });
      }
    }
  }

  // Update current subtitle based on video time
  void _updateCurrentSubtitle(double time) {
    if (subtitles.isEmpty) return;

    for (int i = 0; i < subtitles.length; i++) {
      final subtitle = subtitles[i];
      // Support both old format (start/duration) and new format (startTime/endTime)
      final start = (subtitle['startTime'] ?? subtitle['start'] ?? 0)
          .toDouble();
      final end = subtitle['endTime'] != null
          ? subtitle['endTime'].toDouble()
          : start + (subtitle['duration'] ?? 0).toDouble();

      if (time >= start && time <= end) {
        if (currentSubtitleIndex != i) {
          setState(() {
            currentSubtitleIndex = i;
          });
          // Auto-scroll to current subtitle if enabled
          if (_autoScrollEnabled) {
            _scrollToCurrentSubtitleWithDebounce(i);
          }
        }
        return;
      }
    }

    // No subtitle at current time
    if (currentSubtitleIndex != null) {
      setState(() {
        currentSubtitleIndex = null;
      });
    }
  }

  // Auto-scroll to current subtitle - IMPROVED VERSION
  void _scrollToCurrentSubtitle(int index) {
    if (index == -1 || _scrollController.positions.isEmpty) return;

    final key = _subtitleKeys[index];
    if (key?.currentContext == null) return;

    try {
      final RenderBox renderBox =
          key!.currentContext!.findRenderObject() as RenderBox;
      final RenderBox listViewBox =
          _scrollController.position.context.storageContext.findRenderObject()
              as RenderBox;

      // Lấy vị trí item so với ListView
      final itemOffset = renderBox
          .localToGlobal(Offset.zero, ancestor: listViewBox)
          .dy;
      final itemHeight = renderBox.size.height;
      final viewportHeight = _scrollController.position.viewportDimension;

      // Tính vị trí cuộn sao cho item nằm giữa
      final targetScrollOffset =
          _scrollController.offset +
          itemOffset -
          (viewportHeight / 2) +
          (itemHeight / 2);

      // Giới hạn để không vượt quá vùng cuộn
      final clampedOffset = targetScrollOffset.clamp(
        _scrollController.position.minScrollExtent,
        _scrollController.position.maxScrollExtent,
      );

      // Nếu phụ đề đang ở trung tâm rồi thì không cuộn nữa (tránh giật)
      final distanceFromCenter =
          (itemOffset + itemHeight / 2) - (viewportHeight / 2);
      if (distanceFromCenter.abs() > 20) {
        _scrollController.animateTo(
          clampedOffset,
          duration: const Duration(milliseconds: 400),
          curve: Curves.easeInOut,
        );
      }
    } catch (e) {
      // Fallback: simple scroll to approximate center position
      final itemHeight = 120.0; // Approximate subtitle card height
      final viewportHeight = _scrollController.position.viewportDimension;
      final centerOffset = viewportHeight / 2 - itemHeight / 2;
      final targetPosition = (index * itemHeight) - centerOffset;

      _scrollController.animateTo(
        targetPosition.clamp(0.0, _scrollController.position.maxScrollExtent),
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
      );
    }
  }

  // Debounced auto-scroll to prevent excessive scrolling
  void _scrollToCurrentSubtitleWithDebounce(int index) {
    final now = DateTime.now();

    // Skip if same index and within 200ms (faster response)
    if (_lastScrollIndex == index &&
        _lastScrollTime != null &&
        now.difference(_lastScrollTime!).inMilliseconds < 200) {
      return;
    }

    _lastScrollIndex = index;
    _lastScrollTime = now;

    _scrollToCurrentSubtitle(index);
  }

  // Show scroll sensitivity adjustment dialog
  void _showScrollSensitivityDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Điều chỉnh độ nhạy cuộn'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Force center mode toggle
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Luôn đẩy subtitle lên giữa màn hình',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                Switch(
                  value: _forceCenterMode,
                  onChanged: (value) {
                    setState(() {
                      _forceCenterMode = value;
                    });
                  },
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Sensitivity slider (only show if not in force center mode)
            if (!_forceCenterMode) ...[
              Text(
                'Độ nhạy: ${(_scrollSensitivity * 100).round()}%',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              Slider(
                value: _scrollSensitivity,
                min: 0.1,
                max: 0.5,
                divisions: 8,
                label: '${(_scrollSensitivity * 100).round()}%',
                onChanged: (value) {
                  setState(() {
                    _scrollSensitivity = value;
                  });
                },
              ),
              const SizedBox(height: 8),
              Text(
                'Giá trị thấp = cuộn nhiều hơn\nGiá trị cao = cuộn ít hơn',
                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                textAlign: TextAlign.center,
              ),
            ] else ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.green.shade200),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.center_focus_strong,
                      color: Colors.green.shade700,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Subtitle hiện tại sẽ luôn được đẩy lên giữa màn hình',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.green.shade700,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              setState(() {
                _scrollSensitivity = 0.3; // Reset to default
              });
            },
            child: const Text('Đặt lại'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Đóng'),
          ),
        ],
      ),
    );
  }

  // Get current subtitle text
  String? get currentSubtitleText {
    if (currentSubtitleIndex == null || subtitles.isEmpty) return null;
    if (currentSubtitleIndex! >= subtitles.length) return null;
    return subtitles[currentSubtitleIndex!]['text']?.toString();
  }

  void _showWordDefinitionBottomSheet(String word) async {
    // Show loading bottom sheet first
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(24),
            topRight: Radius.circular(24),
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 16),
            Text(
              'Đang tra từ "$word"...',
              style: const TextStyle(fontSize: 14, color: Colors.grey),
            ),
          ],
        ),
      ),
    );

    // Fetch word definition - AUTO TRANSLATE
    try {
      // Try to get from backend first - CORRECTED API ENDPOINT
      final response = await dio.get(
        '${ApiConfig.baseUrl}/api/videos/words/$word',
      );
      final wordDef = response.data['wordDefinition'];

      // Close loading sheet
      if (mounted) Navigator.pop(context);

      // Show word definition sheet
      if (mounted) {
        _showWordDefinitionContent(wordDef ?? _createDefaultDefinition(word));
      }
    } catch (e) {
      debugPrint('Word definition not found, trying translation...');
      // If backend doesn't have the word, try to auto-translate
      try {
        final translationResponse = await dio.post(
          '${ApiConfig.baseUrl}/api/translation/en-to-vi',
          // CORRECTED API ENDPOINT
          data: {'text': word}, // CORRECTED DATA FORMAT
        );

        // Close loading sheet
        if (mounted) Navigator.pop(context);

        if (mounted) {
          _showWordDefinitionContent({
            'word': word,
            'pronunciation': {'us': '/$word/', 'uk': '/$word/'},
            'definitions': [
              {
                'partOfSpeech': 'word',
                'meaning':
                    translationResponse.data['translatedText'] ??
                    'Không tìm thấy nghĩa', // CORRECTED FIELD
                'example': '',
              },
            ],
            'cefrLevel': 'Unknown',
          });
        }
      } catch (translateError) {
        debugPrint('Translation failed: $translateError');
        // Close loading sheet
        if (mounted) Navigator.pop(context);

        // Fallback to basic info
        if (mounted) {
          _showWordDefinitionContent(_createDefaultDefinition(word));
        }
      }
    }
  }

  Map<String, dynamic> _createDefaultDefinition(String word) {
    return {
      'word': word,
      'pronunciation': {'us': '/$word/', 'uk': '/$word/'},
      'definitions': [
        {
          'partOfSpeech': 'word',
          'meaning': 'Đang tải nghĩa...\n(Vui lòng thêm từ này vào từ điển)',
          'example': '',
        },
      ],
      'cefrLevel': 'Unknown',
    };
  }

  void _showWordDefinitionContent(Map<String, dynamic> wordDef) {
    final word = wordDef['word'] ?? '';
    final pronunciationUS = wordDef['pronunciation']?['us'] ?? '';
    final pronunciationUK = wordDef['pronunciation']?['uk'] ?? '';
    final definitions = wordDef['definitions'] ?? [];
    final cefrLevel = wordDef['cefrLevel'] ?? 'A1';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.4,
        maxChildSize: 0.9,
        builder: (context, scrollController) => Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.only(
              topLeft: Radius.circular(24),
              topRight: Radius.circular(24),
            ),
          ),
          child: ListView(
            controller: scrollController,
            padding: const EdgeInsets.all(24),
            children: [
              // Drag handle
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              // Word and favorite button
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      word,
                      style: const TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.favorite_border, color: Colors.pink),
                    iconSize: 28,
                    onPressed: () {
                      // TODO: Add to favorites
                    },
                  ),
                ],
              ),

              const SizedBox(height: 12),

              // Pronunciations with speaker icons
              Row(
                children: [
                  if (pronunciationUS.isNotEmpty) ...[
                    const Text(
                      'US',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                    ),
                    Text(
                      pronunciationUS,
                      style: const TextStyle(
                        fontSize: 14,
                        color: Colors.black54,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.volume_up),
                      iconSize: 20,
                      color: Colors.black54,
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      onPressed: () => TTSService().speak(word),
                    ),
                    const SizedBox(width: 16),
                  ],
                  if (pronunciationUK.isNotEmpty) ...[
                    const Text(
                      'UK',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                    ),
                    Text(
                      pronunciationUK,
                      style: const TextStyle(
                        fontSize: 14,
                        color: Colors.black54,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.volume_up),
                      iconSize: 20,
                      color: Colors.black54,
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      onPressed: () => TTSService().speak(word),
                    ),
                  ],
                ],
              ),

              const SizedBox(height: 16),

              // Context notice
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.blue.shade200, width: 1),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.info_outline,
                      size: 18,
                      color: Colors.blue.shade700,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Nghĩa được dịch theo ngữ cảnh trong video',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.blue.shade700,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // CEFR Level badge
              if (cefrLevel != 'Unknown') ...[
                Align(
                  alignment: Alignment.centerLeft,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: _getCefrColor(cefrLevel),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      cefrLevel,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // Definitions
              ...definitions.asMap().entries.map((entry) {
                final definition = entry.value;
                final partOfSpeech = definition['partOfSpeech'] ?? '';
                final meaning = definition['meaning'] ?? '';
                final example = definition['example'] ?? '';

                return Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.purple.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.purple.shade100, width: 1),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Part of speech badge
                      if (partOfSpeech.isNotEmpty)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.deepPurple,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            partOfSpeech,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ),

                      if (partOfSpeech.isNotEmpty) const SizedBox(height: 12),

                      // Vietnamese meaning - HIGHLIGHTED
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(
                            Icons.translate,
                            size: 20,
                            color: Colors.deepPurple,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              meaning,
                              style: const TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.w600,
                                color: Colors.black87,
                                height: 1.4,
                              ),
                            ),
                          ),
                        ],
                      ),

                      // Example (if available)
                      if (example.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        const Divider(),
                        const SizedBox(height: 8),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('💬', style: TextStyle(fontSize: 16)),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                example,
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Colors.grey[700],
                                  fontStyle: FontStyle.italic,
                                  height: 1.4,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                );
              }),

              const SizedBox(height: 8),

              // "Câu ví dụ" dropdown button
              InkWell(
                onTap: () {
                  // TODO: Show more examples
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    border: Border(top: BorderSide(color: Colors.grey[300]!)),
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        'Câu ví dụ',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Colors.deepPurple,
                        ),
                      ),
                      SizedBox(width: 8),
                      Icon(
                        Icons.keyboard_arrow_down,
                        size: 20,
                        color: Colors.deepPurple,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _getCefrColor(String level) {
    switch (level.toUpperCase()) {
      case 'A1':
        return Colors.green;
      case 'A2':
        return Colors.lightGreen;
      case 'B1':
        return Colors.blue;
      case 'B2':
        return Colors.orange;
      case 'C1':
        return Colors.deepOrange;
      case 'C2':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  // =================================================================
  // == HÀM BUILD ĐÃ SỬA LỖI (SỬA Ở ĐÂY) ==
  // =================================================================

  @override
  Widget build(BuildContext context) {
    Widget playerWidget;

    // ----- BƯỚC 1: KIỂM TRA XEM ĐANG Ở CHẾ ĐỘ NÀO -----
    if (widget.localFilePath != null) {
      // ----- CHẾ ĐỘ PHÁT FILE LOCAL -----
      
      // Kiểm tra xem controller đã sẵn sàng chưa
      if (_fileController != null && _fileController!.value.isInitialized) {
        // ĐÃ SẴN SÀNG: Hiển thị video
        playerWidget = AspectRatio(
          aspectRatio: _fileController!.value.aspectRatio,
          child: Stack(
            alignment: Alignment.bottomCenter,
            children: [
              VideoPlayer(_fileController!),
              VideoProgressIndicator(_fileController!, allowScrubbing: true),
              GestureDetector(
                onTap: () {
                  setState(() {
                    _fileController!.value.isPlaying
                        ? _fileController!.pause()
                        : _fileController!.play();
                  });
                },
                child: Center(
                  child: Icon(
                    _fileController!.value.isPlaying
                        ? Icons.pause_circle_filled
                        : Icons.play_circle_filled,
                    color: Colors.white.withValues(alpha: 0.7),
                    size: 60,
                  ),
                ),
              ),
            ],
          ),
        );
      } else {
        // CHƯA SẴN SÀNG (ĐANG TẢI): Hiển thị loading
        // Đây là bước quan trọng để SỬA LỖI CHỚP ĐỎ
        playerWidget = Container(
          height: 220, // Giữ chiều cao cố định
          color: Colors.black,
          child: const Center(
            child: CircularProgressIndicator(color: Colors.white),
          ),
        );
      }

      // Trả về Scaffold cho chế độ LOCAL
      return Scaffold(
        backgroundColor: Colors.grey[50],
        appBar: AppBar(
          title: Text(
            widget.videoTitle,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
          ),
          backgroundColor: Colors.deepPurple,
          foregroundColor: Colors.white,
          elevation: 0,
        ),
        body: Column(
          children: [
            playerWidget, // Widget video local (hoặc loading)
            _buildHeaderBar(),
            Expanded(child: _buildBodyContent()),
          ],
        ),
      );

    } else {
      // ----- CHẾ ĐỘ PHÁT YOUTUBE -----

      // Kiểm tra xem controller đã sẵn sàng chưa
      if (_youtubeController != null) {
        // ĐÃ SẴN SÀNG: Hiển thị YouTube player
        final yt = YoutubePlayer(
          controller: _youtubeController!, // An toàn vì đã kiểm tra != null
          showVideoProgressIndicator: true,
          progressIndicatorColor: Colors.deepPurple,
          progressColors: const ProgressBarColors(
            playedColor: Colors.deepPurple,
            handleColor: Colors.deepPurpleAccent,
          ),
          topActions: const [],
          bottomActions: [
            CurrentPosition(),
            const SizedBox(width: 10),
            ProgressBar(isExpanded: true),
            const SizedBox(width: 10),
            RemainingDuration(),
            PlaybackSpeedButton(),
          ],
        );

        // Trả về Scaffold cho chế độ YOUTUBE
        return YoutubePlayerBuilder(
          player: yt,
          builder: (context, player) {
            return Scaffold(
              backgroundColor: Colors.grey[50],
              appBar: AppBar(
                title: Text(
                  widget.videoTitle,
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                ),
                backgroundColor: Colors.deepPurple,
                foregroundColor: Colors.white,
                elevation: 0,
              ),
              body: Column(
                children: [
                  player, // Widget YouTube
                  _buildHeaderBar(),
                  Expanded(child: _buildBodyContent()),
                ],
              ),
            );
          },
        );
      } else {
        // CHƯA SẴN SÀNG (ĐANG TẢI hoặc LỖI): Hiển thị loading
        return Scaffold(
          backgroundColor: Colors.grey[50],
          appBar: AppBar(
            title: Text(
              widget.videoTitle,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
            ),
            backgroundColor: Colors.deepPurple,
            foregroundColor: Colors.white,
            elevation: 0,
          ),
          body: Column(
            children: [
              Container(
                height: 220,
                color: Colors.black,
                child: const Center(
                  child: CircularProgressIndicator(color: Colors.white),
                ),
              ),
              _buildHeaderBar(),
              Expanded(child: _buildBodyContent()),
            ],
          ),
        );
      }
    }
  }


  // Header bar reused
  Widget _buildHeaderBar() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF6B3FA0), Color(0xFF8E44AD)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Icon(Icons.subtitles, color: Colors.white, size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Row(
              children: [
                const Text(
                  'Phụ đề thông minh',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text(
                    'Tương tác',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
          GestureDetector(
            onTap: () {
              setState(() {
                _autoScrollEnabled = !_autoScrollEnabled;
              });
            },
            onLongPress: () {
              _showScrollSensitivityDialog();
            },
            child: IconButton(
              onPressed: () {},
              icon: Icon(
                _autoScrollEnabled ? Icons.auto_awesome : Icons.auto_awesome_outlined,
                color: Colors.white,
              ),
              tooltip: _autoScrollEnabled ? 'Tắt tự động cuộn' : 'Bật tự động cuộn',
            ),
          ),
        ],
      ),
    );
  }

  // Body content reused
  Widget _buildBodyContent() {
    if (isLoading) return const Center(child: CircularProgressIndicator());
    if (error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text(error!, style: const TextStyle(fontSize: 16)),
          ],
        ),
      );
    }
    return _buildSubtitlesTab();
  }
  Widget _buildSubtitlesTab() {
    if (subtitles.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.subtitles_off_outlined, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'Chưa có phụ đề',
              style: TextStyle(fontSize: 16, color: Colors.grey),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.all(16),
      itemCount: subtitles.length,
      itemBuilder: (context, index) {
        final subtitle = subtitles[index];
        final text = subtitle['text'] ?? '';
        // Support both old format (start) and new format (startTime/formattedStartTime/displayTime/time)
        final start = (subtitle['startTime'] ?? subtitle['start'] ?? 0)
            .toDouble();
        // Use formatted time for display if available, otherwise format manually
        final displayTime =
            subtitle['formattedStartTime'] ??
            subtitle['displayTime'] ??
            subtitle['time'] ??
            _formatTime(start);
        final isCurrentSubtitle = currentSubtitleIndex == index;

        // Create key for this subtitle item if not exists
        if (!_subtitleKeys.containsKey(index)) {
          _subtitleKeys[index] = GlobalKey();
        }

        return Card(
          key: _subtitleKeys[index],
          margin: const EdgeInsets.only(bottom: 12),
          elevation: isCurrentSubtitle ? 4 : 1,
          color: isCurrentSubtitle ? Colors.deepPurple.shade50 : Colors.white,
          child: Container(
            decoration: BoxDecoration(
              border: Border.all(
                color: isCurrentSubtitle
                    ? Colors.deepPurple
                    : Colors.transparent,
                width: 2,
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      isCurrentSubtitle
                          ? Icons.play_circle_filled
                          : Icons.access_time,
                      size: 16,
                      color: isCurrentSubtitle
                          ? Colors.deepPurple
                          : Colors.grey[600],
                    ),
                    const SizedBox(width: 6),
                    Text(
                      displayTime,
                      style: TextStyle(
                        fontSize: 12,
                        color: isCurrentSubtitle
                            ? Colors.deepPurple
                            : Colors.grey[600],
                        fontWeight: isCurrentSubtitle
                            ? FontWeight.bold
                            : FontWeight.w500,
                      ),
                    ),
                    if (isCurrentSubtitle) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.deepPurple,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Text(
                          'Đang phát',
                          style: TextStyle(
                            fontSize: 10,
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                    const Spacer(),
                    IconButton(
                      icon: const Icon(Icons.play_arrow, size: 20),
                      color: Colors.deepPurple,
                      onPressed: () {
                        final target = Duration(seconds: start.toInt());
                        if (_fileController != null && _fileController!.value.isInitialized) {
                          _fileController!.seekTo(target);
                          _fileController!.play();
                        } else if (_youtubeController != null) {
                          _youtubeController!.seekTo(target);
                          _youtubeController!.play();
                        }
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // English subtitle with clickable words
                _buildClickableSubtitle(text, isEnglish: true),

                const SizedBox(height: 8),

                // Vietnamese translation
                if (subtitle['translation'] != null) ...[
                  Text(
                    subtitle['translation'],
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey[600],
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildClickableSubtitle(String text, {bool isEnglish = true}) {
    // Split text into words, preserving punctuation
    final words = text.split(RegExp(r'(\s+)'));

    // Identify difficult words (for highlighting)
    final difficultWords = _identifyDifficultWords(words);

    return Wrap(
      spacing: 4,
      runSpacing: 4,
      children: words.map((word) {
        // Skip whitespace
        if (word.trim().isEmpty) {
          return Text(word);
        }

        // Check if this is punctuation only
        if (RegExp(r'^[^\w\s]+$').hasMatch(word)) {
          return Text(
            word,
            style: const TextStyle(
              fontSize: 16,
              height: 1.5,
              color: Colors.black87,
            ),
          );
        }

        // Clean word for lookup (remove punctuation)
        final cleanWord = word.replaceAll(RegExp(r'[^\w\s]'), '').toLowerCase();

        // Check if this is a difficult word
        final isDifficult = difficultWords.contains(cleanWord);

        return GestureDetector(
          onTap: () {
            if (cleanWord.isNotEmpty) {
              _showWordDefinitionBottomSheet(cleanWord);
            }
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
            decoration: BoxDecoration(
              color: isDifficult
                  ? Colors.amber.withValues(alpha: 0.3)
                  : Colors.transparent,
              borderRadius: BorderRadius.circular(4),
              border: Border.all(
                color: isDifficult
                    ? Colors.amber.shade700
                    : Colors.deepPurple.withValues(alpha: 0.3),
                width: isDifficult ? 1.5 : 1,
              ),
            ),
            child: Text(
              word,
              style: TextStyle(
                fontSize: 16,
                height: 1.5,
                color: isDifficult
                    ? Colors.amber.shade900
                    : Colors.deepPurple.shade800,
                fontWeight: isDifficult ? FontWeight.bold : FontWeight.w500,
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  // Identify 2-3 difficult words in the subtitle
  Set<String> _identifyDifficultWords(List<String> words) {
    // Common words that should not be highlighted
    final commonWords = {
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'from',
      'by',
      'about',
      'as',
      'into',
      'through',
      'during',
      'is',
      'am',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'should',
      'could',
      'can',
      'may',
      'might',
      'must',
      'i',
      'you',
      'he',
      'she',
      'it',
      'we',
      'they',
      'me',
      'him',
      'her',
      'us',
      'them',
      'my',
      'your',
      'his',
      'its',
      'our',
      'their',
      'this',
      'that',
      'these',
      'those',
      'what',
      'which',
      'who',
      'when',
      'where',
      'why',
      'how',
      'not',
      'no',
      'yes',
      'so',
      'very',
      'just',
      'now',
      'then',
    };

    // Extract clean words and filter
    final potentialWords = <String, int>{};
    for (var word in words) {
      final cleanWord = word.replaceAll(RegExp(r'[^\w\s]'), '').toLowerCase();
      if (cleanWord.isEmpty || commonWords.contains(cleanWord)) continue;

      // Score based on length and complexity
      int score = 0;
      if (cleanWord.length >= 6) score += 2; // Longer words
      if (cleanWord.length >= 8) score += 2; // Very long words
      if (cleanWord.contains(RegExp(r'[^aeiou]{3}'))) {
        score += 1; // Consonant clusters
      }
      if (cleanWord.endsWith('ed') || cleanWord.endsWith('ing')) {
        score += 1; // Verb forms
      }
      if (cleanWord.endsWith('ly')) {
        score += 1; // Adverbs
      }

      if (score > 0) {
        potentialWords[cleanWord] = score;
      }
    }

    // Sort by score and take top 2-3
    final sorted = potentialWords.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    return sorted.take(3).map((e) => e.key).toSet();
  }

  String _formatTime(double seconds) {
    final minutes = (seconds / 60).floor();
    final secs = (seconds % 60).floor();
    return '${minutes.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';
  }
}