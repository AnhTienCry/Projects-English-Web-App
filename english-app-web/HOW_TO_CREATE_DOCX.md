# Hướng dẫn tạo file DOCX để test tính năng upload

## Vấn đề hiện tại
File `vocab-demo.docx` ban đầu chỉ là file text với extension .docx, không phải file Word thực sự, nên không thể đọc được.

## Cách tạo file DOCX thực sự

### Phương pháp 1: Sử dụng Microsoft Word
1. **Mở Microsoft Word**
2. **Copy nội dung** từ file `vocab-demo.txt`:
   ```
   Hello	Xin chào	/həˈləʊ/	Hello, how are you?	Xin chào, bạn khỏe không?
   Goodbye	Tạm biệt	/ɡʊdˈbaɪ/	Goodbye, see you later	Tạm biệt, hẹn gặp lại
   Thank you	Cảm ơn	/θæŋk juː/	Thank you very much	Cảm ơn bạn rất nhiều
   Please	Làm ơn	/pliːz/	Please help me	Làm ơn giúp tôi
   Sorry	Xin lỗi	/ˈsɒri/	Sorry, I'm late	Xin lỗi, tôi đến muộn
   Yes	Có	/jes/	Yes, I understand	Có, tôi hiểu
   No	Không	/nəʊ/	No, thank you	Không, cảm ơn
   Water	Nước	/ˈwɔːtə/	I need water	Tôi cần nước
   Food	Thức ăn	/fuːd/	The food is delicious	Thức ăn rất ngon
   House	Nhà	/haʊs/	This is my house	Đây là nhà của tôi
   ```
3. **Paste vào Word**
4. **Lưu file** với tên `vocab-demo.docx` và chọn định dạng "Word Document (.docx)"

### Phương pháp 2: Sử dụng Google Docs
1. **Mở Google Docs**
2. **Copy nội dung** từ file `vocab-demo.txt`
3. **Paste vào Google Docs**
4. **File → Download → Microsoft Word (.docx)**

### Phương pháp 3: Sử dụng LibreOffice Writer
1. **Mở LibreOffice Writer**
2. **Copy nội dung** từ file `vocab-demo.txt`
3. **Paste vào Writer**
4. **File → Save As → chọn định dạng "Microsoft Word 2007-365 (.docx)"**

## Kiểm tra file DOCX
Sau khi tạo file, bạn có thể kiểm tra:
1. **Kích thước file** phải > 10KB (file Word thực sự)
2. **Mở file** bằng Word để đảm bảo có nội dung
3. **Upload thử** vào hệ thống

## Lưu ý quan trọng
- ❌ **Không được** đổi tên file .txt thành .docx
- ❌ **Không được** copy file .txt và đổi extension
- ✅ **Phải tạo** file Word thực sự từ ứng dụng Word
- ✅ **Đảm bảo** file có nội dung text có thể đọc được

## Test case
1. Tạo file DOCX theo hướng dẫn trên
2. Upload vào hệ thống
3. Kiểm tra preview nội dung
4. Import từ vựng
5. Kiểm tra kết quả trong danh sách

## Troubleshooting
Nếu vẫn gặp lỗi:
1. **Kiểm tra file** có mở được bằng Word không
2. **Thử file khác** đơn giản hơn
3. **Kiểm tra console** để xem lỗi chi tiết
4. **Thử tính năng bulk import** bằng textarea trước





