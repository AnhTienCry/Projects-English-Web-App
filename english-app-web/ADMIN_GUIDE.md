# 📚 English Learning App - Hướng Dẫn Sử Dụng Web Admin

## 🎯 Tổng Quan

Web application này được thiết kế dành riêng cho **Admin** và **Giảng viên** để quản lý hệ thống học tiếng Anh. Học viên sẽ sử dụng ứng dụng mobile.

## 👥 Phân Quyền Người Dùng

### 🔑 Admin (Quản trị viên)
- **Quyền hạn**: Quản lý toàn bộ hệ thống
- **Chức năng**:
  - Quản lý tài khoản giảng viên và học viên
  - Xem thống kê tiến trình của tất cả học viên
  - Tạo và quản lý quiz
  - Tải lên và quản lý video bài giảng
  - Truy cập tất cả tính năng quản lý

### 👨‍🏫 Teacher (Giảng viên)
- **Quyền hạn**: Quản lý nội dung học tập
- **Chức năng**:
  - Xem tiến trình học tập của học viên
  - Tạo và quản lý quiz cho bài học
  - Tải lên và quản lý video bài giảng
  - Theo dõi kết quả học tập

### 📱 Student (Học viên)
- **Lưu ý**: Học viên **KHÔNG** sử dụng web này
- **Hướng dẫn**: Sử dụng ứng dụng mobile để học tập

## 🚀 Cách Sử Dụng

### 1. Đăng Nhập
- Truy cập: `http://localhost:5173/login`
- Tài khoản demo:
  - **Admin**: `admin@example.com` / `123123`
  - **Teacher**: `teacher@example.com` / `123123`

### 2. Đăng Ký Học Viên
- Truy cập: `http://localhost:5173/register`
- Chỉ tạo được tài khoản **STUDENT**
- Tài khoản Admin/Teacher được tạo bởi Admin

### 3. Các Trang Chức Năng

#### 📊 Quản Lý Học Viên (`/progress`)
- Xem danh sách tất cả học viên
- Theo dõi tiến trình học tập từng học viên
- Xem thống kê điểm số quiz
- Phân tích tiến độ hoàn thành bài học

#### 🧠 Quản Lý Quiz (`/quizzes`)
- Tạo quiz mới cho bài học
- Thêm câu hỏi (trắc nghiệm, đúng/sai, điền từ)
- Chỉnh sửa và xóa quiz
- Xem kết quả làm bài của học viên

#### 🎥 Quản Lý Video (`/videos`)
- Tải lên video bài giảng
- Quản lý metadata (tiêu đề, mô tả, thời lượng)
- Theo dõi tiến độ xem video của học viên
- Chỉnh sửa và xóa video

## 🔧 Cài Đặt và Chạy

### Yêu Cầu Hệ Thống
- Node.js 18+
- npm hoặc yarn
- Backend API đang chạy

### Cài Đặt
```bash
cd english-app-web
npm install
```

### Chạy Ứng Dụng
```bash
npm run dev
```

Truy cập: `http://localhost:5173`

## 📱 Ứng Dụng Mobile

Học viên sử dụng ứng dụng Flutter mobile để:
- Đăng nhập và học tập
- Làm quiz và xem điểm
- Xem video bài giảng
- Theo dõi tiến trình học tập cá nhân

## 🛠️ Công Nghệ Sử Dụng

### Frontend
- **React 19** - UI Framework
- **TypeScript** - Type Safety
- **React Router DOM** - Routing
- **Axios** - HTTP Client
- **Vite** - Build Tool

### Backend API
- **Node.js + Express** - Server
- **Prisma ORM** - Database
- **JWT** - Authentication
- **SQL Server** - Database

## 📞 Hỗ Trợ

Nếu có vấn đề hoặc cần hỗ trợ, vui lòng liên hệ:
- Email: support@englishapp.com
- Hotline: 1900-xxxx

---

**Lưu ý**: Web này chỉ dành cho Admin và Giảng viên. Học viên vui lòng sử dụng ứng dụng mobile.



















