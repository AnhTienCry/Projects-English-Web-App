# English Learning Mobile App

Ứng dụng học tiếng Anh di động được xây dựng với Flutter, kết nối với backend API.

## Tính năng chính

- 🔐 **Đăng nhập/Đăng ký**: Xác thực người dùng với JWT tokens
- 📚 **Bài học**: Danh sách bài học với các cấp độ khác nhau
- 📝 **Từ vựng**: Flashcards tương tác với hiệu ứng flip
- 🧠 **Quiz**: Bài kiểm tra với timer và kết quả chi tiết
- 📹 **Video**: Xem video học tập và theo dõi tiến độ
- 📊 **Tiến độ**: Theo dõi tiến độ học tập và thống kê
- 🏆 **Thành tích**: Badges và ranks để khuyến khích học tập
- 🔔 **Thông báo**: Nhận thông báo về tiến độ học tập
- 👤 **Hồ sơ**: Quản lý thông tin cá nhân

## Cấu trúc dự án

```
lib/
├── api/
│   └── api_client.dart          # HTTP client với Dio
├── screens/
│   ├── login_screen.dart        # Màn hình đăng nhập
│   ├── home_screen.dart         # Màn hình chính
│   ├── lesson_screen.dart       # Danh sách bài học
│   ├── vocabulary_screen.dart   # Flashcards từ vựng
│   ├── quiz_screen.dart         # Màn hình quiz
│   ├── quiz_list_screen.dart    # Danh sách quiz
│   ├── video_screen.dart        # Video học tập
│   ├── progress_screen.dart     # Tiến độ học tập
│   ├── profile_screen.dart      # Hồ sơ người dùng
│   ├── achievement_screen.dart  # Thành tích
│   └── notification_screen.dart # Thông báo
└── main.dart                    # Entry point
```

## Cài đặt và chạy

### Yêu cầu
- Flutter SDK (phiên bản 3.9.2+)
- Dart SDK
- Android Studio / VS Code
- Backend API đang chạy trên `http://10.0.2.2:4000`

### Cài đặt dependencies
```bash
cd english_app_mobile
flutter pub get
```

### Chạy ứng dụng
```bash
# Chạy trên Android emulator
flutter run

# Chạy trên iOS simulator (macOS only)
flutter run -d ios

# Build APK
flutter build apk
```

## Cấu hình API

Ứng dụng được cấu hình để kết nối với backend API:

- **Base URL**: `http://10.0.2.2:4000/api`
- **Authentication**: JWT Bearer tokens
- **Auto refresh**: Tự động refresh token khi hết hạn

### API Endpoints được sử dụng

- `POST /auth/login` - Đăng nhập
- `POST /auth/register` - Đăng ký
- `POST /auth/refresh` - Refresh token
- `GET /protected/me` - Thông tin người dùng
- `GET /lessons` - Danh sách bài học
- `GET /vocab` - Từ vựng
- `GET /quizzes` - Danh sách quiz
- `POST /quizzes/submit` - Nộp bài quiz
- `GET /videos` - Video học tập
- `GET /progression/me` - Tiến độ học tập
- `GET /badges` - Badges
- `GET /ranks` - Ranks
- `GET /notifications` - Thông báo

## Tính năng UI/UX

### Thiết kế
- Material Design 3
- Gradient backgrounds
- Card-based layout
- Responsive design
- Dark/Light theme support

### Animations
- Flip animations cho flashcards
- Slide transitions
- Progress indicators
- Loading states

### Navigation
- Bottom navigation bar
- Modal bottom sheets
- Page transitions
- Deep linking support

## Demo Credentials

Để test ứng dụng, sử dụng:
- **Email**: `admin@example.com`
- **Password**: `123123`

## Troubleshooting

### Lỗi kết nối API
- Đảm bảo backend đang chạy trên port 4000
- Kiểm tra IP address cho Android emulator (10.0.2.2)
- Kiểm tra network permissions

### Lỗi build
```bash
flutter clean
flutter pub get
flutter run
```

### Lỗi dependencies
```bash
flutter pub deps
flutter pub upgrade
```

## Phát triển

### Thêm màn hình mới
1. Tạo file trong `lib/screens/`
2. Thêm route trong `main.dart`
3. Cập nhật navigation

### Thêm API endpoint
1. Cập nhật `api_client.dart`
2. Thêm method trong screen tương ứng
3. Test với backend API

### Customization
- Thay đổi colors trong `ThemeData`
- Cập nhật assets trong `pubspec.yaml`
- Modify API base URL trong `api_client.dart`

## License

MIT License - Xem file LICENSE để biết thêm chi tiết.