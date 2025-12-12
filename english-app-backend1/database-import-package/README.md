# 🧠 English App Backend

## 🚀 Yêu cầu môi trường
- Node.js >= 18
- SQL Server (LocalDB hoặc SQLEXPRESS)
- Prisma ORM

## ⚙️ Cài đặt
git clone https://github.com/tranvanphongw/english-app-backend.git
cd english-app-backend
npm install
# Windows:
copy .env.example .env
# macOS/Linux:
# cp .env.example .env

## 🗄️ Tạo database và migrate
npx prisma migrate dev --name init
npx ts-node prisma/seed.ts

## ▶️ Chạy server
npm run dev

Mở http://localhost:4000/health  
→ thấy {"status":"ok"} ✅

## 👤 Tài khoản mặc định
- Email: admin@example.com  
- Password: 123123

## 📦 API chính
| Method | Endpoint | Mô tả |
|---------|-----------|-------|
| POST | /auth/login | Đăng nhập |
| POST | /auth/refresh | Làm mới token |
| GET | /protected/me | Thông tin người dùng |
| GET | /lessons | Danh sách bài học |
| GET | /lessons/:id | Chi tiết bài học |
