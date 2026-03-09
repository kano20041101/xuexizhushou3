import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getKnowledgePoints } from '../services/knowledgePointService';
import { generateExercises, saveExercises, submitExerciseAnswer } from '../services/aiService';
import './QuestionGenerator.css';

const QuestionGenerator = () => {
  const navigate = useNavigate();
  const [selectedKnowledge, setSelectedKnowledge] = useState('');
  const [questionType, setQuestionType] = useState('选择题');
  const [questionCount, setQuestionCount] = useState(3);
  const [difficulty, setDifficulty] = useState('中等');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [knowledgePoints, setKnowledgePoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showAnswers, setShowAnswers] = useState(false);
  const [userAnswers, setUserAnswers] = useState({});

  useEffect(() => {
    const loadKnowledgePoints = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (userId) {
          const points = await getKnowledgePoints(userId);
          setKnowledgePoints(points);
        }
      } catch (error) {
        console.error('加载知识点失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadKnowledgePoints();
  }, []);

  const questionTypes = ['选择题', '填空题', '简答题'];
  const difficulties = ['简单', '中等', '困难'];

  const handleGenerate = async () => {
    if (!selectedKnowledge) {
      alert('请输入知识点');
      return;
    }

    const selectedPoint = knowledgePoints.find(kp => kp.point_name === selectedKnowledge);
    
    // 如果知识点不存在，kp_id 设为 -1 表示没有知识点
    const kp_id = selectedPoint ? selectedPoint.kp_id : -1;
    
    // 获取用户输入的知识点名称（用于自定义知识点）
    const customKpName = selectedPoint ? '' : selectedKnowledge;
    
    setIsGenerating(true);
    
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        alert('用户未登录');
        setIsGenerating(false);
        return;
      }

      const requestData = {
        user_id: parseInt(userId),
        kp_id: kp_id,
        custom_kp_name: customKpName,
        question_type: questionType,
        question_count: questionCount,
        difficulty: difficulty
      };

      const response = await generateExercises(requestData);
      
      if (response.success && response.exercises) {
        setGeneratedQuestions(response.exercises);
        setCurrentQuestionIndex(0);
        setShowAnswers(false);
        setUserAnswers({});
        
        // 如果是从缓存中获取的，提示用户
        if (response.from_cache) {
          alert(response.message || '已存在相同条件的题目，直接返回');
        }
        
        // 保存习题到数据库
        try {
          const userId = localStorage.getItem('userId');
          if (userId) {
            await saveExercises({
              user_id: parseInt(userId),
              kp_id: kp_id,  // -1 表示没有知识点
              exercises: response.exercises
            });
          }
        } catch (saveError) {
          console.error('保存习题失败:', saveError);
          // 不中断流程，只记录错误
        }
      } else {
        const errorDetail = response.detail || '未知错误';
        const errorMessage = typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail);
        alert('生成习题失败: ' + errorMessage);
      }
    } catch (error) {
      console.error('生成习题失败:', error);
      const errorMessage = error.detail || (typeof error === 'string' ? error : '服务调用失败');
      alert('生成习题失败: ' + errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitAnswer = async (questionId, userAnswer, correctAnswer, questionType, question) => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        alert('用户未登录');
        return;
      }

      // 判断是否正确
      const isCorrect = userAnswer === correctAnswer ? 1 : 0;

      // 提交答案到后端
      await submitExerciseAnswer({
        user_id: parseInt(userId),
        exercise_id: questionId,
        user_answer: userAnswer,
        is_correct: isCorrect,
        question_type: questionType,
        question: question
      });

      setShowAnswers(true);
    } catch (error) {
      console.error('提交答案失败:', error);
      const errorMessage = error.detail || (typeof error === 'string' ? error : '未知错误');
      alert('提交失败: ' + errorMessage);
    }
  };

  return (
    <div className="question-generator-container">
      <div className="content-header">
        <h1 className="content-title">习题生成</h1>
        <p className="content-subtitle">基于知识点智能生成练习题</p>
      </div>

      <div className="generator-content">
        <div className="generator-form">
          <div className="form-section">
            <h3 className="section-title">生成设置</h3>
            
            <div className="form-group">
              <label>选择知识点：</label>
              <div className="searchable-select">
                <input
                  type="text"
                  value={selectedKnowledge}
                  onChange={(e) => {
                    setSelectedKnowledge(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="输入或选择知识点"
                  disabled={loading}
                  className="searchable-input"
                />
                <div 
                  className="dropdown-arrow"
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  style={{ cursor: 'pointer' }}
                >▼</div>
              </div>
              
              {showSuggestions && !loading && (
                <div className="suggestions-list">
                  {knowledgePoints
                    .filter(kp => selectedKnowledge ? kp.point_name.toLowerCase().includes(selectedKnowledge.toLowerCase()) : true)
                    .map(kp => (
                      <div
                        key={kp.kp_id}
                        className="suggestion-item"
                        onClick={() => {
                          setSelectedKnowledge(kp.point_name);
                          setShowSuggestions(false);
                        }}
                      >
                        {kp.point_name} ({kp.subject})
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label>题目类型：</label>
              <div className="radio-group">
                {questionTypes.map(type => (
                  <label key={type} className="radio-label">
                    <input
                      type="radio"
                      value={type}
                      checked={questionType === type}
                      onChange={(e) => setQuestionType(e.target.value)}
                    />
                    {type}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>题目数量：{questionCount}道</label>
              <input
                type="range"
                min="1"
                max="5"
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label>难度等级：</label>
              <div className="radio-group">
                {difficulties.map(diff => (
                  <label key={diff} className="radio-label">
                    <input
                      type="radio"
                      value={diff}
                      checked={difficulty === diff}
                      onChange={(e) => setDifficulty(e.target.value)}
                    />
                    {diff}
                  </label>
                ))}
              </div>
            </div>

            <button 
              className="generate-btn" 
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? '生成中...' : '✨ 生成习题'}
            </button>
          </div>
        </div>

        <div className="questions-preview">
          <div className="preview-header">
            <h3>生成结果</h3>
            {generatedQuestions.length > 0 && (
              <span className="question-count">
                第 {currentQuestionIndex + 1} / {generatedQuestions.length} 题
              </span>
            )}
          </div>

          {generatedQuestions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <p>选择知识点并点击生成按钮开始生成习题</p>
            </div>
          ) : (
            <div className="questions-list">
              {generatedQuestions.map((q, index) => (
                <div 
                  key={q.id} 
                  className={`question-card ${index === currentQuestionIndex ? 'active' : 'hidden'}`}
                >
                  <div className="question-header">
                    <span className="question-number">第 {q.id} 题</span>
                    <span className="question-type">{q.type}</span>
                    <span className={`difficulty-tag ${q.difficulty}`}>{q.difficulty}</span>
                  </div>
                  <div className="question-content">
                    <p>{q.question}</p>
                    {q.options && (
                      <div className="options-list">
                        {q.options.map((option, i) => {
                          const optionKey = String.fromCharCode(65 + i);
                          const isSelected = userAnswers[currentQuestionIndex] === optionKey;
                          return (
                            <div 
                              key={i} 
                              className={`option-item ${isSelected ? 'selected' : ''}`}
                              onClick={() => !showAnswers && setUserAnswers(prev => ({ ...prev, [currentQuestionIndex]: optionKey }))}
                            >
                              {option}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {showAnswers && q.options && (
                    <div className={`question-answer ${questionType === '选择题' && userAnswers[currentQuestionIndex] !== q.answer ? 'wrong' : ''}`}>
                      <strong>参考答案：</strong>
                      <p>{q.answer}</p>
                      {q.analysis && (
                        <>
                          <strong style={{ marginTop: '0.5rem' }}>解析：</strong>
                          <p style={{ marginTop: '0.25rem' }}>{q.analysis}</p>
                        </>
                      )}
                    </div>
                  )}
                  {showAnswers && !q.options && (
                    <div className="question-answer">
                      <strong>参考答案：</strong>
                      <p>{q.answer}</p>
                      {q.analysis && (
                        <>
                          <strong style={{ marginTop: '0.5rem' }}>解析：</strong>
                          <p style={{ marginTop: '0.25rem' }}>{q.analysis}</p>
                        </>
                      )}
                    </div>
                  )}
                  {!showAnswers && q.options && (
                    <div className="submit-section">
                      <button
                        className="submit-btn"
                        onClick={() => handleSubmitAnswer(q.id, userAnswers[currentQuestionIndex], q.answer, q.type, q.question)}
                        disabled={!userAnswers[currentQuestionIndex]}
                      >
                        提交答案
                      </button>
                    </div>
                  )}
                  {!showAnswers && !q.options && (
                    <div className="submit-section">
                      <textarea
                        className="answer-input"
                        value={userAnswers[currentQuestionIndex] || ''}
                        onChange={(e) => setUserAnswers(prev => ({ ...prev, [currentQuestionIndex]: e.target.value }))}
                        placeholder="请输入你的答案..."
                        rows={4}
                      />
                      <button
                        className="submit-btn"
                        onClick={() => handleSubmitAnswer(q.id, userAnswers[currentQuestionIndex], q.answer, q.type, q.question)}
                        disabled={!userAnswers[currentQuestionIndex]}
                      >
                        提交答案
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {generatedQuestions.length > 0 && (
            <div className="pagination-controls">
              <button
                className="pagination-btn prev-btn"
                onClick={() => {
                  if (showAnswers) {
                    setShowAnswers(false);
                  }
                  setCurrentQuestionIndex(prev => Math.max(0, prev - 1));
                }}
                disabled={currentQuestionIndex === 0}
              >
                ← 上一题
              </button>
              <span className="page-indicator">
                {currentQuestionIndex + 1} / {generatedQuestions.length}
              </span>
              <button
                className="pagination-btn next-btn"
                onClick={() => {
                  if (showAnswers) {
                    setShowAnswers(false);
                  }
                  setCurrentQuestionIndex(prev => Math.min(generatedQuestions.length - 1, prev + 1));
                }}
                disabled={currentQuestionIndex === generatedQuestions.length - 1}
              >
                下一题 →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionGenerator;
