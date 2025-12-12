import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../api/api_client.dart';
import '../../config/api_config.dart';
import '../../services/tts_service.dart';

class TranslationScreen extends StatefulWidget {
  const TranslationScreen({super.key});

  @override
  State<TranslationScreen> createState() => _TranslationScreenState();
}

class _TranslationScreenState extends State<TranslationScreen> {
  final TextEditingController _sourceController = TextEditingController();
  final TextEditingController _targetController = TextEditingController();
  
  String _sourceLanguage = 'en';
  String _targetLanguage = 'vi';
  bool _isLoading = false;
  String _error = '';
  
  @override
  void initState() {
    super.initState();
    TTSService().initialize();
    
    // Listen to text changes to update UI
    _sourceController.addListener(() {
      if (mounted) setState(() {});
    });
    _targetController.addListener(() {
      if (mounted) setState(() {});
    });
  }
  
  // Danh sách ngôn ngữ hỗ trợ
  final Map<String, String> _languages = {
    'en': 'English',
    'vi': 'Tiếng Việt',
    'ja': '日本語',
    'ko': '한국어',
    'zh': '中文',
    'fr': 'Français',
    'de': 'Deutsch',
    'es': 'Español',
    'it': 'Italiano',
    'pt': 'Português',
    'ru': 'Русский',
    'ar': 'العربية',
    'th': 'ไทย',
    'hi': 'हिन्दी',
  };


  @override
  void dispose() {
    _sourceController.dispose();
    _targetController.dispose();
    super.dispose();
  }

  /// Hoán đổi ngôn ngữ nguồn và đích
  void _swapLanguages() {
    setState(() {
      final temp = _sourceLanguage;
      _sourceLanguage = _targetLanguage;
      _targetLanguage = temp;
      
      // Hoán đổi text
      final tempText = _sourceController.text;
      _sourceController.text = _targetController.text;
      _targetController.text = tempText;
    });
  }

