import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './LearningCommunity.css';
import API_BASE_URL from '../config/api';

const LearningCommunity = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState('学习心得');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [activeTab, setActiveTab] = useState('推荐');
  const [currentUserId, setCurrentUserId] = useState(() => {
    const userId = localStorage.getItem('userId');
    return userId ? parseInt(userId) : 1;
  }); // 从localStorage获取当前登录用户ID
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojis] = useState([
    '😊', '😂', '❤️', '👍', '🎉', '🔥', '🤔', '👏',
    '🙏', '🤣', '😍', '🤩', '😎', '🤗', '🤫', '🤭',
    '😅', '😇', '😉', '😌', '🥰', '😘', '😗', '😙',
    '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐',
    '😢', '😭', '😤', '😠', '😡', '🤬', '😱', '😨',
    '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥',
    '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧',
    '😮', '😲', '😴', '🤤', '😪', '😵', '🤐', '🥴'
  ]);
  const [showComments, setShowComments] = useState({});
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [replyingTo, setReplyingTo] = useState({});
  const [communityStats, setCommunityStats] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeMenuPost, setActiveMenuPost] = useState(null); // 当前打开的菜单帖子ID

  useEffect(() => {
    // 初始化加载帖子和统计数据
    loadPosts();
    loadCommunityStats();
  }, []);

  const loadPosts = async (tab = activeTab, keyword = searchKeyword) => {
    try {
      console.log('加载帖子，标签:', tab, '搜索关键词:', keyword);
      
      // 构建查询参数
      const params = new URLSearchParams();
      
      if (tab === '我的帖子') {
        params.append('user_id', currentUserId);
      } else if (tab === '推荐' || tab === '最新' || tab === '热门') {
        params.append('category', tab);
      }
      
      // 如果有搜索关键词，添加搜索参数
      if (keyword && keyword.trim()) {
        params.append('search', keyword.trim());
      }
      
      // 传递当前用户ID，以便后端返回点赞状态
      if (currentUserId) {
        params.append('current_user_id', currentUserId);
      }
      
      console.log('请求参数:', params.toString());
      
      // 调用实际的后端API
      const response = await fetch(`http://localhost:8000/community/posts?${params.toString()}`);
      console.log('API响应状态:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('返回帖子数量:', data.length);
        setPosts(data);
      }
    } catch (error) {
      console.error('加载帖子失败:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsSearching(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadPosts();
  };

  const handleLoadMore = () => {
    // 实现加载更多功能
    console.log('加载更多');
  };

  const handleLike = async (postId) => {    //点赞功能
    try {
      const response = await fetch(`http://localhost:8000/community/posts/${postId}/like?user_id=${currentUserId}`, {
        method: 'POST'
      });

      if (response.ok) {
        const result = await response.json();
        console.log('点赞结果:', result);
        // 刷新帖子列表以更新点赞状态
        loadPosts();
      } else {
        const error = await response.json();
        console.error('点赞失败:', error);
        alert(`点赞失败: ${error.detail}`);
      }
    } catch (error) {
      console.error('点赞时发生错误:', error);
      alert('点赞失败，请稍后重试');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('确定要删除这条帖子吗？删除后无法恢复。')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/community/posts/${postId}?user_id=${currentUserId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('帖子删除成功');
        // 刷新帖子列表
        loadPosts();
      } else {
        const error = await response.json();
        console.error('删除帖子失败:', error);
        alert(`删除失败: ${error.detail}`);
      }
    } catch (error) {
      console.error('删除帖子时发生错误:', error);
      alert('删除失败，请稍后重试');
    }
  };

  const handleCreatePost = async () => {
    // 验证表单数据
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      alert('请填写标题和内容');
      return;
    }
    
    // 验证图片数量
    if (selectedFiles.length > 9) {
      alert('最多只能上传9张图片');
      return;
    }
    
    try {
      // 创建FormData对象
      const formData = new FormData();
      formData.append('user_id', currentUserId);
      formData.append('title', newPostTitle);
      formData.append('content', newPostContent);
      formData.append('category', newPostCategory);
      
      // 添加文件
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });
      
      // 调用实际的后端API发布帖子
      const response = await fetch('http://localhost:8000/community/posts', {
        method: 'POST',
        // 不需要设置Content-Type，浏览器会自动设置为multipart/form-data
        body: formData,
      });
      
      if (response.ok) {
        const result = await response.json();
        alert('帖子发布成功！');
        console.log('上传的文件:', result.uploaded_files);
        
        // 刷新帖子列表
        loadPosts();
        
        // 重置表单状态
        setNewPostTitle('');
        setNewPostContent('');
        setNewPostCategory('学习心得');
        setSelectedFiles([]);
        
        // 关闭模态框
        setShowCreateModal(false);
      } else {
        const errorResult = await response.json().catch(() => ({
          detail: '发布失败，请稍后重试'
        }));
        alert(`发布失败: ${errorResult.detail}`);
      }
    } catch (error) {
      console.error('发布帖子时发生异常:', error);
      alert('发布失败，请检查网络连接或稍后重试');
    }
  };

  const handleLoadComments = async (postId) => {
    try {
      const response = await fetch(`http://localhost:8000/community/posts/${postId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(prev => ({
          ...prev,
          [postId]: data
        }));
      }
    } catch (error) {
      console.error('加载评论失败:', error);
    }
  };

  const handleToggleComments = (postId) => {
    setShowComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
    
    if (!showComments[postId]) {
      handleLoadComments(postId);
    }
  };

  const handleSubmitComment = async (postId, parentCommentId = null) => {
    const commentContent = newComment[postId];
    if (!commentContent || !commentContent.trim()) {
      alert('请输入评论内容');
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/community/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: currentUserId,
          content: commentContent,
          parent_comment_id: parentCommentId
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('评论发布成功:', result);
        
        // 清空评论输入框
        setNewComment(prev => ({
          ...prev,
          [postId]: ''
        }));
        setReplyingTo(prev => ({
          ...prev,
          [postId]: null
        }));
        
        // 重新加载评论列表
        handleLoadComments(postId);
        
        // 更新帖子的评论数
        setPosts(prevPosts => prevPosts.map(post => 
          post.post_id === postId 
            ? { ...post, comment_count: result.post_comment_count }
            : post
        ));
      } else {
        const error = await response.json();
        console.error('评论失败:', error);
        alert(`评论失败: ${error.detail}`);
      }
    } catch (error) {
      console.error('评论时发生错误:', error);
      alert('评论失败，请稍后重试');
    }
  };

  const handleDeleteComment = async (commentId, postId) => {
    if (!window.confirm('确定要删除这条评论吗？')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/community/comments/${commentId}?user_id=${currentUserId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const result = await response.json();
        console.log('评论删除成功:', result);
        
        // 重新加载评论列表
        handleLoadComments(postId);
        
        // 更新帖子的评论数
        setPosts(prevPosts => prevPosts.map(post => 
          post.post_id === postId 
            ? { ...post, comment_count: result.post_comment_count }
            : post
        ));
      } else {
        const error = await response.json();
        console.error('删除评论失败:', error);
        alert(`删除评论失败: ${error.detail}`);
      }
    } catch (error) {
      console.error('删除评论时发生错误:', error);
      alert('删除评论失败，请稍后重试');
    }
  };

  const handleFavorite = async (postId) => {
    try {
      const response = await fetch(`http://localhost:8000/community/posts/${postId}/favorite?user_id=${currentUserId}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('收藏结果:', result);
        // 刷新帖子列表以更新收藏状态
        loadPosts();
      } else {
        const error = await response.json();
        console.error('收藏失败:', error);
        alert(`收藏失败: ${error.detail}`);
      }
    } catch (error) {
      console.error('收藏时发生错误:', error);
      alert('收藏失败，请稍后重试');
    }
  };

  const loadFavorites = async (keyword = searchKeyword) => {
    try {
      console.log('加载收藏列表，搜索关键词:', keyword);
      
      let url = `http://localhost:8000/community/favorites/${currentUserId}`;
      
      // 如果有搜索关键词，添加搜索参数
      if (keyword && keyword.trim()) {
        url += `?search=${encodeURIComponent(keyword.trim())}`;
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log('返回收藏数量:', data.length);
        setPosts(data);
      }
    } catch (error) {
      console.error('加载收藏失败:', error);
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  };

  const handleBack = () => {
    navigate('/study-assistant');
  };

  const loadCommunityStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/community/stats`);
      console.log('社区统计API响应状态:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('社区统计数据:', data);
        setCommunityStats(data);
      } else {
        console.error('社区统计API错误:', await response.text());
      }
    } catch (error) {
      console.error('加载社区统计失败:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchKeyword.trim()) {
      // 如果搜索框为空，重新加载当前标签页的帖子
      if (activeTab === '我的收藏') {
        loadFavorites('');
      } else {
        loadPosts(activeTab, '');
      }
      return;
    }
    
    setIsSearching(true);
    
    // 根据当前标签页决定调用哪个函数
    if (activeTab === '我的收藏') {
      await loadFavorites(searchKeyword);
    } else {
      await loadPosts(activeTab, searchKeyword);
    }
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClearSearch = () => {
    setSearchKeyword('');
    
    // 根据当前标签页决定调用哪个函数
    if (activeTab === '我的收藏') {
      loadFavorites('');
    } else {
      loadPosts(activeTab, '');
    }
  };

  return (
    <div className="learning-community-container">
      {/* 社区头部 */}
      <div className="community-header">
        <div className="header-content">
          <h1 className="header-title">学习社区</h1>
          <div className="header-actions">
            <div className="search-box">
              <input 
                type="text" 
                placeholder="搜索社区内容..."
                className="search-input"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyPress={handleSearchKeyPress}
              />
              {searchKeyword && (
                <button 
                  className="search-clear-btn"
                  onClick={handleClearSearch}
                >
                  ✕
                </button>
              )}
              <button 
                className="search-btn"
                onClick={handleSearch}
              >
                🔍
              </button>
            </div>
            <button 
              className="create-post-btn"
              onClick={() => setShowCreateModal(true)}
            >
              发布帖子
            </button>
          </div>
        </div>
      </div>

      {/* 社区导航 */}
      <div className="community-nav">
        <div className="nav-tabs">
          <button 
            className={`nav-tab ${activeTab === '推荐' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('推荐');
              setSearchKeyword('');
              loadPosts('推荐', '');
            }}
          >推荐</button>
          <button 
            className={`nav-tab ${activeTab === '最新' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('最新');
              setSearchKeyword('');
              loadPosts('最新', '');
            }}
          >最新</button>
          <button 
            className={`nav-tab ${activeTab === '热门' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('热门');
              setSearchKeyword('');
              loadPosts('热门', '');
            }}
          >热门</button>
          <button 
            className={`nav-tab ${activeTab === '我的帖子' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('我的帖子');
              setSearchKeyword('');
              loadPosts('我的帖子', '');
            }}
          >我的帖子</button>
          <button 
            className={`nav-tab ${activeTab === '我的收藏' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('我的收藏');
              setSearchKeyword('');
              loadFavorites('');
            }}
          >我的收藏</button>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="community-main">
        {/* 左侧帖子列表 */}
        <div className="posts-container">
          {/* 搜索结果提示 */}
          {searchKeyword && searchKeyword.trim() && (
            <div className="search-result-info">
              <span className="search-icon">🔍</span>
              <span className="search-text">
                搜索 "<strong>{searchKeyword}</strong>" 的结果，共找到 <strong>{posts.length}</strong> 个帖子
              </span>
              <button 
                className="clear-search-link"
                onClick={handleClearSearch}
              >
                清除搜索
              </button>
            </div>
          )}
          
          {/* 帖子列表 */}
          {activeTab === '我的收藏' && posts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📁</div>
              <h3>我的收藏</h3>
              <p>还没有收藏任何帖子，快去发现精彩内容吧！</p>
            </div>
          ) : posts.length === 0 && searchKeyword && searchKeyword.trim() ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <h3>未找到相关帖子</h3>
              <p>没有找到与 "{searchKeyword}" 相关的帖子，换个关键词试试吧！</p>
            </div>
          ) : (
            posts.map(post => (
              <div key={post.post_id} className="post-card">
              <div 
                className="post-card-content"
                onClick={() => navigate(`/post/${post.post_id}`)}
              >
              {/* 帖子头部 */}
              <div className="post-header">
                <div 
                  className="user-avatar-wrapper"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/profile/${post.user_id}`);
                  }}
                >
                  <img src={post.avatar ? `http://localhost:8000${post.avatar.replace('\\', '/')}` : 'https://via.placeholder.com/40'} alt={post.username} className="user-avatar" />
                </div>
                <div className="user-info">
                  <h3 className="username">{post.username}</h3>
                  <p className="post-time">{new Date(post.create_time).toLocaleString('zh-CN')}</p>
                </div>
                <div className="post-menu-container">
                  <button 
                    className="post-menu-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuPost(activeMenuPost === post.post_id ? null : post.post_id);
                    }}
                  >⋮</button>
                  
                  {/* 下拉菜单 */}
                  {activeMenuPost === post.post_id && (
                    <div className="post-menu-dropdown">
                      {post.user_id === currentUserId && (
                        <button 
                          className="menu-item delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePost(post.post_id);
                            setActiveMenuPost(null);
                          }}
                        >
                          🗑️ 删除
                        </button>
                      )}
                      <button 
                        className="menu-item report"
                        onClick={(e) => {
                          e.stopPropagation();
                          alert('举报功能开发中...');
                          setActiveMenuPost(null);
                        }}
                      >
                        🚨 举报
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 帖子内容 */}
              <div className="post-content">
                <h4 className="post-title">{post.title}</h4>
                <p>{post.content}</p>
              </div>

              {/* 帖子图片 */}
              {post.images && post.images.length > 0 && (
                <div className="post-images">
                  {post.images.map((image, index) => (
                    <img key={index} src={`http://localhost:8000${image}`} alt="Post image" className="post-image" />
                  ))}
                </div>
              )}
              </div>

              {/* 帖子底部操作栏 */}
              <div className="post-actions">
                <button 
                  className="action-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLike(post.post_id);
                  }}
                >
                  <span className="action-icon">{post.is_liked ? '❤️' : '🤍'}</span>
                  <span className="action-text">{post.like_count}</span>
                </button>
                <button 
                  className="action-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleComments(post.post_id);
                  }}
                >
                  <span className="action-icon">💬</span>
                  <span className="action-text">{post.comment_count}</span>
                </button>
                <button className="action-button">
                  <span className="action-icon">↗️</span>
                  <span className="action-text">0</span>
                </button>
                <button 
                  className={`action-button ${post.is_favorited ? 'favorited' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFavorite(post.post_id);
                  }}
                >
                  <span className="action-icon">{post.is_favorited ? '📌' : '📌'}</span>
                  <span className="action-text">{post.is_favorited ? '已收藏' : '收藏'}</span>
                </button>
              </div>

              {/* 评论区域 */}
              {showComments[post.post_id] && (
                <div className="comments-section">
                  {/* 评论列表 */}
                  <div className="comments-list">
                    {comments[post.post_id] && comments[post.post_id].length > 0 ? (
                      comments[post.post_id].map(comment => (
                        <div key={comment.comment_id} className="comment-item">
                          <div className="comment-header">
                            <img 
                              src={comment.avatar ? `http://localhost:8000${comment.avatar.replace('\\', '/')}` : 'https://via.placeholder.com/32'} 
                              alt={comment.username} 
                              className="comment-avatar" 
                            />
                            <div className="comment-info">
                              <span className="comment-username">{comment.username}</span>
                              <span className="comment-time">
                                {new Date(comment.create_time).toLocaleString('zh-CN')}
                              </span>
                            </div>
                            {comment.user_id === currentUserId && (
                              <button 
                                className="comment-delete-btn"
                                onClick={() => handleDeleteComment(comment.comment_id, post.post_id)}
                              >
                                删除
                              </button>
                            )}
                          </div>
                          {comment.parent_comment && (
                            <div className="comment-reply-info">
                              回复 @{comment.parent_comment.username}
                            </div>
                          )}
                          <div className="comment-content">{comment.content}</div>
                          <div className="comment-actions">
                            <button 
                              className="comment-action-btn"
                              onClick={() => setReplyingTo(prev => ({
                                ...prev,
                                [post.post_id]: comment.comment_id
                              }))}
                            >
                              回复
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-comments">暂无评论，快来抢沙发吧！</div>
                    )}
                  </div>

                  {/* 评论输入框 */}
                  <div className="comment-input-section">
                    {replyingTo[post.post_id] && (
                      <div className="replying-info">
                        回复评论 
                        <button 
                          className="cancel-reply-btn"
                          onClick={() => setReplyingTo(prev => ({
                            ...prev,
                            [post.post_id]: null
                          }))}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    <div className="comment-input-container">
                      <textarea
                        className="comment-input"
                        placeholder={replyingTo[post.post_id] ? '写下你的回复...' : '写下你的评论...'}
                        value={newComment[post.post_id] || ''}
                        onChange={(e) => setNewComment(prev => ({
                          ...prev,
                          [post.post_id]: e.target.value
                        }))}
                        rows={3}
                      />
                      <button 
                        className="comment-submit-btn"
                        onClick={() => handleSubmitComment(post.post_id, replyingTo[post.post_id])}
                      >
                        发送
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            ))
          )}

          {/* 加载更多 */}
          {activeTab !== '我的收藏' && (
            <button 
              className="load-more-btn"
              onClick={handleLoadMore}
              disabled={isLoading}
            >
              {isLoading ? '加载中...' : '加载更多'}
            </button>
          )}
        </div>

        {/* 右侧边栏 */}
        <div className="community-sidebar">
          {/* 社区统计 */}
          <div className="sidebar-card">
            <h3 className="sidebar-title">社区统计</h3>
            <div className="stats-container">
              <div className="stat-item">
                <span className="stat-number">{communityStats?.active_users || 0}</span>
                <span className="stat-label">活跃用户</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{communityStats?.total_posts || 0}</span>
                <span className="stat-label">帖子数量</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{communityStats?.total_comments || 0}</span>
                <span className="stat-label">评论数量</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{communityStats?.today_posts || 0}</span>
                <span className="stat-label">今日发帖</span>
              </div>
            </div>
          </div>

          {/* 热门分类 */}
          {communityStats?.popular_categories && communityStats.popular_categories.length > 0 && (
            <div className="sidebar-card">
              <h3 className="sidebar-title">热门分类</h3>
              <div className="hot-topics">
                {communityStats.popular_categories.map((cat, index) => (
                  <div key={index} className="topic-item">
                    <span className="topic-number">{index + 1}</span>
                    <span className="topic-name">{cat.category}</span>
                    <span className="topic-count">{cat.count} 帖子</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 推荐用户 */}
          <div className="sidebar-card">
            <h3 className="sidebar-title">推荐关注</h3>
            <div className="recommended-users">
              <div className="user-item">
                <img src="https://via.placeholder.com/40" alt="User" className="user-avatar" />
                <div className="user-info">
                  <h4 className="user-name">学霸小明</h4>
                  <p className="user-bio">计算机科学专业，考研成绩400+</p>
                </div>
                <button className="follow-btn">关注</button>
              </div>
              <div className="user-item">
                <img src="https://via.placeholder.com/40" alt="User" className="user-avatar" />
                <div className="user-info">
                  <h4 className="user-name">考研er</h4>
                  <p className="user-bio">连续三年考研辅导经验</p>
                </div>
                <button className="follow-btn">关注</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 发布帖子模态框 */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="create-post-modal">
            <div className="modal-header">
              <h2>发布帖子</h2>
              <button 
                className="modal-close-button"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="post-form">
                <div className="form-group">
                  <label htmlFor="post-title">帖子标题</label>
                  <input 
                    type="text" 
                    id="post-title" 
                    placeholder="请输入帖子标题"
                    className="form-input"
                    value={newPostTitle}
                    onChange={(e) => setNewPostTitle(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="post-content">帖子内容</label>
                  <div className="textarea-container">
                    <textarea
                      id="post-content"
                      className="post-textarea"
                      placeholder="分享你的学习心得、问题或资源..."
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      rows={6}
                    />
                    <div className="textarea-toolbar">
                      <button 
                        className="emoji-button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      >
                        😊
                      </button>
                    </div>
                  </div>
                  {showEmojiPicker && (
                    <div className="emoji-picker">
                      {emojis.map((emoji, index) => (
                        <button 
                          key={index} 
                          className="emoji-item"
                          onClick={() => {
                            setNewPostContent(prev => prev + emoji);
                            setShowEmojiPicker(false);
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label>选择分类</label>
                  <select 
                    className="form-select"
                    value={newPostCategory}
                    onChange={(e) => setNewPostCategory(e.target.value)}
                  >
                    <option>学习心得</option>
                    <option>问题求助</option>
                    <option>资源分享</option>
                    <option>考研经验</option>
                    <option>其他</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>添加图片</label>
                  <div className="file-upload-area">
                    <input 
                      type="file" 
                      multiple 
                      className="file-input"
                      onChange={(e) => {
                        const files = Array.from(e.target.files);
                        if (selectedFiles.length + files.length > 9) {
                          alert(`最多只能上传9张图片，当前已选择${selectedFiles.length}张，还能选择${9 - selectedFiles.length}张`);
                          e.target.value = '';
                          return;
                        }
                        setSelectedFiles([...selectedFiles, ...files]);
                        e.target.value = '';
                      }}
                    />
                    <span className="upload-text">点击或拖拽文件到此处上传</span>
                    {selectedFiles.length > 0 && (
                      <div className="selected-files">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="file-item">
                            <span>{file.name} ({(file.size / 1024).toFixed(1)}KB)</span>
                            <button 
                              className="remove-file-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                const newFiles = selectedFiles.filter((_, i) => i !== index);
                                setSelectedFiles(newFiles);
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="cancel-button"
                onClick={() => setShowCreateModal(false)}
              >
                取消
              </button>
              <button 
                className="publish-button"
                onClick={handleCreatePost}
                disabled={!newPostContent.trim()}
              >
                发布
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningCommunity;