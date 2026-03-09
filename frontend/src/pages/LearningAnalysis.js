import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LearningAnalysis.css';
import { analyzeLearning } from '../services/aiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import LearningTrendChart from '../components/LearningTrendChart';
import KnowledgeMasteryRadar from '../components/KnowledgeMasteryRadar';
import LearningTimeHeatmap from '../components/LearningTimeHeatmap';

const LearningAnalysis = () => {
  const navigate = useNavigate();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState(() => {
    const savedHistory = localStorage.getItem('analysisHistory');
    return savedHistory ? JSON.parse(savedHistory) : [];
  });

  // 从分析结果中提取指定部分的内容
  const extractSection = (analysis, sectionTitle) => {
    if (!analysis) return '';
    
    // 查找指定部分的开始位置
    const sectionRegex = new RegExp(`###?\s*${sectionTitle}[\s\S]*?(?=###?\s*|$)`, 'i');
    const match = analysis.match(sectionRegex);
    
    if (match) {
      // 移除标题行，只返回内容
      return match[0].replace(new RegExp(`###?\s*${sectionTitle}`, 'i'), '').trim();
    }
    
    // 如果没有找到对应部分，返回完整分析内容
    return analysis;
  };

  const handleBack = () => {
    navigate('/study-assistant');
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    
    const userId = localStorage.getItem('userId');
    if (!userId) {
      setError('用户未登录，请重新登录');
      setIsAnalyzing(false);
      return;
    }
    
    try {
      const response = await analyzeLearning({
        user_id: parseInt(userId),
        include_profile: true
      });
      
      setAnalysisResult(response);
      
      const historyItem = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        analysis: response.analysis,
        stats: response.learning_stats
      };
      
      const newHistory = [historyItem, ...historyList].slice(0, 10);
      setHistoryList(newHistory);
      localStorage.setItem('analysisHistory', JSON.stringify(newHistory));
    } catch (err) {
      setError(err.detail || '学情分析失败，请稍后重试');
      console.error('学情分析失败:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleShowHistory = () => {
    setShowHistory(true);
  };

  const handleHideHistory = () => {
    setShowHistory(false);
  };

  const handleViewHistoryItem = (item) => {
    setAnalysisResult({
      analysis: item.analysis,
      learning_stats: item.stats
    });
    setShowHistory(false);
  };

  const handleDeleteHistoryItem = (id) => {
    if (!window.confirm('确定要删除这条历史记录吗？')) {
      return;
    }
    const newHistory = historyList.filter(item => item.id !== id);
    setHistoryList(newHistory);
    localStorage.setItem('analysisHistory', JSON.stringify(newHistory));
  };

  return (
    <div className="learning-analysis-container">
      <div className="content-header">
        <h1 className="content-title">学情分析</h1>
        <p className="content-subtitle">通过AI分析你的学习情况，获取个性化的学习建议</p>
      </div>
      
      <div className="content">
        {/* 分析按钮 */}
        <div className="analyze-button-container">
          <button 
            className="analyze-button"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? '分析中...' : '开始学情分析'}
          </button>
          <button 
            className="history-button"
            onClick={handleShowHistory}
          >
            📋 历史分析
          </button>
        </div>
        
        {/* 历史记录 */}
        {showHistory && (
          <div className="history-panel">
            <div className="history-header">
              <h3>历史分析记录</h3>
              <button className="close-history-button" onClick={handleHideHistory}>
                ✕
              </button>
            </div>
            <div className="history-list">
              {historyList.length > 0 ? (
                historyList.map(item => (
                  <div key={item.id} className="history-item">
                    <div className="history-item-content">
                      <div className="history-time">
                        {new Date(item.timestamp).toLocaleString('zh-CN')}
                      </div>
                      <div className="history-stats">
                        <span>学习时长: {item.stats.total_duration_hours}小时</span>
                        <span>知识点: {item.stats.total_knowledge_points}个</span>
                      </div>
                    </div>
                    <div className="history-item-actions">
                      <button 
                        className="view-history-button"
                        onClick={() => handleViewHistoryItem(item)}
                      >
                        查看
                      </button>
                      <button 
                        className="delete-history-button"
                        onClick={() => handleDeleteHistoryItem(item.id)}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-history">
                  暂无历史分析记录
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* 错误提示 */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        {/* 分析结果 */}
        <div className="analysis-result">
          <h2>学情分析报告</h2>
          
          {/* 学习情况总结 */}
          <div className="analysis-section">
            <h3>学习情况总结</h3>
            <div className="section-content">
              {analysisResult && (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {extractSection(analysisResult.analysis, '学习情况总结')}
                </ReactMarkdown>
              )}
            </div>
          </div>
          
          {/* 学习优势和不足 */}
          <div className="analysis-section">
            <h3>学习优势和不足</h3>
            <div className="section-content">
              {analysisResult && (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {extractSection(analysisResult.analysis, '学习优势和不足')}
                </ReactMarkdown>
              )}
            </div>
          </div>
          
          {/* 针对性的学习建议 */}
          <div className="analysis-section">
            <h3>针对性的学习建议</h3>
            <div className="section-content">
              {analysisResult && (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {extractSection(analysisResult.analysis, '针对性的学习建议')}
                </ReactMarkdown>
              )}
            </div>
          </div>
          
          {/* 学习计划优化建议 */}
          <div className="analysis-section">
            <h3>学习计划优化建议</h3>
            <div className="section-content">
              {analysisResult && (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {extractSection(analysisResult.analysis, '学习计划优化建议')}
                </ReactMarkdown>
              )}
            </div>
          </div>
          
          {analysisResult && (
            <>
              {/* 学习统计摘要 */}
              <div className="stats-summary">
                <h3>学习统计摘要</h3>
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-label">总学习时长</div>
                    <div className="stat-value">{analysisResult.learning_stats.total_duration_hours}小时</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">学习知识点</div>
                    <div className="stat-value">{analysisResult.learning_stats.total_knowledge_points}个</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">最近7天学习天数</div>
                    <div className="stat-value">{analysisResult.learning_stats.weekly_study_days}天</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">最近7天学习时长</div>
                    <div className="stat-value">{analysisResult.learning_stats.weekly_total_duration_hours}小时</div>
                  </div>
                </div>
              </div>

              {/* 可视化分析 */}
              <div className="visualization-section">
                <h3>学习数据可视化</h3>
                
                {/* 学习趋势图 */}
                <div className="chart-container">
                  <LearningTrendChart 
                    data={analysisResult.learning_stats.daily_duration || []}
                    title="最近7天学习时长趋势"
                  />
                </div>
                
                {/* 知识点掌握雷达图 */}
                <div className="chart-container">
                  <KnowledgeMasteryRadar 
                    data={analysisResult.learning_stats.knowledge_mastery || []}
                    title="知识点掌握情况"
                  />
                </div>
                
                {/* 学习时间热力图 */}
                <div className="chart-container">
                  <LearningTimeHeatmap 
                    data={analysisResult.learning_stats.time_distribution || []}
                    title="学习时间分布热力图"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LearningAnalysis;