  /// Dịch text
  Future<void> _translate() async {
    if (!mounted) return;
    
    if (_sourceController.text.trim().isEmpty) {
      setState(() {
        _error = 'Vui lòng nhập text cần dịch';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _error = '';
    });

    try {
      // Sử dụng endpoint custom translation
      final response = await dio.post(
        '${ApiConfig.translationEndpoint}/custom',
        data: {
          'text': _sourceController.text.trim(),
          'source': _sourceLanguage,
          'target': _targetLanguage,
        },
      );

      if (!mounted) return;
      
      if (response.statusCode == 200) {
        setState(() {
          _targetController.text = response.data['translatedText'] ?? '';
        });
      } else {
        setState(() {
          _error = 'Lỗi dịch thuật: ${response.data['error']?['message'] ?? 'Unknown error'}';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Lỗi kết nối: ${e.toString()}';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  /// Copy text to clipboard
  void _copyToClipboard(String text) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Đã copy vào clipboard'),
        duration: Duration(seconds: 2),
      ),
    );
  }

  /// Phát âm text
  void _speakText(String text, String language) {
    if (text.trim().isEmpty) return;
    
    if (language == 'en') {
      TTSService().speakUS(text);
    } else if (language == 'vi') {
      TTSService().speak(text); // Fallback to default
    } else {
      TTSService().speak(text);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        title: Text(
          'Dịch Thuật',
          style: GoogleFonts.poppins(
            fontWeight: FontWeight.w700,
            fontSize: 20,
            color: Colors.white,
            letterSpacing: 0.5,
          ),
        ),
        flexibleSpace: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Colors.blue.shade600,
                Colors.blue.shade700,
                Colors.indigo.shade600,
              ],
            ),
          ),
        ),
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Column(
        children: [
          // Language Selection Bar with modern design
          Container(
            margin: const EdgeInsets.fromLTRB(16, 16, 16, 12),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Colors.white,
                  Colors.blue.shade50,
                ],
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: Colors.blue.withValues(alpha: 0.1),
                  blurRadius: 15,
                  offset: const Offset(0, 4),
                  spreadRadius: 0,
                ),
              ],
            ),
            child: Row(
              children: [
                // Source Language
                Expanded(
                  child: _buildLanguageSelector(
                    _sourceLanguage,
                    (value) => setState(() => _sourceLanguage = value!),
                  ),
                ),
                
                // Swap Button with animation
                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 16),
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: _swapLanguages,
                      borderRadius: BorderRadius.circular(30),
                      child: Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [
                              Colors.blue.shade500,
                              Colors.indigo.shade600,
                            ],
                          ),
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.blue.withValues(alpha: 0.3),
                              blurRadius: 8,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.swap_horiz_rounded,
                          color: Colors.white,
                          size: 26,
                        ),
                      ),
                    ),
                  ),
                ),
                
                // Target Language
                Expanded(
                  child: _buildLanguageSelector(
                    _targetLanguage,
                    (value) => setState(() => _targetLanguage = value!),
                  ),
                ),
              ],
            ),
          ),
          
          // Translation Area
          Expanded(
            child: Container(
              margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.08),
                    blurRadius: 20,
                    offset: const Offset(0, 4),
                    spreadRadius: 0,
                  ),
                ],
              ),
              child: Column(
                children: [
                  // Source Text Area
                  Expanded(
                    child: _buildTextArea(
                      controller: _sourceController,
                      hintText: 'Nhập text cần dịch...',
                      label: 'Nhập văn bản',
                      icon: Icons.edit_note_rounded,
                      iconColor: Colors.blue.shade600,
                      bgColor: Colors.blue.shade50.withValues(alpha: 0.3),
                      onChanged: (text) {
                        if (text.trim().isNotEmpty) {
                          _translate();
                        } else {
                          setState(() {
                            _targetController.clear();
                          });
                        }
                      },
                      onSpeak: () => _speakText(_sourceController.text, _sourceLanguage),
                      onCopy: () => _copyToClipboard(_sourceController.text),
                      onClear: () {
                        setState(() {
                          _sourceController.clear();
                          _targetController.clear();
                        });
                      },
                    ),
                  ),
                  
                  // Divider with gradient
                  Container(
                    height: 1,
                    margin: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          Colors.transparent,
                          Colors.grey.shade300,
                          Colors.transparent,
                        ],
                      ),
                    ),
                  ),
                  
                  // Target Text Area
                  Expanded(
                    child: _buildTextArea(
                      controller: _targetController,
                      hintText: 'Bản dịch sẽ hiển thị ở đây...',
                      label: 'Bản dịch',
                      icon: Icons.translate_rounded,
                      iconColor: Colors.green.shade600,
                      bgColor: Colors.green.shade50.withValues(alpha: 0.3),
                      isReadOnly: true,
                      isLoading: _isLoading,
                      onSpeak: () => _speakText(_targetController.text, _targetLanguage),
                      onCopy: () => _copyToClipboard(_targetController.text),
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          // Error Message
          if (_error.isNotEmpty)
            Container(
              margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.red.shade200, width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: Colors.red.withValues(alpha: 0.1),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.red.shade100,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(Icons.error_outline_rounded, color: Colors.red.shade700, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      _error,
                      style: GoogleFonts.poppins(
                        color: Colors.red.shade800,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  /// Build language selector dropdown
  Widget _buildLanguageSelector(String selectedLanguage, ValueChanged<String?> onChanged) {
    return Container(
      constraints: const BoxConstraints(
        minHeight: 52,
        maxHeight: 52,
      ),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: Colors.grey.shade300,
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: DropdownButtonFormField<String>(
        initialValue: selectedLanguage,
        onChanged: onChanged,
        isExpanded: true,
        decoration: InputDecoration(
          border: InputBorder.none,
          enabledBorder: InputBorder.none,
          focusedBorder: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          filled: true,
          fillColor: Colors.transparent,
          isDense: true,
        ),
        style: GoogleFonts.poppins(
          fontSize: 15,
          fontWeight: FontWeight.w600,
          color: Colors.grey.shade800,
        ),
        icon: Padding(
          padding: const EdgeInsets.only(right: 6),
          child: Icon(
            Icons.keyboard_arrow_down_rounded,
            color: Colors.grey.shade600,
            size: 24,
          ),
        ),
        iconSize: 24,
        dropdownColor: Colors.white,
        borderRadius: BorderRadius.circular(14),
        menuMaxHeight: 400,
        items: _languages.entries.map((entry) {
          final isSelected = entry.key == selectedLanguage;
          return DropdownMenuItem<String>(
            value: entry.key,
            child: Container(
              constraints: const BoxConstraints(
                minHeight: 44,
              ),
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    width: 22,
                    child: isSelected
                        ? Icon(
                            Icons.check_circle_rounded,
                            color: Colors.blue.shade600,
                            size: 20,
                          )
                        : null,
                  ),
                  if (isSelected) const SizedBox(width: 10),
                  Flexible(
                    child: Text(
                      entry.value,
                      style: GoogleFonts.poppins(
                        fontSize: 15,
                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                        color: isSelected ? Colors.blue.shade700 : Colors.grey.shade800,
                      ),
                      overflow: TextOverflow.ellipsis,
                      maxLines: 1,
                    ),
                  ),
                ],
              ),
            ),
          );
        }).toList(),
        selectedItemBuilder: (BuildContext context) {
          return _languages.entries.map((entry) {
            return Center(
              child: Text(
                entry.value,
                style: GoogleFonts.poppins(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey.shade800,
                ),
                overflow: TextOverflow.ellipsis,
                maxLines: 1,
                textAlign: TextAlign.center,
              ),
            );
          }).toList();
        },
      ),
    );
  }

  /// Build text area with actions
  Widget _buildTextArea({
    required TextEditingController controller,
    required String hintText,
    required String label,
    required IconData icon,
    required Color iconColor,
    required Color bgColor,
    bool isReadOnly = false,
    bool isLoading = false,
    ValueChanged<String>? onChanged,
    VoidCallback? onSpeak,
    VoidCallback? onCopy,
    VoidCallback? onClear,
  }) {
    final hasText = controller.text.trim().isNotEmpty;
    
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with label and actions
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  icon,
                  color: iconColor,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Text(
                label,
                style: GoogleFonts.poppins(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey.shade700,
                  letterSpacing: 0.3,
                ),
              ),
              const Spacer(),
              // Action buttons
              if (onClear != null && hasText && !isReadOnly)
                _buildActionButton(
                  icon: Icons.clear_rounded,
                  color: Colors.grey.shade600,
                  onPressed: onClear,
                  tooltip: 'Xóa',
                ),
              if (onSpeak != null && hasText) ...[
                const SizedBox(width: 8),
                _buildActionButton(
                  icon: Icons.volume_up_rounded,
                  color: iconColor,
                  onPressed: onSpeak,
                  tooltip: 'Phát âm',
                ),
              ],
              if (onCopy != null && hasText) ...[
                const SizedBox(width: 8),
                _buildActionButton(
                  icon: Icons.copy_rounded,
                  color: Colors.grey.shade600,
                  onPressed: onCopy,
                  tooltip: 'Sao chép',
                ),
              ],
            ],
          ),
          
          const SizedBox(height: 16),
          
          // Text field
          Expanded(
            child: TextField(
              controller: controller,
              readOnly: isReadOnly,
              onChanged: onChanged,
              maxLines: null,
              expands: true,
              textAlignVertical: TextAlignVertical.top,
              style: GoogleFonts.poppins(
                fontSize: 16,
                height: 1.5,
                color: Colors.grey.shade800,
              ),
              decoration: InputDecoration(
                hintText: hintText,
                border: InputBorder.none,
                hintStyle: GoogleFonts.poppins(
                  color: Colors.grey.shade400,
                  fontSize: 16,
                  height: 1.5,
                ),
                contentPadding: EdgeInsets.zero,
              ),
            ),
          ),
          
          // Loading indicator
          if (isLoading)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Row(
                children: [
                  SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      valueColor: AlwaysStoppedAnimation<Color>(iconColor),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'Đang dịch...',
                    style: GoogleFonts.poppins(
                      fontSize: 13,
                      color: Colors.grey.shade600,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  /// Build action button
  Widget _buildActionButton({
    required IconData icon,
    required Color color,
    required VoidCallback onPressed,
    required String tooltip,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.7),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: Colors.grey.shade200,
              width: 1,
            ),
          ),
          child: Icon(
            icon,
            color: color,
            size: 18,
          ),
        ),
      ),
    );
  }
}
