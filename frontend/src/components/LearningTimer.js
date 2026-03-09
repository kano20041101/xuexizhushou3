import React, { useState, useEffect } from 'react';
import { createLearningRecord } from '../services/aiService';
import './LearningTimer.css';

const LearningTimer = ({ userId, kpId, onSaveSuccess }) => {
  // 从localStorage恢复状态
  const [isRunning, setIsRunning] = useState(() => {
    return localStorage.getItem('isRunning') === 'true';
  });
  
  const [time, setTime] = useState(() => {
    const savedTime = localStorage.getItem('timerTime');
    return savedTime ? parseInt(savedTime, 10) : 0;
  });
  
  const [startTime, setStartTime] = useState(() => {
    const savedStartTime = localStorage.getItem('timerStartTime');
    return savedStartTime ? new Date(savedStartTime) : null;
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // 计时功能 - 支持页面切换后继续计时
  useEffect(() => {
    let interval;
    
    if (isRunning) {
      // 如果有保存的开始时间，计算已经过去的时间
      if (startTime) {
        const elapsed = Math.floor((new Date() - startTime) / 1000);
        setTime(elapsed);
      }
      
      interval = setInterval(() => {
        setTime(prevTime => prevTime + 1);
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [isRunning, startTime]);
  
  // 将状态保存到localStorage
  useEffect(() => {
    localStorage.setItem('isRunning', isRunning);
    localStorage.setItem('timerTime', time);
    if (startTime) {
      localStorage.setItem('timerStartTime', startTime.toISOString());
    } else {
      localStorage.removeItem('timerStartTime');
    }
  }, [isRunning, time, startTime]);

  // 格式化时间显示
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 开始计时
  const handleStart = () => {
    const now = new Date();
    setStartTime(now);
    setIsRunning(true);
    setSaveMessage('');
  };

  // 暂停计时
  const handlePause = () => {
    setIsRunning(false);
    // 暂停时清除开始时间，避免页面切换后继续计算
    setStartTime(null);
  };

  // 重置计时
  const handleReset = () => {
    setIsRunning(false);
    setTime(0);
    setStartTime(null);
    setSaveMessage('');
    // 清除localStorage中的状态
    localStorage.removeItem('isRunning');
    localStorage.removeItem('timerTime');
    localStorage.removeItem('timerStartTime');
  };

  // 保存学习记录
  const handleSave = async () => {
    if (time === 0) {
      setSaveMessage('请先记录一些学习时长');
      return;
    }

    setIsSaving(true);
    setSaveMessage('');

    try {
      const recordData = {
        user_id: userId,
        action_type: 'study',
        duration: time,
        kp_id: kpId
      };

      await createLearningRecord(recordData);
      setSaveMessage('学习记录已保存');
      setIsRunning(false);
      setTime(0);
      setStartTime(null);
      
      // 清除localStorage中的状态
      localStorage.removeItem('isRunning');
      localStorage.removeItem('timerTime');
      localStorage.removeItem('timerStartTime');

      // 通知父组件保存成功
      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } catch (error) {
      setSaveMessage(`保存失败: ${error.detail || '未知错误'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="learning-timer">
      <div className="timer-title">学习计时器</div>
      <div className="timer-display">{formatTime(time)}</div>
      <div className="timer-controls">
        {!isRunning ? (
          <button 
            className="start-btn" 
            onClick={handleStart} 
            disabled={isSaving}
          >
            开始学习
          </button>
        ) : (
          <button 
            className="pause-btn" 
            onClick={handlePause} 
            disabled={isSaving}
          >
            暂停
          </button>
        )}
        <button 
          className="reset-btn" 
          onClick={handleReset} 
          disabled={isSaving || isRunning}
        >
          重置
        </button>
        <button 
          className="save-btn" 
          onClick={handleSave} 
          disabled={isSaving || time === 0}
        >
          {isSaving ? '保存中...' : '保存记录'}
        </button>
      </div>
      {saveMessage && (
        <div className={`save-message ${saveMessage.includes('失败') ? 'error' : 'success'}`}>
          {saveMessage}
        </div>
      )}
    </div>
  );
};

export default LearningTimer;
