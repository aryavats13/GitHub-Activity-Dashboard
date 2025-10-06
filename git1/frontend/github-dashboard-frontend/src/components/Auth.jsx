import React, { useState } from 'react';
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
  ? 'https://github-activity-backend.onrender.com/api/auth/login'
  : 'https://github-activity-backend.onrender.com/api/auth/register';


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
    <div className="flex justify-center items-center w-full">
      <div className="w-full max-w-md p-12 rounded-2xl bg-[#0d1117cc] backdrop-blur-xl shadow-2xl text-center">
        <h1 className="text-[#58a6ff] mb-9 text-4xl font-extrabold tracking-tight">{isLogin ? 'Login' : 'Sign Up'}</h1>

        <div className="mb-6 text-left">
          <label className="block mb-2 font-semibold text-[#c9d1d9] text-sm tracking-wide">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            className="w-full py-3.5 px-4 border-2 border-[#30363d] rounded-xl text-[15px] transition-all duration-300 bg-[#161b22] text-[#c9d1d9] focus:outline-none focus:border-[#58a6ff] focus:shadow-[0_0_0_4px_rgba(88,166,255,0.2)] focus:-translate-y-0.5"
          />
        </div>

        {!isLogin && (
          <div className="mb-6 text-left">
            <label className="block mb-2 font-semibold text-[#c9d1d9] text-sm tracking-wide">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
              className="w-full py-3.5 px-4 border-2 border-[#30363d] rounded-xl text-[15px] transition-all duration-300 bg-[#161b22] text-[#c9d1d9] focus:outline-none focus:border-[#58a6ff] focus:shadow-[0_0_0_4px_rgba(88,166,255,0.2)] focus:-translate-y-0.5"
            />
          </div>
        )}

        <div className="mb-6 text-left">
          <label className="block mb-2 font-semibold text-[#c9d1d9] text-sm tracking-wide">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full py-3.5 px-4 border-2 border-[#30363d] rounded-xl text-[15px] transition-all duration-300 bg-[#161b22] text-[#c9d1d9] focus:outline-none focus:border-[#58a6ff] focus:shadow-[0_0_0_4px_rgba(88,166,255,0.2)] focus:-translate-y-0.5"
          />
        </div>

        <button 
          onClick={handleSubmit} 
          disabled={loading}
          className="w-full py-4 bg-[#58a6ff] text-white border-none text-base font-bold rounded-xl cursor-pointer transition-all duration-300 hover:bg-[#1f6feb] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(88,166,255,0.3)] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Please wait...' : isLogin ? 'Login' : 'Sign Up'}
        </button>

        <div className="mt-6">
          <p 
            onClick={() => setIsLogin(!isLogin)}
            className="text-[#8b949e] cursor-pointer hover:text-[#58a6ff] transition-colors duration-200"
          >
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
