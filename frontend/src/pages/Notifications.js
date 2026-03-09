import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Notifications.css';

const API_BASE_URL = 'http://localhost:8000';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const currentUserId = localStorage.getItem('userId');

  // 加载通知
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!currentUserId) {
        navigate('/login');
        return;
      }

      try {
        const response = await axios.get(`http://localhost:8000/notifications/${currentUserId}`);
        const notificationsData = response.data.notifications || [];
        
        // 转换数据格式
        const formattedNotifications = notificationsData.map(notification => ({
          id: notification.notification_id,
          type: notification.type,
          title: notification.title,
          content: notification.content,
          from_user: notification.related_user,
          created_at: notification.create_time,
          is_read: notification.is_read
        }));

        setNotifications(formattedNotifications);
        setUnreadCount(formattedNotifications.filter(n => !n.is_read).length);
        setLoading(false);
      } catch (err) {
        console.error('获取通知失败:', err);
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [currentUserId, navigate]);

  // 标记为已读
  const markAsRead = async (notificationId) => {
    try {
      await axios.put(
        `http://localhost:8000/notifications/${notificationId}/read`,
        { user_id: currentUserId }
      );
      
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('标记已读失败:', err);
    }
  };

  // 标记所有为已读
  const markAllAsRead = async () => {
    try {
      await axios.put(`http://localhost:8000/notifications/${currentUserId}/read-all`);
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('标记所有已读失败:', err);
    }
  };

  // 格式化时间
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) {
      return '刚刚';
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}分钟前`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}小时前`;
    } else if (diff < 604800000) {
      return `${Math.floor(diff / 86400000)}天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  };

  // 获取通知图标
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'message':
        return '💬';
      case 'like':
        return '❤️';
      case 'comment':
        return '💭';
      case 'follow':
        return '👥';
      default:
        return '🔔';
    }
  };

  if (loading) return <div className="loading">加载中...</div>;

  return (
    <div className="notifications-container">
      <div className="notifications-card">
        {/* 头部 */}
        <div className="notifications-header">
          <button 
            className="back-btn" 
            onClick={() => navigate(-1)}
          >
            ← 返回
          </button>
          <h2>通知中心</h2>
          <div className="header-actions">
            {unreadCount > 0 && (
              <button 
                className="mark-all-read-btn"
                onClick={markAllAsRead}
              >
                全部已读
              </button>
            )}
          </div>
        </div>

        {/* 通知列表 */}
        <div className="notifications-list">
          {notifications.length === 0 ? (
            <div className="no-notifications">
              <p>暂无通知</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div 
                key={notification.id}
                className={`notification-item ${notification.is_read ? 'read' : 'unread'}`}
                onClick={() => !notification.is_read && markAsRead(notification.id)}
              >
                <div className="notification-icon">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="notification-content">
                  <h4 className="notification-title">{notification.title}</h4>
                  <p className="notification-text">{notification.content}</p>
                  <span className="notification-time">{formatTime(notification.created_at)}</span>
                </div>
                {!notification.is_read && (
                  <div className="unread-indicator"></div>
                )}
              </div>
            ))
          )}
        </div>

        {/* 底部统计 */}
        {notifications.length > 0 && (
          <div className="notifications-footer">
            <p>共 {notifications.length} 条通知，{unreadCount} 条未读</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
