import 'package:permission_handler/permission_handler.dart';

class PermissionHelper {
  /// Request storage/photo permissions for image picker
  static Future<bool> requestPhotoPermissions() async {
    // For Android 13+ (API 33+)
    var status = await Permission.photos.status;
    
    if (status.isDenied) {
      status = await Permission.photos.request();
    }
    
    // If photos permission not available, try storage (Android 12 and below)
    if (!status.isGranted) {
      var storageStatus = await Permission.storage.status;
      if (storageStatus.isDenied) {
        storageStatus = await Permission.storage.request();
      }
      return storageStatus.isGranted;
    }
    
    return status.isGranted;
  }
  
  /// Request camera permission
  static Future<bool> requestCameraPermission() async {
    var status = await Permission.camera.status;
    
    if (status.isDenied) {
      status = await Permission.camera.request();
    }
    
    return status.isGranted;
  }
  
  /// Request both photo and camera permissions
  static Future<Map<String, bool>> requestMediaPermissions() async {
    final photoGranted = await requestPhotoPermissions();
    final cameraGranted = await requestCameraPermission();
    
    return {
      'photo': photoGranted,
      'camera': cameraGranted,
    };
  }
}

