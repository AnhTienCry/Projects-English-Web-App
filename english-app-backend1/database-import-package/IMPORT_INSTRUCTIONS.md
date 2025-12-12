# Hướng dẫn Import Database cho English App

## Tổng quan

File `standalone-import-complete.js` chứa tất cả dữ liệu database của English App và có thể được sử dụng để import toàn bộ database vào MongoDB.

## Yêu cầu

1. **Node.js** đã được cài đặt (phiên bản 14 trở lên)
2. **MongoDB** đã được cài đặt và đang chạy
3. Các package cần thiết: `mongoose`, `dotenv`

## Các bước thực hiện

### Bước 1: Cài đặt dependencies

Mở terminal và chạy:

```bash
npm install mongoose dotenv
```

hoặc nếu chưa có `package.json`, tạo file mới:

```bash
npm init -y
npm install mongoose dotenv
```

### Bước 2: Đảm bảo MongoDB đang chạy

Kiểm tra MongoDB đã được khởi động:

```bash
# Windows
net start MongoDB

# Linux/Mac
sudo systemctl start mongod

# hoặc
mongod
```

### Bước 3: Import database

Chạy script import:

```bash
node standalone-import-complete.js
```

### Tùy chọn: Giữ lại dữ liệu hiện có

Nếu bạn muốn import mà không xóa dữ liệu hiện có:

```bash
KEEP_DATA=true node standalone-import-complete.js
```

hoặc trên Windows PowerShell:

```powershell
$env:KEEP_DATA="true"; node standalone-import-complete.js
```

## Cấu hình MongoDB

Mặc định, script sẽ kết nối đến: `mongodb://localhost:27017/english-app`

Nếu bạn cần thay đổi cấu hình:

1. Tạo file `.env` trong cùng thư mục
2. Thêm dòng sau:

```
MONGODB_URI=mongodb://your-host:your-port/your-database
```

## Kết quả

Sau khi import thành công, bạn sẽ thấy:

```
🎉 Database import completed!
📊 Total documents imported: 179

📊 Final Database Summary:
   levels: X documents
   topics: X documents
   ...
```

## Collections được import

Script sẽ import các collections sau (theo thứ tự dependency):

1. levels
2. topics
3. badges
4. ranks
5. users
6. lessons
7. videos
8. vocabs
9. quizzes
10. quizquestions
11. notifications
12. activities
13. userprogresses
14. lessonresults
15. quizresults
16. translations
17. translationhistories
18. conversationhistories

## Lưu ý

- Script sẽ **xóa toàn bộ dữ liệu hiện có** trong database `english-app` trước khi import
- Nếu bạn muốn giữ lại dữ liệu cũ, sử dụng flag `KEEP_DATA=true`
- Đảm bảo có đủ không gian trống trên ổ cứng
- Quá trình import có thể mất vài phút tùy thuộc vào kích thước database

## Troubleshooting

### Lỗi kết nối MongoDB

```
❌ Import failed: MongoServerError: connect ECONNREFUSED
```

**Giải pháp:** Đảm bảo MongoDB đang chạy và có thể truy cập được.

### Lỗi thiếu package

```
Cannot find module 'mongoose'
```

**Giải pháp:** Chạy lại `npm install mongoose dotenv`

### Port đã được sử dụng

Nếu MongoDB đang sử dụng port khác, thay đổi trong `.env` file:

```
MONGODB_URI=mongodb://localhost:27018/english-app
```

## Hỗ trợ

Nếu gặp vấn đề, vui lòng kiểm tra:
1. MongoDB đã khởi động
2. Node.js version (>= 14)
3. Các dependencies đã được cài đặt
4. File `standalone-import-complete.js` còn nguyên vẹn

## Tác giả

English App Database Export
Ngày xuất: 2025-10-28

