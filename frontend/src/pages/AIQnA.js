import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './AIQnA.css';
import { askQuestion } from '../services/aiService';
import ReactMarkdown from 'react-markdown';

const AIQnA = () => {
  const navigate = useNavigate();
  const chatHistoryRef = useRef(null);
  const [question, setQuestion] = useState('');
  const [context, setContext] = useState('');
  const [currentUserId, setCurrentUserId] = useState(() => {
    const userId = localStorage.getItem('userId');
    return userId ? parseInt(userId) : null;
  });
  
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const getChatHistoryKey = (userId) => `aiChatHistory_${userId}`;

  const loadChatHistory = (userId) => {
    if (!userId) {
      setChatHistory([]);
      return;
    }
    const savedHistory = localStorage.getItem(getChatHistoryKey(userId));
    setChatHistory(savedHistory ? JSON.parse(savedHistory) : []);
  };

  const scrollToBottom = () => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const newUserId = userId ? parseInt(userId) : null;
    
    if (newUserId !== currentUserId) {
      setCurrentUserId(newUserId);
      loadChatHistory(newUserId);
    }
  }, []);

  useEffect(() => {
    if (currentUserId) {
      localStorage.setItem(getChatHistoryKey(currentUserId), JSON.stringify(chatHistory));
    }
  }, [chatHistory, currentUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isLoading]);

  const handleBack = () => {
    navigate('/study-assistant');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!question.trim()) {
      setError('请输入问题');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    // 获取用户ID
    const userId = localStorage.getItem('userId');
    if (!userId) {
      setError('用户未登录，请重新登录');
      setIsLoading(false);
      return;
    }
    
    // 添加用户问题到聊天记录
    const newChatHistory = [...chatHistory, {
      id: Date.now(),
      type: 'user',
      content: question
    }];
    setChatHistory(newChatHistory);
    
    try {
      const response = await askQuestion({
        question: question,
        user_id: parseInt(userId),
        context: context.trim() || undefined
      });
      
      // 添加AI回答到聊天记录
      setChatHistory([...newChatHistory, {
        id: Date.now() + 1,
        type: 'ai',
        content: response.answer
      }]);
      
      // 清空输入框
      setQuestion('');
      setContext('');
    } catch (err) {
      setError(err.detail || 'AI问答服务调用失败，请稍后重试');
      console.error('AI问答失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ai-qna-container">
      <div className="content-header">
        <h1 className="content-title">AI问答助手</h1>
        <p className="content-subtitle">向AI提问，获取考研相关问题的解答</p>
      </div>
      
      <div className="chat-container">
        {/* 聊天记录 */}
        <div className="chat-history" ref={chatHistoryRef}>
          {chatHistory.map((message) => (
            <div 
              key={message.id} 
              className={`message ${message.type}-message`}
            >
              <div className="message-content">
                {message.type === 'ai' ? (
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                ) : (
                  message.content
                )}
              </div>
            </div>
          ))}
          
          {/* 加载状态 */}
          {isLoading && (
            <div className="message ai-message">
              <div className="message-content">
                <div className="loading-indicator">AI正在思考中...</div>
              </div>
            </div>
          )}
        </div>
        
        {/* 错误提示 */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        {/* 输入区域 */}
        <div className="input-area">
          <form onSubmit={handleSubmit}>
            {/* 上下文输入（可选） */}
            <div className="context-input">
              <textarea
                placeholder="可选：添加上下文信息（如相关知识点、参考资料等）"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={3}
              />
            </div>
            
            {/* 问题输入 */}
            <div className="question-input">
              <textarea
                placeholder="请输入你的考研相关问题..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={2}
                required
              />
            </div>
            
            {/* 提交按钮 */}
            <div className="submit-button-container">
              <button 
                type="submit" 
                className="submit-button"
                disabled={isLoading}
              >
                {isLoading ? '发送中...' : '发送'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AIQnA;