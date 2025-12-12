import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-lg py-4 shadow-lg">
        <div className="max-w-6xl mx-auto px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">
            📚 English Learning App
          </h1>
          <div className="flex gap-4">
            <Link 
              to="/login" 
              className="px-6 py-2 bg-transparent border-2 border-blue-500 rounded-full text-blue-500 font-bold hover:bg-blue-500 hover:text-white transition-all duration-300"
            >
              Đăng nhập
            </Link>
            <Link 
              to="/register" 
              className="px-6 py-2 bg-blue-500 border-2 border-blue-500 rounded-full text-white font-bold hover:bg-blue-600 transition-all duration-300"
            >
              Đăng ký
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="py-16">
        <div className="max-w-6xl mx-auto px-8 text-center">
          <h2 className="text-5xl font-bold text-white mb-6 drop-shadow-lg">
            Học Tiếng Anh Thông Minh
          </h2>
          <p className="text-xl text-white/90 mb-12 max-w-2xl mx-auto leading-relaxed">
            Nền tảng quản lý học tiếng Anh dành cho Admin và Giảng viên. Học viên sử dụng ứng dụng mobile.
          </p>
          
          <div className="flex gap-4 justify-center flex-wrap">
            <Link 
              to="/register" 
              className="px-8 py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-full text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              Bắt đầu học ngay
            </Link>
            <Link 
              to="/login" 
              className="px-8 py-4 bg-white/20 border-2 border-white text-white font-bold rounded-full text-lg hover:bg-white hover:text-gray-800 transition-all duration-300"
            >
              Đã có tài khoản?
            </Link>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="bg-white/95 py-16 mt-16">
        <div className="max-w-6xl mx-auto px-8">
          <h3 className="text-4xl font-bold text-center mb-12 text-gray-800">
            Tính năng nổi bật
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="text-5xl mb-4">👨‍💼</div>
              <h4 className="text-xl font-bold mb-4 text-gray-800">Quản lý Admin</h4>
              <p className="text-gray-600 leading-relaxed">
                Quản lý toàn bộ hệ thống, giảng viên và học viên với quyền truy cập cao nhất.
              </p>
            </div>
            
            <div className="text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="text-5xl mb-4">👨‍🏫</div>
              <h4 className="text-xl font-bold mb-4 text-gray-800">Quản lý Giảng viên</h4>
              <p className="text-gray-600 leading-relaxed">
                Tạo bài học, quiz và video. Theo dõi tiến trình học tập của học viên.
              </p>
            </div>
            
            <div className="text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="text-5xl mb-4">📱</div>
              <h4 className="text-xl font-bold mb-4 text-gray-800">Học viên Mobile</h4>
              <p className="text-gray-600 leading-relaxed">
                Học viên sử dụng ứng dụng mobile để học tập, làm quiz và xem video.
              </p>
            </div>
            
            <div className="text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="text-5xl mb-4">🌐</div>
              <h4 className="text-xl font-bold mb-4 text-gray-800">Dịch Thuật Thông Minh</h4>
              <p className="text-gray-600 leading-relaxed">
                Dịch thuật Anh-Việt và Việt-Anh với AI, hỗ trợ học từ vựng hiệu quả.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Translation Demo Section */}
      <section className="py-16 bg-gradient-to-r from-teal-500 to-blue-500">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <h3 className="text-3xl font-bold text-white mb-8">
            🌐 Dịch Thuật Thông Minh
          </h3>
          <p className="text-xl text-white/90 mb-8">
            Sử dụng AI để dịch thuật Anh-Việt và Việt-Anh, hỗ trợ học từ vựng hiệu quả
          </p>
          <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-8 max-w-2xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-left">
                <h4 className="text-lg font-semibold text-white mb-2">Tính năng chính:</h4>
                <ul className="text-white/90 space-y-2">
                  <li>• Dịch Anh → Việt</li>
                  <li>• Dịch Việt → Anh</li>
                  <li>• Hỗ trợ nhiều ngôn ngữ</li>
                  <li>• Lưu lịch sử dịch thuật</li>
                  <li>• Tích hợp với từ vựng</li>
                </ul>
              </div>
              <div className="text-left">
                <h4 className="text-lg font-semibold text-white mb-2">Lợi ích:</h4>
                <ul className="text-white/90 space-y-2">
                  <li>• Học từ vựng nhanh hơn</li>
                  <li>• Hiểu nghĩa chính xác</li>
                  <li>• Tăng hiệu quả học tập</li>
                  <li>• Tiết kiệm thời gian</li>
                  <li>• Hỗ trợ 24/7</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white text-center py-8 mt-16">
        <div className="max-w-6xl mx-auto px-8">
          <p className="text-lg opacity-80">
            © 2024 English Learning App. Học tiếng Anh hiệu quả, thông minh.
          </p>
        </div>
      </footer>
    </div>
  );
}