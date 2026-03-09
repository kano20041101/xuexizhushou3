import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import './Profile.css';

const API_BASE_URL = 'http://localhost:8000';

// 获取等级称号
const getLevelTitle = (level) => {
  const titles = {
    1: '初入考研',
    2: '研途新星',
    3: '研途之星',
    4: '研途精英',
    5: '研途高手',
    6: '研途大师',
    7: '研途传说'
  };
  return titles[level] || '初入考研';
};

const Profile = () => {
  const { userId: paramUserId } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    grade: '',
    postgraduate_session: '',
    school: '',
    major: '',
    target_school: '',
    target_major: '',
    target_score: '',
    signature: ''
  });
  const [avatarPreview, setAvatarPreview] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [isMutualFollow, setIsMutualFollow] = useState(false);
  const [isProfilePublic, setIsProfilePublic] = useState(true);
  const [followModal, setFollowModal] = useState({
    isOpen: false,
    type: 'followers',
    list: [],
    loading: false,
    searchKeyword: '',
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
    hasMore: false
  });
  const [privilegeModal, setPrivilegeModal] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const currentUserId = localStorage.getItem('userId');
  const isOwnProfile = !paramUserId || String(paramUserId) === String(currentUserId);
  
  // 调试日志
  console.log('Debug:', {
    paramUserId,
    currentUserId,
    isOwnProfile,
    'paramUserId type': typeof paramUserId,
    'currentUserId type': typeof currentUserId,
    'String(paramUserId)': String(paramUserId),
    'String(currentUserId)': String(currentUserId),
    'String(paramUserId) === String(currentUserId)': String(paramUserId) === String(currentUserId)
  });

  // 加载用户信息
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // 确定要查看的用户ID
        const targetUserId = paramUserId || currentUserId;
        
        if (!targetUserId) {
          navigate('/login');
          return;
        }

        const response = await axios.get(`http://localhost:8000/profile/${targetUserId}`);
        const userData = response.data;
        setUser(userData);
        setIsProfilePublic(userData.is_profile_public !== false);
        setFormData({
          username: userData.username,
          grade: userData.grade || '',
          postgraduate_session: userData.postgraduate_session || '',
          school: userData.school || '',
          major: userData.major || '',
          target_school: userData.target_school || '',
          target_major: userData.target_major || '',
          target_score: userData.target_score || '',
          signature: userData.signature || ''
        });
        setAvatarPreview(userData.avatar ? `${API_BASE_URL}${userData.avatar}` : '/default-avatar.png');
        
        // 获取关注状态（如果查看的是其他用户的主页）
        if (paramUserId && currentUserId) {
          try {
            const followResponse = await axios.get(
              `http://localhost:8000/users/${currentUserId}/follow-status/${paramUserId}`
            );
            setIsFollowing(followResponse.data.is_following);
            setIsMutualFollow(followResponse.data.is_mutual_follow);
          } catch (followErr) {
            console.error('Fetch follow status error:', followErr);
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Profile error:', err);
        // 即使获取失败，也显示表单让用户填写
        const targetUserId = paramUserId || currentUserId;
        if (targetUserId) {
          // 创建一个基本的用户对象
          const basicUser = {
            id: targetUserId,
            username: '用户' + targetUserId
          };
          setUser(basicUser);
          setFormData({
            username: '用户' + targetUserId,
            grade: '',
            postgraduate_session: '',
            school: '',
            major: '',
            target_school: '',
            target_major: '',
            target_score: '',
            signature: ''
          });
          setAvatarPreview('/default-avatar.png');
          
          // 获取关注状态（如果查看的是其他用户的主页）
          if (paramUserId && currentUserId) {
            try {
              const followResponse = await axios.get(
                `http://localhost:8000/users/${currentUserId}/follow-status/${paramUserId}`
              );
              setIsFollowing(followResponse.data.is_following);
              setIsMutualFollow(followResponse.data.is_mutual_follow);
            } catch (followErr) {
              console.error('Fetch follow status error:', followErr);
            }
          }
          
          setLoading(false);
        } else {
          setError('用户未登录，请重新登录');
          setLoading(false);
        }
      }
    };

    fetchUserProfile();
  }, [navigate, paramUserId, currentUserId]);

  // 处理表单输入变化
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 处理头像上传预览
  const handleAvatarChange = (e) => {
    if (!isOwnProfile) return;
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // 打开文件选择对话框
  const handleAvatarClick = () => {
    if (!isOwnProfile) return;
    fileInputRef.current.click();
  };

  // 提交表单数据
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isOwnProfile) return;
    
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        navigate('/login');
        return;
      }

      // 创建FormData对象处理文件上传
      const submitData = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        submitData.append(key, value);
      });

      // 如果有新头像文件，添加到FormData
      if (fileInputRef.current.files.length > 0) {
        submitData.append('avatar', fileInputRef.current.files[0]);
      }

      await axios.put(`http://localhost:8000/profile/${userId}`, submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // 显示成功消息并刷新页面数据
      alert('个人信息更新成功！');
      window.location.reload();
    } catch (err) {
      setError('更新信息失败，请重试');
      console.error('Update profile error:', err);
    }
  };

  // 退出登录
  const handleLogout = () => {
    localStorage.removeItem('userId');
    navigate('/login');
  };

  const handleStudyAssistant = () => {
    navigate('/study-assistant');
  };

  const handleFollow = async () => {
    if (!paramUserId || !currentUserId) return;
    
    try {
      const targetUserId = parseInt(paramUserId);
      const followerId = parseInt(currentUserId);
      
      if (followerId === targetUserId) {
        alert('不能关注自己');
        return;
      }
      
      const response = await axios.post(
        `http://localhost:8000/users/${targetUserId}/follow?follower_id=${followerId}`
      );
      
      // 重新获取关注状态
      const followResponse = await axios.get(
        `http://localhost:8000/users/${followerId}/follow-status/${targetUserId}`
      );
      setIsFollowing(followResponse.data.is_following);
      setIsMutualFollow(followResponse.data.is_mutual_follow);
    } catch (err) {
      console.error('Follow error:', err);
      alert('操作失败，请重试');
    }
  };

  // 打开关注/粉丝列表弹窗
  const openFollowModal = async (type) => {
    const targetUserId = paramUserId || currentUserId;
    if (!targetUserId) return;

    setFollowModal({
      isOpen: true,
      type,
      list: [],
      loading: true,
      searchKeyword: '',
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
      hasMore: false
    });

    try {
      const endpoint = type === 'followers'
        ? `http://localhost:8000/users/${targetUserId}/followers?current_user_id=${currentUserId || ''}&page=1&page_size=20`
        : `http://localhost:8000/users/${targetUserId}/following?current_user_id=${currentUserId || ''}&page=1&page_size=20`;

      const response = await axios.get(endpoint);
      const { list, total, total_pages } = response.data;
      setFollowModal(prev => ({
        ...prev,
        list: list,
        total: total,
        totalPages: total_pages,
        hasMore: total_pages > 1,
        loading: false
      }));
    } catch (err) {
      console.error('Fetch follow list error:', err);
      setFollowModal(prev => ({
        ...prev,
        loading: false
      }));
    }
  };

  // 关闭弹窗
  const closeFollowModal = () => {
    setFollowModal({
      isOpen: false,
      type: 'followers',
      list: [],
      loading: false,
      searchKeyword: '',
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
      hasMore: false
    });
  };

  // 处理搜索关键词变化
  const handleSearchChange = (e) => {
    setFollowModal(prev => ({
      ...prev,
      searchKeyword: e.target.value
    }));
  };

  // 获取过滤后的列表
  const getFilteredList = () => {
    if (!followModal.searchKeyword.trim()) {
      return followModal.list;
    }
    const keyword = followModal.searchKeyword.toLowerCase();
    return followModal.list.filter(item =>
      item.username.toLowerCase().includes(keyword)
    );
  };

  // 加载更多数据
  const loadMore = async () => {
    const targetUserId = paramUserId || currentUserId;
    if (!targetUserId || followModal.loading || !followModal.hasMore) return;

    const nextPage = followModal.page + 1;
    setFollowModal(prev => ({ ...prev, loading: true }));

    try {
      const endpoint = followModal.type === 'followers'
        ? `http://localhost:8000/users/${targetUserId}/followers?current_user_id=${currentUserId || ''}&page=${nextPage}&page_size=${followModal.pageSize}`
        : `http://localhost:8000/users/${targetUserId}/following?current_user_id=${currentUserId || ''}&page=${nextPage}&page_size=${followModal.pageSize}`;

      const response = await axios.get(endpoint);
      const { list, total_pages } = response.data;

      setFollowModal(prev => ({
        ...prev,
        list: [...prev.list, ...list],
        page: nextPage,
        hasMore: nextPage < total_pages,
        loading: false
      }));
    } catch (err) {
      console.error('Load more error:', err);
      setFollowModal(prev => ({ ...prev, loading: false }));
    }
  };

  // 跳转到用户主页
  const goToUserProfile = (userId) => {
    closeFollowModal();
    navigate(`/profile/${userId}`);
  };

  // 在列表中关注/取消关注用户
  const handleFollowInList = async (targetUserId, isCurrentlyFollowing) => {
    if (!currentUserId) {
      navigate('/login');
      return;
    }

    if (String(currentUserId) === String(targetUserId)) {
      alert('不能关注自己');
      return;
    }

    try {
      const followerId = parseInt(currentUserId);
      const followingId = parseInt(targetUserId);

      await axios.post(
        `http://localhost:8000/users/${followingId}/follow?follower_id=${followerId}`
      );

      // 更新列表中该用户的关注状态
      setFollowModal(prev => ({
        ...prev,
        list: prev.list.map(item =>
          item.user_id === targetUserId
            ? { ...item, is_following: !isCurrentlyFollowing }
            : item
        )
      }));

      // 如果当前在查看自己的主页，更新关注/粉丝数
      if (isOwnProfile) {
        const response = await axios.get(`http://localhost:8000/profile/${currentUserId}`);
        setUser(response.data);
      }
    } catch (err) {
      console.error('Follow in list error:', err);
      alert('操作失败，请重试');
    }
  };

  if (loading) return <div className="loading">加载中...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!user) return null;

  return (
    <div className="profile-container">
      <div className="profile-card">
        <h2>{isOwnProfile ? '个人信息' : `${user.username} 的主页`}</h2>
        {isOwnProfile ? (
          <form onSubmit={handleSubmit} className="profile-form">
            {/* 头像上传区域 */}
            <div className="avatar-section">
              <div className="avatar-container" onClick={handleAvatarClick}>
                <img
                  src={avatarPreview}
                  alt="头像"
                  className="avatar-img"
                />
                <div className="avatar-overlay">更换头像</div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarChange}
                  accept="image/*"
                  className="avatar-input"
                />
              </div>
              
              <div className="right-section">
                {/* 经验值 */}
                <div className="exp-section">
                  <div className="exp-header">
                    <span className="exp-label">经验值</span>
                    <button type="button" className="level-privilege-button-inline" onClick={() => setPrivilegeModal(true)} title="查看等级特权">
                      👑
                    </button>
                    <div className="exp-level-container">
                      <span className={`level-title level-${user.level?.current_level || 1}`}>{getLevelTitle(user.level?.current_level || 1)}</span>
                      <span className={`exp-level level-${user.level?.current_level || 1}`}>Lv.{user.level?.current_level || 1}</span>
                    </div>
                  </div>
                  <div className="exp-bar-container">
                    <div className="exp-bar">
                      <div className={`exp-progress level-${user.level?.current_level || 1}`} style={{ width: `${user.level?.progress_percentage || 0}%` }}></div>
                    </div>
                    <span className="exp-text">{user.level?.current_exp || 0} / {user.level?.required_exp || 100}</span>
                  </div>
                </div>

                {/* 关注数和粉丝数 */}
                <div className="follow-stats-section">
                  <div className="follow-stat-item clickable" onClick={() => openFollowModal('following')}>
                    <span className="follow-stat-number">{user.following_count || 0}</span>
                    <span className="follow-stat-label">关注</span>
                  </div>
                  <div className="follow-stat-divider"></div>
                  <div className="follow-stat-item clickable" onClick={() => openFollowModal('followers')}>
                    <span className="follow-stat-number">{user.followers_count || 0}</span>
                    <span className="follow-stat-label">粉丝</span>
                  </div>
                </div>

                {/* 个性签名 */}
                <div className="signature-section">
                  <span className="signature-label">个性签名</span>
                  <input
                    type="text"
                    name="signature"
                    value={formData.signature}
                    onChange={handleInputChange}
                    placeholder="输入你的个性签名"
                    className="signature-input"
                    maxLength="50"
                  />
                </div>
              </div>
            </div>

            {/* 表单字段区域 */}
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="username">用户名</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  disabled
                  className="disabled-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="grade">年级</label>
                <select name="grade" value={formData.grade} onChange={handleInputChange} className="form-select">
                  <option value="">请选择年级</option>
                  <option value="大一">大一</option>
                  <option value="大二">大二</option>
                  <option value="大三">大三</option>
                  <option value="大四">大四</option>
                  <option value="已毕业">已毕业</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="postgraduate_session">考研届数</label>
                <input
                  type="text"
                  id="postgraduate_session"
                  name="postgraduate_session"
                  value={formData.postgraduate_session}
                  onChange={handleInputChange}
                  placeholder="如：2026届"
                />
              </div>

              <div className="form-group">
                <label htmlFor="school">学校</label>
                <input
                  type="text"
                  id="school"
                  name="school"
                  value={formData.school}
                  onChange={handleInputChange}
                  placeholder="请输入就读学校"
                />
              </div>

              <div className="form-group">
                <label htmlFor="major">专业</label>
                <input
                  type="text"
                  id="major"
                  name="major"
                  value={formData.major}
                  onChange={handleInputChange}
                  placeholder="请输入就读专业"
                />
              </div>

              <div className="form-group">
                <label htmlFor="target_school">预期学校</label>
                <input
                  type="text"
                  id="target_school"
                  name="target_school"
                  value={formData.target_school}
                  onChange={handleInputChange}
                  placeholder="请输入目标学校"
                />
              </div>

              <div className="form-group">
                <label htmlFor="target_major">预期专业</label>
                <input
                  type="text"
                  id="target_major"
                  name="target_major"
                  value={formData.target_major}
                  onChange={handleInputChange}
                  placeholder="请输入目标专业"
                />
              </div>

              <div className="form-group">
                <label htmlFor="target_score">预期分数</label>
                <input
                  type="number"
                  id="target_score"
                  name="target_score"
                  value={formData.target_score}
                  onChange={handleInputChange}
                  step="0.5"
                  min="0"
                  max="500"
                  placeholder="请输入预期分数"
                />
              </div>
            </div>

            {/* 按钮区域 */}
            <div className="button-group">
              <button type="button" onClick={handleStudyAssistant} className="study-assistant-button">进入应用</button>
              <button type="submit" className="save-button">保存信息</button>
              <button type="button" onClick={handleLogout} className="logout-button">退出登录</button>
            </div>
          </form>
        ) : (
          <div className="profile-view">
            {/* 头像展示区域 */}
            <div className="avatar-section">
              <div className="avatar-container">
                <img
                  src={avatarPreview}
                  alt="头像"
                  className="avatar-img"
                />
              </div>

              <div className="right-section">
                <div className="exp-section">
                  <div className="exp-header">
                    <span className="exp-label">经验值</span>
                    <div className="exp-level-container">
                      <span className={`level-title level-${user.level?.current_level || 1}`}>{getLevelTitle(user.level?.current_level || 1)}</span>
                      <span className={`exp-level level-${user.level?.current_level || 1}`}>Lv.{user.level?.current_level || 1}</span>
                    </div>
                  </div>
                  <div className="exp-bar-container">
                    <div className="exp-bar">
                      <div className={`exp-progress level-${user.level?.current_level || 1}`} style={{ width: `${user.level?.progress_percentage || 0}%` }}></div>
                    </div>
                    <span className="exp-text">{user.level?.current_exp || 0} / {user.level?.required_exp || 100}</span>
                  </div>
                </div>

                {/* 关注数和粉丝数 */}
                <div className="follow-stats-section">
                  <div className="follow-stat-item clickable" onClick={() => openFollowModal('following')}>
                    <span className="follow-stat-number">{user.following_count || 0}</span>
                    <span className="follow-stat-label">关注</span>
                  </div>
                  <div className="follow-stat-divider"></div>
                  <div className="follow-stat-item clickable" onClick={() => openFollowModal('followers')}>
                    <span className="follow-stat-number">{user.followers_count || 0}</span>
                    <span className="follow-stat-label">粉丝</span>
                  </div>
                </div>

                {/* 个性签名 - 只在公开时显示 */}
                {isProfilePublic && formData.signature && (
                  <div className="signature-section">
                    <span className="signature-label">个性签名</span>
                    <span className="signature-display">{formData.signature}</span>
                  </div>
                )}

                {!isOwnProfile && (
                  <div className="action-buttons">
                    <button 
                      className={`follow-button ${isFollowing ? 'following' : ''} ${isMutualFollow ? 'mutual' : ''}`}
                      onClick={handleFollow}
                    >
                      {isMutualFollow ? '已互关' : isFollowing ? '已关注' : '关注'}
                    </button>
                    <button 
                      className="message-button"
                      onClick={() => navigate(`/chat/${paramUserId}`)}
                    >
                      私信
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 隐私提示 */}
            {!isProfilePublic && (
              <div className="privacy-notice">
                <p>🔒 该用户已设置隐私保护，个人信息不公开</p>
              </div>
            )}

            {/* 信息展示区域 - 只在公开时显示 */}
            {isProfilePublic && (
              <div className="form-grid">
                <div className="form-group">
                  <label>用户名</label>
                  <div className="info-display">{formData.username}</div>
                </div>

                {formData.grade && (
                  <div className="form-group">
                    <label>年级</label>
                    <div className="info-display">{formData.grade}</div>
                  </div>
                )}

                {formData.postgraduate_session && (
                  <div className="form-group">
                    <label>考研届数</label>
                    <div className="info-display">{formData.postgraduate_session}</div>
                  </div>
                )}

                {formData.school && (
                  <div className="form-group">
                    <label>学校</label>
                    <div className="info-display">{formData.school}</div>
                  </div>
                )}

                {formData.major && (
                  <div className="form-group">
                    <label>专业</label>
                    <div className="info-display">{formData.major}</div>
                  </div>
                )}

                {formData.target_school && (
                  <div className="form-group">
                    <label>预期学校</label>
                    <div className="info-display">{formData.target_school}</div>
                  </div>
                )}

                {formData.target_major && (
                  <div className="form-group">
                    <label>预期专业</label>
                    <div className="info-display">{formData.target_major}</div>
                  </div>
                )}

                {formData.target_score && (
                  <div className="form-group">
                    <label>预期分数</label>
                    <div className="info-display">{formData.target_score}</div>
                  </div>
                )}
              </div>
            )}

            {/* 按钮区域 */}
            <div className="button-group">
              <button type="button" onClick={() => navigate('/learning-community')} className="back-button">返回社区</button>
            </div>
          </div>
        )}
      </div>

      {/* 关注/粉丝列表弹窗 */}
      {followModal.isOpen && (
        <div className="follow-modal-overlay" onClick={closeFollowModal}>
          <div className="follow-modal" onClick={(e) => e.stopPropagation()}>
            <div className="follow-modal-header">
              <h3>{followModal.type === 'followers' ? '粉丝列表' : '关注列表'}</h3>
              <button className="follow-modal-close" onClick={closeFollowModal}>×</button>
            </div>
            {/* 搜索框 - 只在查看自己的列表时显示 */}
            {isOwnProfile && (
              <div className="follow-modal-search">
                <input
                  type="text"
                  placeholder="搜索用户..."
                  value={followModal.searchKeyword}
                  onChange={handleSearchChange}
                  className="follow-search-input"
                />
              </div>
            )}
            <div className="follow-modal-content">
              {followModal.loading && followModal.page === 1 ? (
                <div className="follow-modal-loading">加载中...</div>
              ) : followModal.list.length === 0 ? (
                <div className="follow-modal-empty">
                  {followModal.type === 'followers' ? '还没有粉丝' : '还没有关注任何人'}
                </div>
              ) : (
                <>
                  {(() => {
                    const filteredList = getFilteredList();
                    return filteredList.length === 0 ? (
                      <div className="follow-modal-empty">未找到匹配的用户</div>
                    ) : (
                      <>
                        <div className="follow-list">
                          {filteredList.map((item) => (
                            <div
                              key={item.user_id}
                              className="follow-list-item"
                            >
                              <div className="follow-list-user-info" onClick={() => goToUserProfile(item.user_id)}>
                                <img
                                  src={item.avatar ? `${API_BASE_URL}${item.avatar}` : '/default-avatar.png'}
                                  alt={item.username}
                                  className="follow-list-avatar"
                                />
                                <span className="follow-list-username">{item.username}</span>
                              </div>
                              {currentUserId && String(currentUserId) !== String(item.user_id) && (
                                <button
                                  className={`follow-list-btn ${item.is_following ? 'following' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleFollowInList(item.user_id, item.is_following);
                                  }}
                                >
                                  {item.is_following ? '已关注' : '关注'}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        {/* 加载更多按钮 */}
                        {!followModal.searchKeyword && followModal.hasMore && (
                          <div className="follow-load-more">
                            <button
                              className="follow-load-more-btn"
                              onClick={loadMore}
                              disabled={followModal.loading}
                            >
                              {followModal.loading ? '加载中...' : '加载更多'}
                            </button>
                          </div>
                        )}
                        {/* 分页信息 */}
                        {!followModal.searchKeyword && followModal.total > 0 && (
                          <div className="follow-pagination-info">
                            共 {followModal.total} 人，第 {followModal.page}/{followModal.totalPages} 页
                          </div>
                        )}
                      </>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 等级特权弹窗 */}
      {privilegeModal && (
        <div className="privilege-modal-overlay" onClick={() => setPrivilegeModal(false)}>
          <div className="privilege-modal" onClick={(e) => e.stopPropagation()}>
            <div className="privilege-modal-header">
              <h3>👑 等级特权</h3>
              <button className="privilege-modal-close" onClick={() => setPrivilegeModal(false)}>×</button>
            </div>
            <div className="privilege-modal-content">
              <div className="privilege-list">
                {[1, 2, 3, 4, 5, 6, 7].map((level) => {
                  const isCurrentLevel = (user?.level?.current_level || 1) === level;
                  const privilegeDesc = level === 2 
                    ? '发帖限制从1天/一贴提高为1天/3贴' 
                    : '即将解锁更多特权...';
                  return (
                    <div key={level} className={`privilege-item ${isCurrentLevel ? 'current' : ''}`}>
                      <span className="privilege-level">Lv.{level}</span>
                      <span className="privilege-desc">
                        {privilegeDesc}
                        {isCurrentLevel && <span className="current-badge">当前等级</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;