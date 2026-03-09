import React, { useState, useEffect } from 'react';
import './CheckIn.css';

const CheckIn = ({ userId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [checkInRecords, setCheckInRecords] = useState([]);
  const [checkInStatus, setCheckInStatus] = useState({
    checked_in: false,
    consecutive_days: 0,
    check_in_time: null
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  useEffect(() => {
    loadCheckInData();
  }, [userId, currentDate]);

  const loadCheckInData = async () => {
    try {
      setLoading(true);
      
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const [statusResponse, recordsResponse] = await Promise.all([
        fetch(`http://localhost:8000/check-in/${userId}/status`),
        fetch(`http://localhost:8000/check-in/${userId}/records?year=${year}&month=${month}`)
      ]);

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setCheckInStatus(statusData);
      }

      if (recordsResponse.ok) {
        const recordsData = await recordsResponse.json();
        setCheckInRecords(recordsData.records);
      }
    } catch (error) {
      console.error('加载签到数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (isCheckingIn) return;
    
    setIsCheckingIn(true);
    setMessage('');

    try {
      const response = await fetch(`http://localhost:8000/check-in/${userId}`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        setMessage(`签到成功！连续签到 ${data.consecutive_days} 天，获得 ${data.exp_reward} 经验`);
        setCheckInStatus({
          checked_in: true,
          consecutive_days: data.consecutive_days,
          check_in_time: new Date().toISOString()
        });
        loadCheckInData();
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      setMessage('签到失败，请稍后重试');
      console.error('签到失败:', error);
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handlePrevMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month - 1, 1).getDay();
  };

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && 
           currentDate.getMonth() === today.getMonth() && 
           currentDate.getFullYear() === today.getFullYear();
  };

  const isCheckedIn = (day) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return checkInRecords.some(record => record.date === dateStr);
  };

  const getCheckInInfo = (day) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return checkInRecords.find(record => record.date === dateStr);
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const checkedIn = isCheckedIn(day);
      const today = isToday(day);
      const checkInInfo = getCheckInInfo(day);

      days.push(
        <div 
          key={day} 
          className={`calendar-day ${checkedIn ? 'checked-in' : ''} ${today ? 'today' : ''}`}
          title={checkInInfo ? `连续签到${checkInInfo.consecutive_days}天，获得${checkInInfo.exp_reward}经验` : ''}
        >
          <span className="day-number">{day}</span>
          {checkedIn && <span className="check-in-mark">✓</span>}
        </div>
      );
    }

    return days;
  };

  if (loading) {
    return (
      <div className="check-in-container">
        <div className="check-in-loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="check-in-container">
      <div className="check-in-header">
        <h3 className="check-in-title">每日签到</h3>
        <div className="consecutive-days">
          <span className="consecutive-label">连续签到</span>
          <span className="consecutive-number">{checkInStatus.consecutive_days}</span>
          <span className="consecutive-unit">天</span>
        </div>
      </div>

      <div className="calendar-wrapper">
        <div className="calendar-header">
          <button className="calendar-nav-btn" onClick={handlePrevMonth}>&lt;</button>
          <span className="calendar-month">
            {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
          </span>
          <button className="calendar-nav-btn" onClick={handleNextMonth}>&gt;</button>
        </div>

        <div className="calendar-weekdays">
          <div className="weekday">日</div>
          <div className="weekday">一</div>
          <div className="weekday">二</div>
          <div className="weekday">三</div>
          <div className="weekday">四</div>
          <div className="weekday">五</div>
          <div className="weekday">六</div>
        </div>

        <div className="calendar-days">
          {renderCalendar()}
        </div>
      </div>

      <div className="check-in-footer">
        {checkInStatus.checked_in ? (
          <div className="check-in-status checked">
            <span className="status-icon">✓</span>
            <span className="status-text">今日已签到</span>
          </div>
        ) : (
          <button 
            className={`check-in-btn ${isCheckingIn ? 'checking' : ''}`}
            onClick={handleCheckIn}
            disabled={isCheckingIn}
          >
            {isCheckingIn ? '签到中...' : '立即签到'}
          </button>
        )}
        {message && (
          <div className={`check-in-message ${message.includes('成功') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckIn;
