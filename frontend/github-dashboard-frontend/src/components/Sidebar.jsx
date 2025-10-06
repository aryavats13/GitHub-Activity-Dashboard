import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = ({ isOpen, toggleSidebar, username, setUsername, token, setToken }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('username');
    navigate('/');
  };

  return (
    <div className={`sidebar ${isOpen ? '' : 'closed'}`}>
      <button className="toggle-btn" onClick={toggleSidebar}>
        {isOpen ? '←' : '→'}
      </button>

      {isOpen ? (
        <div className="sidebar-content">
          <h2>GitHub Analyzer</h2>
          
          <div className="input-section">
            <h3>Configuration</h3>
            
            <div className="input-group">
              <label>GitHub Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
              />
            </div>

            <div className="input-group">
              <label>GitHub Token (Optional)</label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter token"
              />
            </div>

            <p className="info-text">
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