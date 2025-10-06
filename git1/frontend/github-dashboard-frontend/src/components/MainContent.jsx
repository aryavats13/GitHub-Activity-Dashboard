import React, { useState } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const MainContent = ({ username, token, sidebarOpen }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState(null);

  const handleAnalyze = async () => {
    if (!username) {
      alert('Please enter a GitHub username');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`https://github-activity-backend.onrender.com/api/analyze/full/${username}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token || null, max_repos: 15 })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('API Response:', result);
        setData(result);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch data');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Network error: Could not connect to backend');
    } finally {
      setLoading(false);
    }
  };

  const getHourlyData = () => {
    if (!data?.patterns?.hourly_commits) return [];
    const hourly = data.patterns.hourly_commits;
    return Object.entries(hourly)
      .map(([hour, commits]) => ({ hour: `${hour}:00`, commits: commits }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
  };

  const getDailyData = () => {
    if (!data?.patterns?.daily_commits) return [];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const daily = data.patterns.daily_commits;
    return days.map(day => ({ day: day.slice(0, 3), commits: daily[day] || 0 }));
  };

  const getLanguageData = () => {
    if (!data?.repos || !Array.isArray(data.repos)) return [];
    const langCount = {};
    data.repos.forEach(repo => {
      if (repo.language && repo.language !== 'None' && repo.language !== null) {
        langCount[repo.language] = (langCount[repo.language] || 0) + 1;
      }
    });
    return Object.entries(langCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  };

  const getTopWords = () => {
    if (!data?.message_analysis?.word_freq) return [];
    return data.message_analysis.word_freq.slice(0, 10).map(([word, count]) => ({ word, count }));
  };

  const getActionData = () => {
    if (!data?.message_analysis?.action_counts) return [];
    return Object.entries(data.message_analysis.action_counts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  };

  const COLORS = ['#58a6ff', '#1f6feb', '#388bfd', '#0969da', '#0550ae', '#033d8b'];

  return (
    <div className={`fixed top-0 ${sidebarOpen ? 'left-80' : 'left-[60px]'} right-0 bottom-0 bg-[#0d1117] p-6 transition-all duration-300 text-[#c9d1d9] overflow-y-auto`}>
      {/* Header Section */}
      <div className="flex justify-between items-center mb-7 gap-5 flex-wrap">
        <div>
          <h1 className="text-[1.75rem] font-bold text-[#c9d1d9] m-0 mb-1 tracking-tight">GitHub Activity Dashboard</h1>
          <p className="text-[0.9rem] text-[#8b949e] m-0">Deep insights into your development patterns</p>
        </div>
        <button 
          className="py-2.5 px-6 bg-[#58a6ff] text-white border-none rounded-md text-[0.9rem] font-semibold cursor-pointer transition-all duration-200 flex items-center gap-2 whitespace-nowrap hover:bg-[#1f6feb] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(88,166,255,0.3)] disabled:opacity-60 disabled:cursor-not-allowed" 
          onClick={handleAnalyze} 
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full inline-block animate-spin"></span>
              Analyzing...
            </>
          ) : (
            '▶ Start Analysis'
          )}
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Fetching your GitHub data...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="error-box">
          <strong>⚠ Error:</strong> {error}
        </div>
      )}

      {/* Main Content */}
      {data && (
        <>
          {/* Navigation Tabs */}
          <div className="tabs-container">
            {['overview', 'commits', 'repos', 'patterns', 'recommendations'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="tab-panel">
                {/* Stats Grid */}
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{data.summary?.total_repos || 0}</div>
                    <div className="stat-label">Repositories</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{data.summary?.total_commits || 0}</div>
                    <div className="stat-label">Total Commits</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{data.summary?.active_repos || 0}</div>
                    <div className="stat-label">Active Repos</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{data.summary?.days_active || 0}</div>
                    <div className="stat-label">Days Active</div>
                  </div>
                </div>

                {/* Repository Stats */}
                <div className="card">
                  <h2>Repository Statistics</h2>
                  <div className="mini-stats">
                    <div className="mini-stat">
                      <div className="mini-stat-value">{data.summary?.avg_stars?.toFixed(1) || '0'}</div>
                      <div className="mini-stat-label">Avg Stars per Repo</div>
                    </div>
                    <div className="mini-stat">
                      <div className="mini-stat-value">{data.summary?.avg_forks?.toFixed(1) || '0'}</div>
                      <div className="mini-stat-label">Avg Forks per Repo</div>
                    </div>
                  </div>
                </div>

                {/* Language Distribution */}
                {getLanguageData().length > 0 && (
                  <div className="card">
                    <h2>Programming Languages</h2>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={getLanguageData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={90}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {getLanguageData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Recent Activity */}
                {data.commits && data.commits.length > 0 && (
                  <div className="card">
                    <h2>Recent Commits</h2>
                    <div className="commits-list">
                      {data.commits.slice(0, 5).map((commit, i) => (
                        <div key={i} className="commit-item">
                          <div className="commit-repo">{commit.repo_name}</div>
                          <div className="commit-message">{commit.message?.split('\n')[0] || 'No message'}</div>
                          <div className="commit-date">{new Date(commit.date).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* COMMITS TAB */}
            {activeTab === 'commits' && (
              <div className="tab-panel">
                {getHourlyData().length > 0 && (
                  <div className="card">
                    <h2>Commits by Hour of Day</h2>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={getHourlyData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                        <XAxis dataKey="hour" stroke="#8b949e" />
                        <YAxis stroke="#8b949e" />
                        <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d' }} />
                        <Bar dataKey="commits" fill="#58a6ff" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {getDailyData().length > 0 && (
                  <div className="card">
                    <h2>Commits by Day of Week</h2>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={getDailyData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                        <XAxis dataKey="day" stroke="#8b949e" />
                        <YAxis stroke="#8b949e" />
                        <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d' }} />
                        <Bar dataKey="commits" fill="#1f6feb" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="card">
                  <h2>Commit Quality Metrics</h2>
                  <div className="mini-stats">
                    <div className="mini-stat">
                      <div className="mini-stat-value">{data.patterns?.avg_message_length?.toFixed(0) || '0'}</div>
                      <div className="mini-stat-label">Avg Message Length</div>
                    </div>
                    <div className="mini-stat">
                      <div className="mini-stat-value">{data.patterns?.fix_commits_pct?.toFixed(1) || '0'}%</div>
                      <div className="mini-stat-label">Fix-related Commits</div>
                    </div>
                    <div className="mini-stat">
                      <div className="mini-stat-value">{data.patterns?.longest_streak || '0'}</div>
                      <div className="mini-stat-label">Longest Streak (days)</div>
                    </div>
                    <div className="mini-stat">
                      <div className="mini-stat-value">{data.patterns?.longest_gap || '0'}</div>
                      <div className="mini-stat-label">Longest Gap (days)</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* REPOS TAB */}
            {activeTab === 'repos' && (
              <div className="tab-panel">
                <div className="card">
                  <h2>Your Repositories</h2>
                  <div className="repos-grid">
                    {data.repos?.slice(0, 15).map((repo, i) => (
                      <div key={i} className="repo-card" onClick={() => window.open(repo.url, '_blank')}>
                        <h3>{repo.name}</h3>
                        <p>{repo.description || 'No description'}</p>
                        <div className="repo-stats">
                          <span>⭐ {repo.stars || 0}</span>
                          <span>🔱 {repo.forks || 0}</span>
                          {repo.language && <span>💻 {repo.language}</span>}
                          <span>📦 {(repo.size / 1024).toFixed(1)} MB</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* PATTERNS TAB */}
            {activeTab === 'patterns' && (
              <div className="tab-panel">
                {getTopWords().length > 0 && (
                  <div className="card">
                    <h2>Most Common Words in Commits</h2>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={getTopWords()} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                        <XAxis type="number" stroke="#8b949e" />
                        <YAxis dataKey="word" type="category" width={100} stroke="#8b949e" />
                        <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d' }} />
                        <Bar dataKey="count" fill="#58a6ff" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {getActionData().length > 0 && (
                  <div className="card">
                    <h2>Common Action Words</h2>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={getActionData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                        <XAxis dataKey="action" stroke="#8b949e" />
                        <YAxis stroke="#8b949e" />
                        <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d' }} />
                        <Bar dataKey="count" fill="#1f6feb" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="card">
                  <h2>Peak Activity Times</h2>
                  <div className="peak-times">
                    <div className="peak-card peak-hour">
                      <div className="peak-label">Most Active Hour</div>
                      <div className="peak-value">
                        {data.patterns?.peak_hour !== undefined ? `${data.patterns.peak_hour}:00` : 'N/A'}
                      </div>
                    </div>
                    <div className="peak-card peak-day">
                      <div className="peak-label">Most Active Day</div>
                      <div className="peak-value">{data.patterns?.peak_day || 'N/A'}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* RECOMMENDATIONS TAB */}
            {activeTab === 'recommendations' && (
              <div className="tab-panel">
                <div className="card">
                  <h2>Personalized Recommendations</h2>
                  {data.recommendations && data.recommendations.length > 0 ? (
                    <div className="recommendations-list">
                      {data.recommendations.map((rec, i) => (
                        <div key={i} className="recommendation-card">
                          <span className="rec-badge">{rec.category}</span>
                          <h3>{rec.title}</h3>
                          <p>{rec.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-state">No recommendations available yet. Complete the analysis first.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Empty State */}
      {!data && !loading && !error && (
        <div className="empty-state-container">
          <h2>Ready to Analyze</h2>
          <p>Enter your GitHub username in the sidebar and click "Start Analysis" to begin</p>
        </div>
      )}
    </div>
  );
};
export default MainContent