import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import MainContent from '../components/MainContent';
import '../pages/Dashboard.css';

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');

  return (
    <div className="dashboard">
      <Sidebar 
        isOpen={sidebarOpen} 
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        username={username}
        setUsername={setUsername}
        token={token}
        setToken={setToken}
      />
      <MainContent 
        username={username} 
        token={token}
        sidebarOpen={sidebarOpen}
      />
    </div>
  );
};

export default Dashboard;
