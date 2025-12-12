import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('admin@example.com'); // tiện test
  const [password, setPassword] = useState('123123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const loginData = await login(email, password);
      
      // Redirect based on user role
      const userRole = loginData.user?.role;
      if (userRole === 'ADMIN') {
        navigate('/admin');
      } else if (userRole === 'TEACHER') {
        navigate('/teacher');
      } else {
        // Students are not allowed - show message
        setError('Students không được phép truy cập web interface. Vui lòng sử dụng mobile app.');
        return;
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 0'
    }}>
      <div style={{
        background: 'white',
        padding: '3rem',
        borderRadius: '20px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        maxWidth: '450px',
        width: '90%'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <h1 style={{ 
              margin: 0, 
              color: '#333', 
              fontSize: '2rem', 
              fontWeight: 'bold',
              marginBottom: '0.5rem'
            }}>
              📚 English App
            </h1>
          </Link>
          <p style={{ color: '#666', margin: 0 }}>Đăng nhập vào tài khoản</p>
        </div>

        {/* Form */}
        <form onSubmit={submit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: 'bold',
              color: '#333'
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e1e5e9',
                borderRadius: '10px',
                fontSize: '1rem',
                transition: 'border-color 0.3s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
              placeholder="Nhập email của bạn"
            />
          </div>
          
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: 'bold',
              color: '#333'
            }}>
              Mật khẩu
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e1e5e9',
                borderRadius: '10px',
                fontSize: '1rem',
                transition: 'border-color 0.3s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
              placeholder="Nhập mật khẩu"
            />
          </div>

          {error && (
            <div style={{
              background: '#f8d7da',
              color: '#721c24',
              padding: '0.75rem',
              borderRadius: '10px',
              marginBottom: '1.5rem',
              border: '1px solid #f5c6cb'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: loading ? '#ccc' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.3s ease',
              marginBottom: '1.5rem'
            }}
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>

          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#666', margin: 0 }}>
              Chưa có tài khoản?{' '}
              <Link 
                to="/register" 
                style={{ 
                  color: '#667eea', 
                  textDecoration: 'none',
                  fontWeight: 'bold'
                }}
              >
                Đăng ký ngay
              </Link>
            </p>
          </div>

          {/* Demo Accounts */}
          <div style={{ 
            marginTop: '2rem', 
            padding: '1rem', 
            background: '#f8f9fa', 
            borderRadius: '10px',
            fontSize: '0.9rem'
          }}>
            <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', color: '#333' }}>
              Tài khoản demo:
            </p>
            <div style={{ color: '#666' }}>
              <div>Admin: admin@example.com / 123123</div>
              <div>Teacher: teacher@example.com / 123123</div>
              <div>Student: student@example.com / 123123</div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
