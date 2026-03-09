import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import './Chat.css';

const API_BASE_URL = 'http://localhost:8000';

const Chat = () => {
  const { userId: targetUserId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [targetUser, setTargetUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const currentUserId = localStorage.getItem('userId');

  // 获取目标用户信息
  useEffect(() => {
    const fetchTargetUser = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/profile/${targetUserId}`);
        setTargetUser(response.data);
      } catch (err) {
        console.error('获取用户信息失败:', err);
      }
    };

    if (targetUserId) {
      fetchTargetUser();
    }
  }, [targetUserId]);

  // 获取聊天记录
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/messages/${currentUserId}/chat/${targetUserId}`
        );
        setMessages(response.data.messages || []);
        setLoading(false);
      } catch (err) {
        console.error('获取聊天记录失败:', err);
        setLoading(false);
      }
    };

    if (currentUserId && targetUserId) {
      fetchMessages();
      // 每5秒刷新一次消息
      const interval = setInterval(fetchMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [currentUserId, targetUserId]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 发送消息
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const response = await axios.post(`${API_BASE_URL}/messages`, {
        sender_id: parseInt(currentUserId),
        receiver_id: parseInt(targetUserId),
        content: newMessage.trim()
      });

      if (response.data.message === '消息发送成功') {
        setNewMessage('');
        // 立即刷新消息列表
        const messagesResponse = await axios.get(
          `${API_BASE_URL}/messages/${currentUserId}/chat/${targetUserId}`
        );
        setMessages(messagesResponse.data.messages || []);
      }
    } catch (err) {
      console.error('发送消息失败:', err);
      alert('发送消息失败，请重试');
    }
  };

  // 格式化时间
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) return <div className="loading">加载中...</div>;

  return (
    <div className="chat-container">
      <div className="chat-card">
        {/* 聊天头部 */}
        <div className="chat-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            ← 返回
          </button>
          <div className="chat-user-info">
            {targetUser && (
              <>
                <img 
                  src={targetUser.avatar ? `${API_BASE_URL}${targetUser.avatar}` : '/default-avatar.png'}
                  alt={targetUser.username}
                  className="chat-avatar"
                />
                <span className="chat-username">{targetUser.username}</span>
              </>
            )}
          </div>
          <div className="placeholder"></div>
        </div>

        {/* 消息列表 */}
        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="no-messages">
              <p>还没有消息，开始聊天吧！</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div 
                key={index}
                className={`message-item ${msg.sender_id === parseInt(currentUserId) ? 'sent' : 'received'}`}
              >
                <div className="message-content">
                  <p>{msg.content}</p>
                  <span className="message-time">{formatTime(msg.create_time)}</span>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入框 */}
        <form className="message-input-container" onSubmit={handleSendMessage}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="输入消息..."
            className="message-input"
          />
          <button type="submit" className="send-btn" disabled={!newMessage.trim()}>
            发送
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
