import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Layout.css';

const Layout = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserInfo = async () => {
      const userId = localStorage.getItem('userId');
      if (userId) {
        try {
          const response = await axios.get(`http://localhost:8000/profile/${userId}`);
          setUserInfo(response.data);
        } catch (error) {
          console.error('获取用户信息失败:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    const fetchUnreadNotifications = async () => {
      const userId = localStorage.getItem('userId');
      if (userId) {
        try {
          const response = await axios.get(`http://localhost:8000/notifications/${userId}/unread-count`);
          setUnreadNotificationCount(response.data.unread_count || 0);
        } catch (error) {
          console.error('获取未读通知失败:', error);
        }
      }
    };

    fetchUserInfo();
    fetchUnreadNotifications();
    
    // 每30秒刷新一次未读通知数量
    const interval = setInterval(fetchUnreadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    {
      name: '学习助手',
      icon: '📚',
      path: '/study-assistant'
    },
    {
      name: '知识点管理',
      icon: '📝',
      path: '/knowledge-management'
    },
    {
      name: '知识点导图',
      icon: '🗺️',
      path: '/knowledge-mindmap'
    },
    {
      name: '学情分析',
      icon: '📊',
      path: '/learning-analysis'
    },
    {
      name: 'AI问答',
      icon: '🤖',
      path: '/ai-qna'
    },
    {
      name: '习题生成',
      icon: '✏️',
      path: '/question-generator'
    },
    {
      name: '习题历史',
      icon: '📚',
      path: '/exercise-history'
    },
    {
      name: '学习社区',
      icon: '👥',
      path: '/learning-community'
    },
    {
      name: '个人中心',
      icon: '👤',
      path: '/profile'
    }
  ];

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="app-layout">
      {/* 顶部导航栏 */}
      <header className="top-nav">
        <div className="nav-left">
          <button 
            className="sidebar-toggle" 
            onClick={toggleSidebar}
            aria-label="切换侧边栏"
          >
            {isSidebarCollapsed ? '☰' : '☰'}
          </button>
          <div className="logo">
            <div className="logo-icon">
              <img src="/logo_svg.svg" alt="学习助手" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <span className="logo-text">计算机考研学习助手</span>
          </div>
        </div>
        
        <div className="nav-center">
          <div className="search-box">
            <input 
              type="text" 
              placeholder="搜索知识点、社区帖子..."
              className="search-input"
            />
            <button className="search-btn">🔍</button>
          </div>
        </div>
        
        <div className="nav-right">
          <div className="notification-btn-container">
            <button 
              className="nav-btn notification-btn" 
              aria-label="通知"
              onClick={() => navigate('/notifications')}
            >
              🔔
              {unreadNotificationCount > 0 && (
                <span className="notification-badge">{unreadNotificationCount}</span>
              )}
            </button>
          </div>
          <button 
            className="nav-btn" 
            aria-label="设置"
            onClick={() => navigate('/settings')}
          >
            ⚙️
          </button>
          <div 
            className="user-profile"
            onClick={() => navigate('/profile')}
            style={{ cursor: 'pointer' }}
          >
            <img 
              src={userInfo?.avatar ? `http://localhost:8000${userInfo.avatar}` : "https://via.placeholder.com/40"} 
              alt="用户头像" 
              className="user-avatar"
            />
            <span className="user-name">{userInfo?.username || '用户名'}</span>
          </div>
        </div>
      </header>

      <div className="main-container">
        {/* 侧边导航栏 */}
        <aside 
          className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}
        >
          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <Link 
                key={item.path} 
                to={item.path} 
                className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-text">{item.name}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* 主内容区域 */}
        <main className="content-area">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;