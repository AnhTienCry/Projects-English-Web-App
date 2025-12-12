# Hướng dẫn sử dụng tính năng từ vựng mới

## 1. Thêm nhiều từ vựng cùng lúc

### Cách sử dụng:
1. Vào trang **Quản lý Từ vựng** trong admin panel
2. Nhấn nút **"Thêm nhiều từ vựng"** (màu xanh dương)
3. Chọn bài học và cấp độ
4. Nhập danh sách từ vựng theo định dạng tab-separated:

```
Hello	Xin chào	/həˈləʊ/	Hello, how are you?	Xin chào, bạn khỏe không?
Goodbye	Tạm biệt	/ɡʊdˈbaɪ/	Goodbye, see you later	Tạm biệt, hẹn gặp lại
Thank you	Cảm ơn	/θæŋk juː/	Thank you very much	Cảm ơn bạn rất nhiều
```

### Định dạng:
- **Thứ tự:** Từ vựng → Nghĩa → Phiên âm → Ví dụ → Dịch ví dụ
- **Phân cách:** Sử dụng phím Tab giữa các trường
- **Bắt buộc:** Từ vựng và nghĩa
- **Tùy chọn:** Phiên âm, ví dụ, dịch ví dụ

## 2. Upload file DOCX

### Cách sử dụng:
1. Vào trang **Quản lý Từ vựng** trong admin panel
2. Nhấn nút **"Upload file DOCX"** (màu tím)
3. Chọn bài học, cấp độ và loại từ
4. Chọn file .docx từ máy tính
5. Xem trước nội dung file
6. Nhấn **"Import từ vựng"**

### Yêu cầu file:
- **Định dạng:** Chỉ hỗ trợ file .docx
- **Nội dung:** Mỗi dòng một từ vựng
- **Phân cách:** Tab, dấu phẩy, hoặc dấu gạch dọc (|)
- **Thứ tự:** Từ vựng → Nghĩa → Phiên âm → Ví dụ → Dịch ví dụ

### Ví dụ nội dung file:
```
Hello	Xin chào	/həˈləʊ/	Hello, how are you?	Xin chào, bạn khỏe không?
Goodbye	Tạm biệt	/ɡʊdˈbaɪ/	Goodbye, see you later	Tạm biệt, hẹn gặp lại
Thank you	Cảm ơn	/θæŋk juː/	Thank you very much	Cảm ơn bạn rất nhiều
```

## 3. File demo để test

Đã tạo file demo tại: `public/vocab-demo.txt`

### Cách tạo file DOCX từ file text:
1. Mở Microsoft Word
2. Copy nội dung từ `vocab-demo.txt`
3. Paste vào Word
4. Lưu file với định dạng .docx
5. Upload file này để test

## 4. Lưu ý quan trọng

### Backend API:
- Sử dụng endpoint `/api/vocab/bulk-import` cho cả hai tính năng
- Cần quyền Teacher hoặc Admin
- Tự động thêm thông tin người tạo

### Xử lý lỗi:
- Kiểm tra định dạng file (.docx only)
- Validate dữ liệu bắt buộc (từ vựng và nghĩa)
- Hiển thị thông báo lỗi chi tiết
- Rollback nếu có lỗi xảy ra

### Hiệu suất:
- Xử lý hàng loạt từ vựng
- Hiển thị progress và kết quả
- Tự động refresh danh sách sau khi import

## 5. Cải tiến đã thực hiện

### Frontend:
- ✅ Thêm nút "Thêm nhiều từ vựng"
- ✅ Thêm nút "Upload file DOCX"
- ✅ Modal bulk import với textarea
- ✅ Modal file upload với drag & drop
- ✅ Preview nội dung file
- ✅ Validation dữ liệu
- ✅ Xóa phần điểm đạt trong quizzes

### Backend:
- ✅ API `/api/vocab/bulk-import` đã có sẵn
- ✅ Xử lý array of vocabularies
- ✅ Tự động thêm createdBy
- ✅ Error handling và validation

### Dependencies:
- ✅ Cài đặt thư viện `mammoth` để đọc file DOCX
- ✅ TypeScript support
- ✅ Error handling

## 6. Test cases

### Test bulk import:
1. Nhập 5-10 từ vựng bằng textarea
2. Kiểm tra validation (thiếu từ vựng/nghĩa)
3. Kiểm tra import thành công
4. Kiểm tra hiển thị trong danh sách

### Test file upload:
1. Tạo file .docx với nội dung demo
2. Upload file và xem preview
3. Kiểm tra import thành công
4. Test với file không đúng định dạng

### Test error handling:
1. Upload file không phải .docx
2. Nhập dữ liệu thiếu thông tin bắt buộc
3. Kiểm tra thông báo lỗi





