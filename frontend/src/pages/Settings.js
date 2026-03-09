import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Settings.css';

const Settings = () => {
  const [isProfilePublic, setIsProfilePublic] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const currentUserId = localStorage.getItem('userId');

  useEffect(() => {
    fetchUserSettings();
  }, []);

  const fetchUserSettings = async () => {
    try {
      const response = await axios.get(`http://localhost:8000/profile/${currentUserId}`);
      setIsProfilePublic(response.data.is_profile_public !== false);
      setLoading(false);
    } catch (error) {
      console.error('获取用户设置失败:', error);
      setLoading(false);
    }
  };

  const handleTogglePrivacy = async () => {
    setSaving(true);
    setMessage('');
    
    try {
      const formData = new FormData();
      formData.append('is_profile_public', !isProfilePublic);
      
      await axios.put(`http://localhost:8000/profile/${currentUserId}`, formData);
      
      setIsProfilePublic(!isProfilePublic);
      setMessage('设置已保存');
      
      setTimeout(() => {
        setMessage('');
      }, 2000);
    } catch (error) {
      console.error('保存设置失败:', error);
      setMessage('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="settings-container">加载中...</div>;
  }

  return (
    <div className="settings-container">
      <h1>设置</h1>
      
      <div className="settings-section">
        <h2>隐私设置</h2>
        
        <div className="setting-item">
          <div className="setting-info">
            <h3>公开个人信息</h3>
            <p>开启后，其他用户可以在社区中查看您的个人资料</p>
          </div>
          <div className="setting-control">
            <label className="switch">
              <input
                type="checkbox"
                checked={isProfilePublic}
                onChange={handleTogglePrivacy}
                disabled={saving}
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>
        
        {message && (
          <div className={`message ${message.includes('失败') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
