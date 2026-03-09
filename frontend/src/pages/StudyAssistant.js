import React, { useState, useEffect } from 'react';
import './StudyAssistant.css';
import LearningTimer from '../components/LearningTimer';
import CheckIn from '../components/CheckIn';

const StudyAssistant = () => {
  const [examDate, setExamDate] = useState(null);
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleSaveSuccess = () => {
    alert('学习记录保存成功！您可以前往学情分析页面查看最新数据。');
  };

  useEffect(() => {
    const fetchExamCountdown = async (showLoading = false) => {
      try {
        if (showLoading) {
          setLoading(true);
        }
        const response = await fetch('http://localhost:8000/exam-countdown/1');
        const data = await response.json();
        
        if (data.success && data.exam_date) {
          setExamDate(new Date(data.exam_date));
          setCountdown(data.countdown);
          setError(null);
        } else {
          setExamDate(null);
          setError(data.message || '获取考研倒计时失败');
        }
      } catch (err) {
        console.error('获取考研倒计时失败:', err);
        setError('获取考研倒计时失败');
        setExamDate(null);
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    };

    fetchExamCountdown(true);

    const interval = setInterval(() => {
      fetchExamCountdown(false);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="study-assistant-container">
      <div className="content-header">
        <h1 className="content-title">学习助手</h1>
        <p className="content-subtitle">使用学习计时功能记录您的学习时间和进度</p>
      </div>
      
      {/* 考研倒计时 */}
      <div className="countdown-section">
        <div className="countdown-header">
          <h2 className="countdown-title">🎓 考研倒计时</h2>
        </div>
        
        {loading ? (
          <div className="countdown-placeholder">
            <div className="placeholder-icon">⏳</div>
            <p>加载中...</p>
          </div>
        ) : error ? (
          <div className="countdown-placeholder">
            <div className="placeholder-icon">⚠️</div>
            <p>{error}</p>
            <p className="placeholder-hint">请先在个人资料中设置考研届数</p>
          </div>
        ) : examDate ? (
          <>
            <div className="exam-date-display">
              <span className="exam-date-label">考研日期：</span>
              <span className="exam-date-value">
                {examDate.toLocaleDateString('zh-CN', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  weekday: 'long'
                })}
              </span>
            </div>
            <div className="exam-date-notice">
              此为预计时间，具体时间以官方为准
            </div>
            
            <div className="countdown-display">
              <div className="countdown-item">
                <div className="countdown-number">{countdown.days}</div>
                <div className="countdown-label">天</div>
              </div>
              <div className="countdown-item">
                <div className="countdown-number">{countdown.hours}</div>
                <div className="countdown-label">时</div>
              </div>
              <div className="countdown-item">
                <div className="countdown-number">{countdown.minutes}</div>
                <div className="countdown-label">分</div>
              </div>
              <div className="countdown-item">
                <div className="countdown-number">{countdown.seconds}</div>
                <div className="countdown-label">秒</div>
              </div>
            </div>
            
            <div className="countdown-message">
              <p>💪 坚持就是胜利，加油！</p>
            </div>
          </>
        ) : null}
      </div>
      
      {/* 学习计时和签到组件 */}
      <div className="timer-section">
        <div className="timer-and-checkin">
          <div className="timer-wrapper">
            <LearningTimer 
              userId={1}
              kpId={null}
              onSaveSuccess={handleSaveSuccess}
            />
          </div>
          <div className="checkin-wrapper">
            <CheckIn userId={1} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyAssistant;
