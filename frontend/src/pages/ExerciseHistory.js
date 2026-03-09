import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserExercises, deleteExercise, submitExerciseAnswer } from '../services/aiService';
import { getKnowledgePoints } from '../services/knowledgePointService';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import './ExerciseHistory.css';
const ExerciseHistory = () => {
  const navigate = useNavigate();
  const [exercises, setExercises] = useState([]);
  const [knowledgePoints, setKnowledgePoints] = useState([]);
  const [selectedKpId, setSelectedKpId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAnswers, setShowAnswers] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedExercises, setSelectedExercises] = useState([]);
  const PAGE_SIZE = 5;

  useEffect(() => {
    const loadData = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (userId) {
          const [exercisesData, pointsData] = await Promise.all([
            getUserExercises(parseInt(userId), selectedKpId, currentPage, PAGE_SIZE),
            getKnowledgePoints(parseInt(userId))
          ]);
          setExercises(exercisesData.exercises || []);
          setKnowledgePoints(pointsData);
          setTotal(exercisesData.total || 0);
          setTotalPages(exercisesData.total_pages || 1);
        }
      } catch (error) {
        console.error('加载习题历史失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentPage, selectedKpId]);

  const handleKpChange = async (kpId) => {
    setSelectedKpId(kpId);
    setCurrentPage(1);
    setLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      if (userId) {
        const data = await getUserExercises(parseInt(userId), kpId, 1, PAGE_SIZE);
        setExercises(data.exercises || []);
        setTotal(data.total || 0);
        setTotalPages(data.total_pages || 1);
        
        setSelectedExercises([]);
      }
    } catch (error) {
      console.error('加载习题失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExercise = async (exerciseId) => {
    if (!window.confirm('确定要删除这道题吗？')) {
      return;
    }
    
    try {
      const userId = localStorage.getItem('userId');
      if (userId) {
        await deleteExercise(exerciseId, parseInt(userId));
        setExercises(prev => prev.filter(ex => ex.exercise_id !== exerciseId));
        setSelectedExercises(prev => prev.filter(ex => ex.exercise_id !== exerciseId));
      }
    } catch (error) {
      console.error('删除习题失败:', error);
      alert('删除失败: ' + (error.detail || '未知错误'));
    }
  };

  const handleShowAnswer = (exerciseId) => {
    setShowAnswers(prev => ({
      ...prev,
      [exerciseId]: !prev[exerciseId]
    }));
  };

  const handleToggleExercise = (exercise) => {
    setSelectedExercises(prev => {
      const exists = prev.find(ex => ex.exercise_id === exercise.exercise_id);
      if (exists) {
        return prev.filter(ex => ex.exercise_id !== exercise.exercise_id);
      } else {
        return [...prev, exercise];
      }
    });
  };

  const handleToggleAll = () => {
    const currentSelectedIds = selectedExercises.map(ex => ex.exercise_id);
    const allCurrentSelected = exercises.every(ex => currentSelectedIds.includes(ex.exercise_id));
    
    if (allCurrentSelected) {
      setSelectedExercises(prev => prev.filter(ex => !exercises.find(e => e.exercise_id === ex.exercise_id)));
    } else {
      const newExercises = exercises.filter(ex => !currentSelectedIds.includes(ex.exercise_id));
      setSelectedExercises(prev => [...prev, ...newExercises]);
    }
  };

  const handleExportWord = async () => {
    if (selectedExercises.length === 0) {
      alert('请先选择要导出的题目');
      return;
    }

    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: selectedExercises.map((exercise, index) => {
            const exerciseChildren = [
              new Paragraph({
                text: `${index + 1}. ${exercise.question_type}`,
                heading: HeadingLevel.HEADING_2,
                spacing: { after: 120 }
              }),
              new Paragraph({
                text: exercise.question,
                spacing: { after: 120 }
              })
            ];

            if (exercise.options && exercise.options.length > 0) {
              exercise.options.forEach((option, i) => {
                const optionKey = String.fromCharCode(65 + i);
                exerciseChildren.push(
                  new Paragraph({
                    text: `${optionKey}. ${option}`,
                    spacing: { after: 60 }
                  })
                );
              });
            }

            exerciseChildren.push(
              new Paragraph({
                text: `【参考答案】${exercise.answer}`,
                spacing: { after: 60 },
                bold: true
              })
            );

            if (exercise.analysis) {
              exerciseChildren.push(
                new Paragraph({
                  text: `【解析】${exercise.analysis}`,
                  spacing: { after: 120 }
                })
              );
            }

            return exerciseChildren;
          }).flat()
        }]
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `习题导出_${new Date().toLocaleDateString()}.docx`);
      alert(`成功导出 ${selectedExercises.length} 道题`);
    } catch (error) {
      console.error('导出Word失败:', error);
      alert('导出失败: ' + (error.message || '未知错误'));
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case '简单': return 'rgba(76, 175, 80, 0.1)';
      case '中等': return 'rgba(255, 152, 0, 0.1)';
      case '困难': return 'rgba(244, 67, 54, 0.1)';
      default: return 'rgba(158, 158, 158, 0.1)';
    }
  };

  const getDifficultyTextColor = (difficulty) => {
    switch (difficulty) {
      case '简单': return '#4CAF50';
      case '中等': return '#FF9800';
      case '困难': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  return (
    <div className="exercise-history-container">
      <div className="content-header">
        <h1 className="content-title">习题历史</h1>
        <p className="content-subtitle">查看已生成的习题记录</p>
      </div>

      <div className="history-content">
        <div className="filter-section">
          <div className="filter-group">
            <label>筛选知识点：</label>
            <select
              value={selectedKpId || ''}
              onChange={(e) => handleKpChange(e.target.value ? parseInt(e.target.value) : null)}
              className="filter-select"
            >
              <option value="">全部知识点</option>
              {knowledgePoints.map(kp => (
                <option key={kp.kp_id} value={kp.kp_id}>
                  {kp.point_name} ({kp.subject})
                </option>
              ))}
            </select>
          </div>
          <div className="export-section">
            <div className="export-info">
              已选择 {selectedExercises.length} 道题
            </div>
            <div className="export-buttons">
              <button 
                className="export-word-btn"
                disabled={selectedExercises.length === 0}
                onClick={() => handleExportWord()}
              >
                导出Word
              </button>
            </div>
          </div>
          <div className="stats">
            <span>共 {exercises.length} 道题</span>
            {exercises.length > 0 && (
              <span className="correct-rate">
                正确率: {Math.round((exercises.filter(e => e.is_correct === 1).length / exercises.length) * 100)}%
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="empty-state">
            <div className="empty-icon">⏳</div>
            <p>加载中...</p>
          </div>
        ) : exercises.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <p>暂无习题记录，先去生成一些习题吧</p>
            <button 
              className="generate-btn"
              onClick={() => navigate('/question-generator')}
            >
              去生成习题
            </button>
          </div>
        ) : (
          <div className="exercises-list">
            {exercises.map((exercise) => (
              <div key={exercise.exercise_id} className={`exercise-card ${selectedExercises.some(ex => ex.exercise_id === exercise.exercise_id) ? 'selected' : ''}`}>
                <div className="exercise-header">
                  <div className="exercise-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedExercises.some(ex => ex.exercise_id === exercise.exercise_id)}
                      onChange={() => handleToggleExercise(exercise)}
                    />
                  </div>
                  <div className="exercise-info">
                    <span className="exercise-type">{exercise.question_type}</span>
                    <span className="exercise-difficulty" style={{
                      background: getDifficultyColor(exercise.difficulty),
                      color: getDifficultyTextColor(exercise.difficulty)
                    }}>
                      {exercise.difficulty}
                    </span>
                    <span className="exercise-time">{new Date(exercise.create_time).toLocaleString('zh-CN')}</span>
                  </div>
                  <div className="exercise-status">
                    {exercise.is_correct === 1 ? (
                      <span className="correct-tag">✓ 正确</span>
                    ) : exercise.is_correct === 0 ? (
                      <span className="wrong-tag">✗ 错误</span>
                    ) : (
                      <span className="pending-tag">未作答</span>
                    )}
                    <button 
                      className="delete-btn"
                      onClick={() => handleDeleteExercise(exercise.exercise_id)}
                      title="删除习题"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="exercise-content">
                  <p>{exercise.question}</p>
                  {exercise.options && (
                    <div className="options-list">
                      {exercise.options.map((option, i) => {
                        const optionKey = String.fromCharCode(65 + i);
                        const isUserAnswer = exercise.user_answer === optionKey;
                        const isCorrectAnswer = exercise.answer === optionKey;
                        return (
                          <div 
                            key={i} 
                            className={`option-item ${isUserAnswer ? 'selected' : ''} ${isCorrectAnswer && !isUserAnswer ? 'correct' : ''}`}
                          >
                            {option}
                            {isUserAnswer && !isCorrectAnswer && <span className="wrong-mark">✕</span>}
                            {isCorrectAnswer && <span className="correct-mark">✓</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {exercise.user_answer && (
                  <div className="exercise-result">
                    <strong>你的答案：</strong>
                    <p>{exercise.user_answer}</p>
                  </div>
                )}

                <div className="exercise-answer">
                  <strong>参考答案：</strong>
                  <p>{exercise.answer}</p>
                  {exercise.analysis && (
                    <>
                      <strong style={{ marginTop: '0.5rem' }}>解析：</strong>
                      <p style={{ marginTop: '0.25rem' }}>{exercise.analysis}</p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              上一页
            </button>
            <span className="pagination-info">
              第 {currentPage} / {totalPages} 页，共 {total} 道题
            </span>
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              下一页
            </button>
          </div>
        )}

        {exercises.some(ex => !ex.user_answer) && (
          <div className="answer-all-section">
            <button
              className="answer-all-btn"
              onClick={() => navigate('/question-generator')}
            >
              去答题
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExerciseHistory;
