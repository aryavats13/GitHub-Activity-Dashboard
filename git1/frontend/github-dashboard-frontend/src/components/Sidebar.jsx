import React from 'react';
import { useNavigate } from 'react-router-dom';

const Sidebar = ({ isOpen, toggleSidebar, username, setUsername, token, setToken }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('username');
    navigate('/');
  };

  return (
    <div className={`fixed top-0 left-0 bottom-0 bg-[#0d1117] border-r border-[#30363d] shadow-lg z-10 transition-all duration-300 ${isOpen ? 'w-80' : 'w-[60px]'}`}>
      <button 
        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-[#21262d] text-[#c9d1d9] border border-[#30363d] rounded-md hover:bg-[#30363d] transition-colors" 
        onClick={toggleSidebar}
      >
        {isOpen ? '←' : '→'}
      </button>

      {isOpen ? (
        <div className="p-6 pt-16">
          <h2 className="text-2xl font-bold text-[#58a6ff] mb-8">GitHub Analyzer</h2>
          
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-[#c9d1d9] mb-4 pb-2 border-b border-[#30363d]">Configuration</h3>
            
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-[#c9d1d9]">GitHub Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full p-2.5 bg-[#161b22] border border-[#30363d] rounded-md text-[#c9d1d9] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
              />
            </div>

            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-[#c9d1d9]">GitHub Token (Optional)</label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter token"
                className="w-full p-2.5 bg-[#161b22] border border-[#30363d] rounded-md text-[#c9d1d9] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
              />
            </div>

            <p className="text-xs text-[#8b949e] italic mt-2">
              Token gives you higher rate limits and access to private repos.
            </p>
          </div>

          <div className="features-section">
            <h3>Features</h3>
            <ul>
              <li>Commit pattern analysis</li>
              <li>Repository insights</li>
              <li>Activity predictions</li>
              <li>Recommendations</li>
            </ul>
          </div>

          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      ) : (
        <div className="sidebar-collapsed">
          <span className="vertical-text">GITHUB ANALYSIS</span>
        </div>
      )}
    </div>
  );
};

export default Sidebar;