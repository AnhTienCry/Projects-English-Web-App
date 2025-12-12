/**
 * Chuyển đổi thời gian thành định dạng tương đối tiếng Việt
 * @param date - Ngày tháng cần chuyển đổi
 * @returns Chuỗi thời gian tương đối (ví dụ: "1 tiếng trước", "2 ngày trước")
 */
export function getRelativeTime(date: Date | string): string {
  const now = new Date();
  const targetDate = new Date(date);
  const diffInMs = now.getTime() - targetDate.getTime();
  
  // Chuyển đổi milliseconds thành các đơn vị thời gian
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);
  const diffInYears = Math.floor(diffInDays / 365);

  // Trả về thời gian tương đối
  if (diffInSeconds < 60) {
    return 'Vừa xong';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} phút trước`;
  } else if (diffInHours < 24) {
    const hours = Math.floor(diffInHours);
    const minutes = diffInMinutes % 60;
    
    if (minutes === 0) {
      return `${hours} tiếng trước`;
    } else {
      return `${hours} tiếng ${minutes} phút trước`;
    }
  } else if (diffInDays < 7) {
    return `${diffInDays} ngày trước`;
  } else if (diffInWeeks < 4) {
    return `${diffInWeeks} tuần trước`;
  } else if (diffInMonths < 12) {
    return `${diffInMonths} tháng trước`;
  } else {
    return `${diffInYears} năm trước`;
  }
}

/**
 * Kiểm tra xem thời gian có phải là hôm nay không
 * @param date - Ngày tháng cần kiểm tra
 * @returns true nếu là hôm nay
 */
export function isToday(date: Date | string): boolean {
  const today = new Date();
  const targetDate = new Date(date);
  
  return today.toDateString() === targetDate.toDateString();
}

/**
 * Kiểm tra xem thời gian có phải là hôm qua không
 * @param date - Ngày tháng cần kiểm tra
 * @returns true nếu là hôm qua
 */
export function isYesterday(date: Date | string): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const targetDate = new Date(date);
  
  return yesterday.toDateString() === targetDate.toDateString();
}

/**
 * Lấy thời gian hiển thị cho last login
 * @param lastLogin - Thời gian đăng nhập cuối
 * @returns Chuỗi hiển thị thời gian
 */
export function getLastLoginDisplay(lastLogin?: string | Date): string {
  if (!lastLogin) {
    return 'Chưa đăng nhập';
  }

  const date = new Date(lastLogin);
  
  if (isToday(date)) {
    return `Hôm nay lúc ${date.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`;
  } else if (isYesterday(date)) {
    return `Hôm qua lúc ${date.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`;
  } else {
    return getRelativeTime(date);
  }
}






