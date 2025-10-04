import React, { useState } from 'react';
import './Auth.css';
import { useNavigate } from 'react-router-dom';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async () => {
    setLoading(true);

    const endpoint = isLogin
      ? 'http://127.0.0.1:5000/api/auth/login'
      : 'http://127.0.0.1:5000/api/auth/register';

    const payload = {
      username,
      password,
      ...(isLogin ? {} : { email })
    };
      console.log("Submitting payload to backend:", payload);
      console.log("Endpoint:", endpoint);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        alert(`${isLogin ? 'Login' : 'Sign Up'} successful!`);
        if (isLogin) {
          localStorage.setItem('username', username);
          navigate('/dashboard'); // ✅ correct way to redirect
        }
      } else {
        alert(`Error: ${data.message || 'Something went wrong'}`);
      }
    } catch (err) {
      console.error('Network error:', err);
      alert('Network error, check console.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-container">
        <h1>{isLogin ? 'Login' : 'Sign Up'}</h1>

        <div className="input-group">
          <label>Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
          />
        </div>

        {!isLogin && (
          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
            />
          </div>
        )}

        <div className="input-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
          />
        </div>

        <button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Please wait...' : isLogin ? 'Login' : 'Sign Up'}
        </button>

        <div className="footer">
          <p onClick={() => setIsLogin(!isLogin)}>
            {isLogin
              ? "Don't have an account? Sign Up"
              : 'Already have an account? Login'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
