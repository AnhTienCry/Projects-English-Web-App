import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/http';

export default function Profile() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/api/protected/me')
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(e => {
        setErr(e?.response?.data?.error?.message || e.message);
        setLoading(false);
      });
  }, []);

  function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    navigate('/login');
  }

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#f8f9fa'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
          <p>Đang tải...</p>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div style={{maxWidth: 640, margin: '80px auto', fontFamily:'system-ui', padding: '0 2rem'}}>
        <div style={{ 
          background: 'white', 
          padding: '2rem', 
          borderRadius: '15px',
          boxShadow: '0 5px 20px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ color: '#dc3545', marginBottom: '1rem' }}>Lỗi xác thực</h2>
          <p style={{color:'#721c24', marginBottom: '2rem'}}>{err}</p>
          <Link 
            to="/login"
            style={{
              padding: '0.75rem 2rem',
              background: '#667eea',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '25px',
              fontWeight: 'bold'
            }}
          >
            Đăng nhập lại
          </Link>
        </div>
      </div>
    );
  }

  const user = data?.user;
  const isAdmin = user?.role === 'ADMIN';
  const isTeacher = user?.role === 'TEACHER';

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
    }}>
      {/* Header */}
      <header style={{ 
        background: 'white', 
        padding: '1rem 0',
        boxShadow: '0 2px 20px rgba(0,0,0,0.1)'
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <h1 style={{ margin: 0, color: '#333', fontSize: '1.8rem', fontWeight: 'bold' }}>
              📚 English Learning App
            </h1>
          </Link>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ color: '#666' }}>
              Xin chào, {user?.nickname || user?.email}
            </span>
            <button
              onClick={logout}
              style={{
                padding: '0.5rem 1rem',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '2rem 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 2rem' }}>
          {/* Welcome Card */}
          <div style={{ 
            background: 'white', 
            padding: '2rem', 
            borderRadius: '15px',
            boxShadow: '0 5px 20px rgba(0,0,0,0.1)',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            <h2 style={{ color: '#333', marginBottom: '1rem' }}>
              👋 Chào mừng, {user?.nickname || user?.email}!
            </h2>
            <p style={{ color: '#666', margin: 0 }}>
              Vai trò: <span style={{ 
                padding: '0.25rem 0.75rem', 
                background: isAdmin ? '#dc3545' : isTeacher ? '#007bff' : '#28a745',
                color: 'white',
                borderRadius: '15px',
                fontSize: '0.9rem',
                fontWeight: 'bold'
              }}>
                {user?.role === 'ADMIN' ? 'Quản trị viên' : 
                 user?.role === 'TEACHER' ? 'Giảng viên' : 'Học viên'}
              </span>
            </p>
          </div>

          {/* Student Message */}
          {user?.role === 'STUDENT' && (
            <div style={{ 
              background: 'white', 
              padding: '2rem', 
              borderRadius: '15px',
              boxShadow: '0 5px 20px rgba(0,0,0,0.1)',
              textAlign: 'center',
              marginBottom: '2rem'
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📱</div>
              <h3 style={{ color: '#333', marginBottom: '1rem' }}>Web chỉ dành cho Admin & Giảng viên</h3>
              <p style={{ color: '#666', marginBottom: '1.5rem' }}>
                Bạn đang đăng nhập với tài khoản học viên. Vui lòng sử dụng ứng dụng mobile để học tập.
              </p>
              <div style={{
                padding: '1rem',
                background: '#e3f2fd',
                borderRadius: '10px',
                color: '#1976d2',
                fontSize: '0.9rem'
              }}>
                <strong>💡 Hướng dẫn:</strong> Tải ứng dụng English Learning App trên điện thoại để bắt đầu học tiếng Anh!
              </div>
            </div>
          )}

          {/* Admin/Teacher Navigation */}
          {(isAdmin || isTeacher) && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: '1.5rem' 
            }}>
              <Link to="/progress" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ 
                  background: 'white', 
                  padding: '2rem', 
                  borderRadius: '15px',
                  boxShadow: '0 5px 20px rgba(0,0,0,0.1)',
                  textAlign: 'center',
                  transition: 'transform 0.3s ease',
                  cursor: 'pointer'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
                  <h3 style={{ color: '#333', marginBottom: '0.5rem' }}>Quản lý học viên</h3>
                  <p style={{ color: '#666', margin: 0 }}>Xem tiến trình và thống kê học viên</p>
                </div>
              </Link>

              <Link to="/quizzes" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ 
                  background: 'white', 
                  padding: '2rem', 
                  borderRadius: '15px',
                  boxShadow: '0 5px 20px rgba(0,0,0,0.1)',
                  textAlign: 'center',
                  transition: 'transform 0.3s ease',
                  cursor: 'pointer'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧠</div>
                  <h3 style={{ color: '#333', marginBottom: '0.5rem' }}>Quản lý Quiz</h3>
                  <p style={{ color: '#666', margin: 0 }}>Tạo và quản lý bài kiểm tra</p>
                </div>
              </Link>

              <Link to="/videos" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ 
                  background: 'white', 
                  padding: '2rem', 
                  borderRadius: '15px',
                  boxShadow: '0 5px 20px rgba(0,0,0,0.1)',
                  textAlign: 'center',
                  transition: 'transform 0.3s ease',
                  cursor: 'pointer'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎥</div>
                  <h3 style={{ color: '#333', marginBottom: '0.5rem' }}>Quản lý Video</h3>
                  <p style={{ color: '#666', margin: 0 }}>Tải lên và quản lý video bài giảng</p>
                </div>
              </Link>
            </div>
          )}

          {/* User Info */}
          <div style={{ 
            background: 'white', 
            padding: '2rem', 
            borderRadius: '15px',
            boxShadow: '0 5px 20px rgba(0,0,0,0.1)',
            marginTop: '2rem'
          }}>
            <h3 style={{ color: '#333', marginBottom: '1rem' }}>Thông tin tài khoản</h3>
            <div style={{ 
              background: '#f8f9fa', 
              padding: '1rem', 
              borderRadius: '10px',
              fontFamily: 'monospace',
              fontSize: '0.9rem'
            }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
