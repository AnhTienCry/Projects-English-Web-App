import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

/// Service để quản lý video offline (download functionality has been removed)
class VideoDownloadService {
  static const String _downloadsKey = 'downloaded_videos';
  static const String _downloadsDirName = 'video_downloads';

  /// Lấy thư mục lưu video đã download
  static Future<Directory> getDownloadsDirectory() async {
    final appDir = await getApplicationDocumentsDirectory();
    final downloadsDir = Directory('${appDir.path}/$_downloadsDirName');
    if (!await downloadsDir.exists()) {
      await downloadsDir.create(recursive: true);
    }
    return downloadsDir;
  }

  /// Lấy đường dẫn file video đã download
  static Future<String?> getDownloadedVideoPath(String videoId) async {
    final downloadsDir = await getDownloadsDirectory();
    final videoFile = File('${downloadsDir.path}/$videoId.mp4');
    if (await videoFile.exists()) {
      return videoFile.path;
    }
    return null;
  }

  /// Kiểm tra video đã được download chưa
  static Future<bool> isVideoDownloaded(String videoId) async {
    final path = await getDownloadedVideoPath(videoId);
    return path != null;
  }

  /// Lấy thông tin video đã download
  static Future<Map<String, dynamic>?> getDownloadedVideoInfo(String videoId) async {
    final prefs = await SharedPreferences.getInstance();
    final downloadsJson = prefs.getString(_downloadsKey);
    if (downloadsJson == null) return null;

    final downloads = jsonDecode(downloadsJson) as Map<String, dynamic>;
    return downloads[videoId] as Map<String, dynamic>?;
  }

  /// Lưu thông tin video đã download
  static Future<void> saveDownloadedVideoInfo(String videoId, Map<String, dynamic> info) async {
    final prefs = await SharedPreferences.getInstance();
    final downloadsJson = prefs.getString(_downloadsKey);
    Map<String, dynamic> downloads = {};

    if (downloadsJson != null) {
      downloads = jsonDecode(downloadsJson) as Map<String, dynamic>;
    }

    downloads[videoId] = {
      ...info,
      'downloadedAt': DateTime.now().toIso8601String(),
    };

    await prefs.setString(_downloadsKey, jsonEncode(downloads));
  }

  /// Xóa thông tin video đã download
  static Future<void> removeDownloadedVideoInfo(String videoId) async {
    final prefs = await SharedPreferences.getInstance();
    final downloadsJson = prefs.getString(_downloadsKey);
    if (downloadsJson == null) return;

    final downloads = jsonDecode(downloadsJson) as Map<String, dynamic>;
    downloads.remove(videoId);

    await prefs.setString(_downloadsKey, jsonEncode(downloads));
  }

  /// Lấy danh sách tất cả video đã download
  static Future<List<Map<String, dynamic>>> getAllDownloadedVideos() async {
    final prefs = await SharedPreferences.getInstance();
    final downloadsJson = prefs.getString(_downloadsKey);
    if (downloadsJson == null) return [];

    final downloads = jsonDecode(downloadsJson) as Map<String, dynamic>;
    final List<Map<String, dynamic>> result = [];

    for (var entry in downloads.entries) {
      final videoId = entry.key;
      final info = entry.value as Map<String, dynamic>;
      final path = await getDownloadedVideoPath(videoId);

      if (path != null) {
        final file = File(path);
        final fileSize = await file.length();
        result.add({
          'videoId': videoId,
          ...info,
          'filePath': path,
          'fileSize': fileSize,
        });
      }
    }

    return result;
  }

  // Download functionality has been removed

  /// Xóa video đã download
  static Future<bool> deleteDownloadedVideo(String videoId) async {
    try {
      final path = await getDownloadedVideoPath(videoId);
      if (path != null) {
        final file = File(path);
        if (await file.exists()) {
          await file.delete();
        }
      }

      await removeDownloadedVideoInfo(videoId);
      return true;
    } catch (e) {
      debugPrint('Error deleting video: $e');
      return false;
    }
  }

  /// Lấy tổng dung lượng video đã download (bytes)
  static Future<int> getTotalDownloadedSize() async {
    try {
      final downloads = await getAllDownloadedVideos();
      int totalSize = 0;
      for (var video in downloads) {
        totalSize += video['fileSize'] as int? ?? 0;
      }
      return totalSize;
    } catch (e) {
      return 0;
    }
  }

  // Download functionality has been removed

  /// Format file size
  static String formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(2)} KB';
    if (bytes < 1024 * 1024 * 1024) return '${(bytes / (1024 * 1024)).toStringAsFixed(2)} MB';
    return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(2)} GB';
  }
}
