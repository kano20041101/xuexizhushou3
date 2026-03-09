import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Login.css';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username || !password) {
      setError('用户名和密码不能为空');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('http://localhost:8000/login', {
        username,
        password
      });

      if (response.data.user_id) {
        localStorage.setItem('userId', response.data.user_id);
        navigate('/profile');
      } else {
        setError('登录失败，请重试');
      }
    } catch (err) {
      setError(err.response?.data?.detail || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>登录</h2>
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}
          <div className="form-group">
            <label htmlFor="username">用户名</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="button-group">
            <button type="submit" disabled={loading} className="login-button">
              {loading ? '登录中...' : '登录'}
            </button>
            <button type="button" onClick={() => navigate('/register')} className="register-button">
              注册
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;