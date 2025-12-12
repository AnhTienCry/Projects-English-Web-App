// Debug script for browser console
// Copy and paste this into browser console on http://localhost:5173

console.log('🐛 Starting debug...');

// Check localStorage
console.log('📦 Local Storage:');
console.log('Access Token:', localStorage.getItem('accessToken') ? 'Present' : 'Missing');
console.log('Refresh Token:', localStorage.getItem('refreshToken') ? 'Present' : 'Missing');

// Test API calls
async function testAPIs() {
  const API_BASE = 'http://localhost:4000';
  
  try {
    // Test 1: Health check
    console.log('\n🏥 Testing Health Check...');
    const healthRes = await fetch(`${API_BASE}/health`);
    const healthData = await healthRes.json();
    console.log('Health:', healthRes.status, healthData);
    
    // Test 2: Login
    console.log('\n🔐 Testing Login...');
    const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: '123123'
      })
    });
    const loginData = await loginRes.json();
    console.log('Login:', loginRes.status, loginData);
    
    if (loginData.accessToken) {
      localStorage.setItem('accessToken', loginData.accessToken);
      localStorage.setItem('refreshToken', loginData.refreshToken);
      console.log('✅ Tokens saved to localStorage');
      
      // Test 3: Users API
      console.log('\n👥 Testing Users API...');
      const usersRes = await fetch(`${API_BASE}/api/users`, {
        headers: { 'Authorization': `Bearer ${loginData.accessToken}` }
      });
      const usersData = await usersRes.json();
      console.log('Users:', usersRes.status, usersData);
      
      // Test 4: Reports API
      console.log('\n📊 Testing Reports API...');
      const reportsRes = await fetch(`${API_BASE}/api/reports/overview`, {
        headers: { 'Authorization': `Bearer ${loginData.accessToken}` }
      });
      const reportsData = await reportsRes.json();
      console.log('Reports:', reportsRes.status, reportsData);
      
      console.log('\n🎉 All tests completed!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run tests
testAPIs();
















