import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './PostDetail.css';
import API_BASE_URL from '../config/api';

const PostDetail = () => {
  const navigate = useNavigate();
  const { postId } = useParams();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(() => {
    const userId = localStorage.getItem('userId');
    return userId ? parseInt(userId) : 1;
  });
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
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
  const [aiSummary, setAiSummary] = useState(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    loadPostDetail();
    loadComments();
  }, [postId]);

  const loadPostDetail = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`http://localhost:8000/community/posts/${postId}?current_user_id=${currentUserId}`);
      if (response.ok) {
        const data = await response.json();
        setPost(data);
      }
    } catch (error) {
      console.error('加载帖子详情失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const response = await fetch(`http://localhost:8000/community/posts/${postId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('加载评论失败:', error);
    }
  };

  const handleLike = async () => {
    try {
      const response = await fetch(`http://localhost:8000/community/posts/${postId}/like?user_id=${currentUserId}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        setPost(prev => ({
          ...prev,
          like_count: result.like_count,
          is_liked: result.liked
        }));
      }
    } catch (error) {
      console.error('点赞失败:', error);
      alert('点赞失败，请稍后重试');
    }
  };

  const handleFavorite = async () => {
    try {
      const response = await fetch(`http://localhost:8000/community/posts/${postId}/favorite?user_id=${currentUserId}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        setPost(prev => ({
          ...prev,
          is_favorited: result.favorited
        }));
      }
    } catch (error) {
      console.error('收藏失败:', error);
      alert('收藏失败，请稍后重试');
    }
  };

  const handleSubmitComment = async (parentCommentId = null) => {
    if (!newComment.trim()) {
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
          content: newComment,
          parent_comment_id: parentCommentId
        })
      });

      if (response.ok) {
        const result = await response.json();
        setNewComment('');
        setReplyingTo(null);
        loadComments();
        setPost(prev => ({
          ...prev,
          comment_count: result.post_comment_count
        }));
      } else {
        const error = await response.json();
        alert(`评论失败: ${error.detail}`);
      }
    } catch (error) {
      console.error('评论失败:', error);
      alert('评论失败，请稍后重试');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('确定要删除这条评论吗？')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/community/comments/${commentId}?user_id=${currentUserId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const result = await response.json();
        loadComments();
        setPost(prev => ({
          ...prev,
          comment_count: result.post_comment_count
        }));
      } else {
        const error = await response.json();
        alert(`删除评论失败: ${error.detail}`);
      }
    } catch (error) {
      console.error('删除评论失败:', error);
      alert('删除评论失败，请稍后重试');
    }
  };

  const handleAISummary = async () => {
    if (!post) return;
    
    setIsSummarizing(true);
    setShowSummary(true);
    
    try {
      const response = await fetch('http://localhost:8000/ai/summarize-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          post_title: post.title,
          post_content: post.content,
          post_category: post.category,
          username: post.username
        })
      });

      if (response.ok) {
        const result = await response.json();
        setAiSummary(result.summary);
      } else {
        const error = await response.json();
        alert(`AI总结失败: ${error.detail}`);
      }
    } catch (error) {
      console.error('AI总结失败:', error);
      alert('AI总结失败，请稍后重试');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleBack = () => {
    navigate('/learning-community');
  };

  if (isLoading) {
    return (
      <div className="post-detail-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="post-detail-container">
        <div className="error-state">
          <div className="error-icon">❌</div>
          <h3>帖子不存在</h3>
          <button className="back-button" onClick={handleBack}>
            返回社区
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="post-detail-container">
      <div className="post-detail-header">
        <button className="back-button" onClick={handleBack}>
          ← 返回社区
        </button>
        <h1 className="detail-title">帖子详情</h1>
      </div>

      <div className="post-detail-content">
        <div className="post-detail-main">
          <div className="post-card-detail">
            <div className="post-header">
              <img 
                src={post.avatar ? `http://localhost:8000${post.avatar.replace('\\', '/')}` : 'https://via.placeholder.com/40'} 
                alt={post.username} 
                className="user-avatar" 
              />
              <div className="user-info">
                <h3 className="username">{post.username}</h3>
                <p className="post-time">{new Date(post.create_time).toLocaleString('zh-CN')}</p>
              </div>
              <span className="post-category">{post.category}</span>
            </div>

            <div className="ai-summary-section">
              <button 
                className="ai-summary-toggle"
                onClick={() => setShowSummary(!showSummary)}
              >
                <span className="ai-icon">🤖</span>
                <span className="ai-text">AI总结</span>
                <span className="toggle-icon">{showSummary ? '▲' : '▼'}</span>
              </button>
              
              {showSummary && (
                <div className="ai-summary-content">
                  {isSummarizing ? (
                    <div className="ai-loading">
                      <div className="loading-spinner"></div>
                      <p>AI正在总结中...</p>
                    </div>
                  ) : aiSummary ? (
                    <div className="ai-summary-text">
                      <div className="summary-header">
                        <span className="summary-badge">AI生成</span>
                      </div>
                      <div className="summary-body">{aiSummary}</div>
                    </div>
                  ) : (
                    <div className="ai-summary-placeholder">
                      <p>点击下方按钮生成AI总结</p>
                      <button 
                        className="generate-summary-btn"
                        onClick={handleAISummary}
                        disabled={isSummarizing}
                      >
                        {isSummarizing ? '生成中...' : '生成AI总结'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="post-content">
              <h2 className="post-title">{post.title}</h2>
              <div className="post-text">{post.content}</div>
            </div>

            {post.images && post.images.length > 0 && (
              <div className="post-images">
                {post.images.map((image, index) => (
                  <img key={index} src={`http://localhost:8000${image}`} alt="Post image" className="post-image" />
                ))}
              </div>
            )}

            <div className="post-stats">
              <div className="stat-item">
                <span className="stat-icon">👁️</span>
                <span className="stat-text">{post.view_count || 0} 浏览</span>
              </div>
              <div className="stat-item">
                <span className="stat-icon">❤️</span>
                <span className="stat-text">{post.like_count} 点赞</span>
              </div>
              <div className="stat-item">
                <span className="stat-icon">💬</span>
                <span className="stat-text">{post.comment_count} 评论</span>
              </div>
            </div>

            <div className="post-actions">
              <button 
                className={`action-button ${post.is_liked ? 'liked' : ''}`}
                onClick={handleLike}
              >
                <span className="action-icon">{post.is_liked ? '❤️' : '🤍'}</span>
                <span className="action-text">{post.is_liked ? '已点赞' : '点赞'}</span>
              </button>
              <button className="action-button">
                <span className="action-icon">↗️</span>
                <span className="action-text">分享</span>
              </button>
              <button 
                className={`action-button ${post.is_favorited ? 'favorited' : ''}`}
                onClick={handleFavorite}
              >
                <span className="action-icon">{post.is_favorited ? '📌' : '📌'}</span>
                <span className="action-text">{post.is_favorited ? '已收藏' : '收藏'}</span>
              </button>
            </div>
          </div>

          <div className="comments-section">
            <h3 className="comments-title">评论 ({comments.length})</h3>

            <div className="comment-input-section">
              {replyingTo && (
                <div className="replying-info">
                  回复评论 
                  <button 
                    className="cancel-reply-btn"
                    onClick={() => setReplyingTo(null)}
                  >
                    ✕
                  </button>
                </div>
              )}
              <div className="comment-input-container">
                <textarea
                  className="comment-input"
                  placeholder={replyingTo ? '写下你的回复...' : '写下你的评论...'}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={4}
                />
                <div className="comment-actions">
                  <button 
                    className="emoji-button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    😊
                  </button>
                  {showEmojiPicker && (
                    <div className="emoji-picker">
                      {emojis.map((emoji, index) => (
                        <button 
                          key={index} 
                          className="emoji-item"
                          onClick={() => {
                            setNewComment(prev => prev + emoji);
                            setShowEmojiPicker(false);
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                  <button 
                    className="comment-submit-btn"
                    onClick={() => handleSubmitComment(replyingTo)}
                    disabled={!newComment.trim()}
                  >
                    发送
                  </button>
                </div>
              </div>
            </div>

            <div className="comments-list">
              {comments.length > 0 ? (
                comments.map(comment => (
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
                          onClick={() => handleDeleteComment(comment.comment_id)}
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
                        onClick={() => setReplyingTo(comment.comment_id)}
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetail;
