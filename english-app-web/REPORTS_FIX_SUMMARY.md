# Sửa lỗi Reports Page - Dữ liệu không khớp với Dashboard

## 🔍 **Vấn đề phát hiện:**

### **Dashboard vs Reports:**
- **Dashboard**: Hiển thị đúng dữ liệu (10 lessons, 40 quizzes, 10 videos, 3 users)
- **Reports**: Hiển thị sai dữ liệu (nhiều số liệu = 0)

### **Nguyên nhân:**
1. **API calls khác nhau**:
   - **Dashboard**: Sử dụng `api` (axios) với interceptor tự động xử lý token
   - **Reports**: Sử dụng `apiCall` (fetch) thủ công

2. **Token handling**:
   - **Dashboard**: Axios interceptor tự động thêm token và refresh khi cần
   - **Reports**: Fetch thủ công có thể không gửi token đúng cách

## ✅ **Giải pháp đã thực hiện:**

### **1. Thay đổi API calls trong Reports:**
```typescript
// Trước (fetch thủ công):
apiCall('/api/lessons').then(res => res.json()).catch(() => [])

// Sau (axios với interceptor):
api.get('/api/lessons').then(res => res.data).catch(() => [])
```

### **2. Thêm auto-login:**
```typescript
// Auto-login to ensure we have valid token
console.log('🔐 Attempting auto-login for Reports...');
await autoLogin();
console.log('✅ Auto-login successful for Reports');
```

### **3. Cập nhật imports:**
```typescript
// Thêm:
import api from '../../api/http';
import { autoLogin } from '../../utils/api';

// Xóa:
import { apiCall } from '../../utils/api'; // Không sử dụng nữa
```

## 🔧 **Chi tiết thay đổi:**

### **File: `src/pages/admin/Reports.tsx`**

1. **Line 19-20**: Thay đổi imports
2. **Line 74-77**: Thêm auto-login
3. **Line 84-91**: Thay đổi tất cả API calls từ fetch sang axios

### **API endpoints được sửa:**
- `/api/lessons` → `api.get('/api/lessons')`
- `/api/quiz` → `api.get('/api/quiz')`
- `/api/vocab` → `api.get('/api/vocab')`
- `/api/videos` → `api.get('/api/videos')`
- `/api/users` → `api.get('/api/users')`
- `/api/progression/leaderboard` → `api.get('/api/progression/leaderboard')`
- `/api/activities/dashboard-stats` → `api.get('/api/activities/dashboard-stats')`
- `/api/activities/recent` → `api.get('/api/activities/recent')`

## 🎯 **Kết quả mong đợi:**

### **Sau khi sửa, Reports page sẽ hiển thị:**
- **Lessons**: 10 (thay vì 0)
- **Quizzes**: 40 (thay vì 0)  
- **Vocabularies**: 110 (thay vì 0)
- **Videos**: 10 (thay vì 0)
- **Users**: 3 (thay vì 0)
- **Các metrics khác**: Số liệu chính xác

### **Lợi ích:**
1. **Dữ liệu nhất quán** giữa Dashboard và Reports
2. **Token handling tự động** với axios interceptor
3. **Auto-refresh token** khi hết hạn
4. **Error handling tốt hơn** với axios

## 🧪 **Test:**

1. **Mở Dashboard** → Kiểm tra số liệu
2. **Mở Reports** → So sánh số liệu
3. **Kiểm tra Console** → Xem logs auto-login
4. **Test refresh token** → Đăng nhập lại nếu cần

## 📝 **Lưu ý:**

- **Tất cả API calls** trong Reports giờ sử dụng axios
- **Auto-login** đảm bảo token hợp lệ
- **Error handling** giữ nguyên với `.catch(() => [])`
- **Performance** không thay đổi đáng kể

## 🔄 **Nếu vẫn có vấn đề:**

1. **Kiểm tra Console** để xem lỗi API
2. **Kiểm tra Network tab** để xem requests
3. **Kiểm tra localStorage** để xem token
4. **Test với Postman** để verify API endpoints





