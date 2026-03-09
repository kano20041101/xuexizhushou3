import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './KnowledgeManagement.css';
import ReactMarkdown from 'react-markdown';
import {
  getKnowledgePoints,
  createKnowledgePoint,
  updateKnowledgePoint,
  deleteKnowledgePoint,
  batchUpdateMindmap
} from '../services/knowledgePointService';
import { generateKnowledgeContent } from '../services/aiService';
import {
  uploadFile,
  getUserFiles,
  attachFileToKnowledgePoint,
  getKnowledgePointFiles,
  detachFileFromKnowledgePoint,
  deleteFile,
  formatFileSize
} from '../services/fileService';

const KnowledgeManagement = () => {
  const navigate = useNavigate();
  const userId = parseInt(localStorage.getItem('userId'));
  
  const [knowledgePoints, setKnowledgePoints] = useState([]);
  const [filteredPoints, setFilteredPoints] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('全部');
  const [showModal, setShowModal] = useState(false);
  const [editingPoint, setEditingPoint] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [userFiles, setUserFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [referenceFiles, setReferenceFiles] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [formData, setFormData] = useState({
    subject: '',
    point_name: '',
    category: '',
    importance: '中',
    difficulty: '中',
    exam_points: '',
    content: ''
  });

  const subjects = ['数据结构', '计算机组成原理', '操作系统', '计算机网络', '全部'];
  const importanceOptions = ['低', '中', '高', '必考'];
  const difficultyOptions = ['易', '较易', '中', '较难', '难'];

  useEffect(() => {
    loadKnowledgePoints();
    loadUserFiles();
  }, [userId]);

  useEffect(() => {
    filterKnowledgePoints();
  }, [knowledgePoints, selectedSubject, searchTerm]);

  const loadKnowledgePoints = async () => {
    try {
      const data = await getKnowledgePoints(userId);
      setKnowledgePoints(data);
    } catch (error) {
      console.error('加载知识点失败:', error);
      alert('加载知识点失败，请稍后重试');
    }
  };

  const filterKnowledgePoints = () => {
    let filtered = [...knowledgePoints];
    
    if (selectedSubject !== '全部') {
      filtered = filtered.filter(kp => kp.subject === selectedSubject);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(kp => 
        kp.point_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        kp.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredPoints(filtered);
  };

  const handleBack = () => {
    navigate('/study-assistant');
  };

  const handleAdd = () => {
    setEditingPoint(null);
    setFormData({
      subject: '',
      point_name: '',
      category: '',
      importance: '中',
      difficulty: '中',
      exam_points: '',
      content: ''
    });
    setShowModal(true);
  };

  const handleEdit = (point) => {
    setEditingPoint(point);
    setFormData({
      subject: point.subject,
      point_name: point.point_name,
      category: point.category,
      importance: point.importance,
      difficulty: point.difficulty,
      exam_points: point.exam_points || '',
      content: point.content || ''
    });
    setShowModal(true);
  };

  const handleCardClick = (point) => {
    setSelectedPoint(point);
    setShowDetailModal(true);
  };

  const handleDelete = async (kpId) => {
    if (!window.confirm('确定要删除这个知识点吗？')) {
      return;
    }
    
    try {
      await deleteKnowledgePoint(kpId);
      alert('删除成功');
      loadKnowledgePoints();
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请稍后重试');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingPoint) {
        await updateKnowledgePoint(editingPoint.kp_id, formData);
        alert('更新成功');
      } else {
        await createKnowledgePoint({
          ...formData,
          id: userId
        });
        alert('创建成功');
      }
      setShowModal(false);
      loadKnowledgePoints();
    } catch (error) {
      console.error('操作失败:', error);
      alert(error.response?.data?.detail || '操作失败，请稍后重试');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getImportanceColor = (importance) => {
    const colors = {
      '低': '#4caf50',
      '中': '#ff9800',
      '高': '#f44336',
      '必考': '#9c27b0'
    };
    return colors[importance] || '#666';
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      '易': '#4caf50',
      '较易': '#8bc34a',
      '中': '#ff9800',
      '较难': '#ff5722',
      '难': '#f44336'
    };
    return colors[difficulty] || '#666';
  };

  const handleToggleMindmap = async (kpId, currentStatus) => {
    try {
      await updateKnowledgePoint(kpId, {
        show_in_mindmap: !currentStatus
      });
      loadKnowledgePoints();
    } catch (error) {
      console.error('切换导图状态失败:', error);
      alert('切换导图状态失败，请稍后重试');
    }
  };

  const handleBatchAddToMindmap = async () => {
    const notInMindmap = filteredPoints.filter(p => !p.show_in_mindmap);
    if (notInMindmap.length === 0) {
      alert('当前筛选的知识点已全部加入导图');
      return;
    }
    
    if (!window.confirm(`确定要将 ${notInMindmap.length} 个知识点加入导图吗？`)) {
      return;
    }
    
    try {
      const kpIds = notInMindmap.map(p => p.kp_id);
      await batchUpdateMindmap(kpIds, true);
      alert(`成功将 ${notInMindmap.length} 个知识点加入导图`);
      loadKnowledgePoints();
    } catch (error) {
      console.error('批量加入导图失败:', error);
      alert('批量加入导图失败，请稍后重试');
    }
  };

  const handleBatchRemoveFromMindmap = async () => {
    const inMindmap = filteredPoints.filter(p => p.show_in_mindmap);
    if (inMindmap.length === 0) {
      alert('当前筛选的知识点中没有已加入导图的');
      return;
    }
    
    if (!window.confirm(`确定要将 ${inMindmap.length} 个知识点从导图中移除吗？`)) {
      return;
    }
    
    try {
      const kpIds = inMindmap.map(p => p.kp_id);
      await batchUpdateMindmap(kpIds, false);
      alert(`成功将 ${inMindmap.length} 个知识点从导图中移除`);
      loadKnowledgePoints();
    } catch (error) {
      console.error('批量移出导图失败:', error);
      alert('批量移出导图失败，请稍后重试');
    }
  };

  const handleAskAI = async () => {
    // 验证必填字段
    if (!formData.subject || !formData.point_name || !formData.category) {
      alert('请先填写科目、知识点名称和分类');
      return;
    }

    // 如果选择了参考关联文件，但知识点还未创建，提示用户先保存
    if (referenceFiles && !editingPoint) {
      alert('请先保存知识点，然后再使用"参考关联文件"功能');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await generateKnowledgeContent({
        subject: formData.subject,
        point_name: formData.point_name,
        category: formData.category,
        difficulty: formData.difficulty,
        importance: formData.importance,
        referenceFiles: referenceFiles,
        kp_id: editingPoint ? editingPoint.kp_id : null
      });

      if (response.success) {
        // 将生成的内容追加到现有内容后面
        const newContent = formData.content 
          ? formData.content + '\n\n' + response.content
          : response.content;
        setFormData(prev => ({
          ...prev,
          content: newContent
        }));
        
        // 如果引用了文件，显示提示
        if (response.referenced_files && response.referenced_files.length > 0) {
          alert(`内容生成成功！已参考以下文件：\n${response.referenced_files.join('\n')}`);
        } else {
          alert('内容生成成功！');
        }
      }
    } catch (error) {
      console.error('AI生成失败:', error);
      alert(error.detail || 'AI生成失败，请稍后重试');
    } finally {
      setIsGenerating(false);
    }
  };

  // 文件上传相关函数
  const loadUserFiles = async () => {
    try {
      const files = await getUserFiles(userId);
      setUserFiles(files);
    } catch (error) {
      console.error('加载文件列表失败:', error);
      alert('加载文件列表失败，请稍后重试');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 验证文件类型
    const allowedTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      alert('仅支持PDF、TXT和DOCX文件');
      return;
    }

    // 验证文件大小（10MB）
    if (file.size > 10 * 1024 * 1024) {
      alert('文件大小不能超过10MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user_id', userId);

      const result = await uploadFile(formData);
      alert('文件上传成功！');
      loadUserFiles();
    } catch (error) {
      console.error('文件上传失败:', error);
      alert(error.response?.data?.detail || '文件上传失败，请稍后重试');
    } finally {
      setUploading(false);
      // 清空文件输入
      e.target.value = '';
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm('确定要删除这个文件吗？')) {
      return;
    }

    try {
      await deleteFile(fileId);
      alert('文件删除成功');
      loadUserFiles();
    } catch (error) {
      console.error('删除文件失败:', error);
      alert('删除文件失败，请稍后重试');
    }
  };

  const handleAttachFileToKnowledgePoint = async (kpId, fileId) => {
    try {
      await attachFileToKnowledgePoint(kpId, fileId);
      alert('文件关联成功');
      loadKnowledgePoints();
    } catch (error) {
      console.error('文件关联失败:', error);
      alert(error.response?.data?.detail || '文件关联失败，请稍后重试');
    }
  };

  const handleDetachFileFromKnowledgePoint = async (kpId, fileId) => {
    try {
      await detachFileFromKnowledgePoint(kpId, fileId);
      alert('文件取消关联成功');
      loadKnowledgePoints();
    } catch (error) {
      console.error('取消关联失败:', error);
      alert(error.response?.data?.detail || '取消关联失败，请稍后重试');
    }
  };

  const [showFileAttachModal, setShowFileAttachModal] = useState(false);
  const [selectedKpId, setSelectedKpId] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState(null);

  // 富文本编辑器配置
  const modules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ 'header': 1 }, { 'header': 2 }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'script': 'sub' }, { 'script': 'super' }],
      [{ 'indent': '-1' }, { 'indent': '+1' }],
      [{ 'direction': 'rtl' }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'font': [] }],
      [{ 'align': [] }],
      ['clean'],
      ['link', 'image', 'video']
    ]
  };

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image', 'video',
    'color', 'background', 'align',
    'code-block'
  ];

  return (
    <div className="knowledge-management-container">
      <div className="content-header">
        <h1 className="content-title">知识点管理</h1>
        <p className="content-subtitle">管理你的考研知识点，添加、编辑、删除知识点</p>
      </div>
      
      <div className="toolbar">
        <div className="toolbar-left">
          <select
            className="subject-select"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            {subjects.map(subject => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
          <input
            type="text"
            className="search-input"
            placeholder="搜索知识点名称或分类..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="toolbar-right">
          <button className="batch-mindmap-button" onClick={handleBatchAddToMindmap}>
            🗺️ 全部加入导图
          </button>
          <button className="batch-mindmap-button remove" onClick={handleBatchRemoveFromMindmap}>
            ❌ 全部移出导图
          </button>
          <button className="upload-button" onClick={() => setShowUploadModal(true)}>
            📁 上传本地文件
          </button>
          <button className="add-button" onClick={handleAdd}>
            + 添加知识点
          </button>
        </div>
      </div>
      
      <div className="content">
        {filteredPoints.length === 0 ? (
          <div className="empty-state">
            <p>暂无知识点数据</p>
            <button className="add-button" onClick={handleAdd}>
              添加第一个知识点
            </button>
          </div>
        ) : (
          <div className="knowledge-grid">
            {filteredPoints.map(point => (
              <div key={point.kp_id} className={`knowledge-card ${point.show_in_mindmap ? 'in-mindmap' : ''}`} onClick={() => handleCardClick(point)}>
                <div className="card-header">
                  <span className="subject-tag">{point.subject}</span>
                  <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                    <button 
                      className="action-button attach"
                      onClick={() => {
                        setSelectedKpId(point.kp_id);
                        setShowFileAttachModal(true);
                      }}
                    >
                      关联文件
                    </button>
                    <button 
                      className="action-button edit"
                      onClick={() => handleEdit(point)}
                    >
                      编辑
                    </button>
                    <button 
                      className="action-button delete"
                      onClick={() => handleDelete(point.kp_id)}
                    >
                      删除
                    </button>
                  </div>
                </div>
                <div className="point-name-container">
                  <h3 className="point-name">{point.point_name}</h3>
                  <button 
                    className={`mindmap-toggle ${point.show_in_mindmap ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleMindmap(point.kp_id, point.show_in_mindmap);
                    }}
                    title={point.show_in_mindmap ? '从导图中移除' : '加入导图'}
                  >
                    {point.show_in_mindmap ? '🗺️' : '📊'}
                  </button>
                </div>
                <p className="category">分类: {point.category}</p>
                <div className="card-tags">
                  <span 
                    className="tag importance"
                    style={{ backgroundColor: getImportanceColor(point.importance) }}
                  >
                    {point.importance}
                  </span>
                  <span 
                    className="tag difficulty"
                    style={{ backgroundColor: getDifficultyColor(point.difficulty) }}
                  >
                    {point.difficulty}
                  </span>
                </div>
                {point.exam_points && (
                  <p className="exam-points">考点: {point.exam_points}</p>
                )}
                {point.files && point.files.length > 0 && (
                  <div className="card-files">
                    <p className="files-title">关联文件:</p>
                    <div className="files-list">
                      {point.files.map(file => (
                        <div key={file.file_id} className="file-tag">
                          <span>📄 {file.file_name}</span>
                          <button 
                            className="detach-file-button"
                            onClick={() => handleDetachFileFromKnowledgePoint(point.kp_id, file.file_id)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="time-info">
                  创建于: {new Date(point.create_time).toLocaleString('zh-CN')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingPoint ? '编辑知识点' : '添加知识点'}</h2>
              <button className="close-button" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row-five">
                <div className="form-group">
                  <label>科目 *</label>
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">请选择科目</option>
                    {subjects.filter(s => s !== '全部').map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>知识点名称 *</label>
                  <input
                    type="text"
                    name="point_name"
                    value={formData.point_name}
                    onChange={handleInputChange}
                    required
                    placeholder="如：二叉树遍历"
                  />
                </div>
                
                <div className="form-group">
                  <label>分类 *</label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                    placeholder="如：树与二叉树"
                  />
                </div>
                
                <div className="form-group">
                  <label>重要度</label>
                  <select
                    name="importance"
                    value={formData.importance}
                    onChange={handleInputChange}
                  >
                    {importanceOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>难度</label>
                  <select
                    name="difficulty"
                    value={formData.difficulty}
                    onChange={handleInputChange}
                  >
                    {difficultyOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label>考点</label>
                <input
                  type="text"
                  name="exam_points"
                  value={formData.exam_points}
                  onChange={handleInputChange}
                  placeholder="如：选择题、计算题、论述题"
                />
              </div>
              
              <div className="form-group">
                <label>详细内容</label>
                <div className="content-input-wrapper">
                  <div className="edit-preview-toggle">
                    <button 
                      type="button"
                      className={`toggle-button ${!showPreview ? 'active' : ''}`}
                      onClick={() => setShowPreview(false)}
                    >
                      编辑
                    </button>
                    <button 
                      type="button"
                      className={`toggle-button ${showPreview ? 'active' : ''}`}
                      onClick={() => setShowPreview(true)}
                    >
                      预览
                    </button>
                  </div>
                  
                  {!showPreview ? (
                    <textarea
                      name="content"
                      value={formData.content}
                      onChange={handleInputChange}
                      rows="6"
                      placeholder="输入知识点的详细内容..."
                    />
                  ) : (
                    <div className="markdown-preview">
                      <ReactMarkdown>{formData.content}</ReactMarkdown>
                    </div>
                  )}
                  
                  <div className="ai-actions">
                    <label className="reference-files-checkbox">
                      <input
                        type="checkbox"
                        checked={referenceFiles}
                        onChange={(e) => setReferenceFiles(e.target.checked)}
                      />
                      参考关联文件
                    </label>
                    <button 
                      type="button" 
                      className="ask-ai-button"
                      onClick={handleAskAI}
                      disabled={isGenerating}
                    >
                      {isGenerating ? '生成中...' : '问问AI'}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="form-actions">
                <button type="button" className="cancel-button" onClick={() => setShowModal(false)}>
                  取消
                </button>
                <button type="submit" className="submit-button">
                  {editingPoint ? '更新' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content upload-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>上传本地文件</h2>
              <button className="close-button" onClick={() => setShowUploadModal(false)}>
                ×
              </button>
            </div>
            <div className="upload-modal-body">
              <div className="upload-area">
                <input
                  type="file"
                  id="file-upload"
                  accept=".pdf,.txt,.docx"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <label htmlFor="file-upload" className="upload-label">
                  <div className="upload-icon">📄</div>
                  <p>点击选择文件</p>
                  <p className="upload-hint">支持 PDF、TXT、DOCX 格式，最大 10MB</p>
                </label>
              </div>
              
              {userFiles.length > 0 && (
                <div className="file-list">
                  <h3>已上传的文件</h3>
                  <div className="file-items">
                    {userFiles.map(file => (
                      <div key={file.file_id} className="file-item">
                        <div className="file-info">
                          <span className="file-icon">📄</span>
                          <div className="file-details">
                            <p className="file-name">{file.file_name}</p>
                            <p className="file-meta">
                              {formatFileSize(file.file_size)} · 
                              {new Date(file.upload_time).toLocaleString('zh-CN')}
                            </p>
                          </div>
                        </div>
                        <button
                          className="delete-file-button"
                          onClick={() => handleDeleteFile(file.file_id)}
                        >
                          删除
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {uploading && (
                <div className="uploading-indicator">
                  <p>上传中...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {showFileAttachModal && (
        <div className="modal-overlay" onClick={() => setShowFileAttachModal(false)}>
          <div className="modal-content file-attach-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>关联文件到知识点</h2>
              <button className="close-button" onClick={() => setShowFileAttachModal(false)}>
                ×
              </button>
            </div>
            <div className="file-attach-modal-body">
              {userFiles.length === 0 ? (
                <div className="empty-files">
                  <p>暂无可用文件</p>
                  <button 
                    className="upload-button"
                    onClick={() => {
                      setShowFileAttachModal(false);
                      setShowUploadModal(true);
                    }}
                  >
                    上传文件
                  </button>
                </div>
              ) : (
                <div className="file-attach-list">
                  {userFiles.map(file => (
                    <div key={file.file_id} className="file-attach-item">
                      <div className="file-attach-info">
                        <span className="file-icon">📄</span>
                        <div className="file-attach-details">
                          <p className="file-name">{file.file_name}</p>
                          <p className="file-meta">
                            {formatFileSize(file.file_size)} · 
                            {new Date(file.upload_time).toLocaleString('zh-CN')}
                          </p>
                        </div>
                      </div>
                      <button
                        className="attach-confirm-button"
                        onClick={() => handleAttachFileToKnowledgePoint(selectedKpId, file.file_id)}
                      >
                        关联
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showDetailModal && selectedPoint && (
        <div className="modal-overlay">
          <div className="modal-content detail-modal">
            <div className="modal-header">
              <h2>{selectedPoint.point_name}</h2>
              <button className="close-button" onClick={() => setShowDetailModal(false)}>
                ×
              </button>
            </div>
            <div className="detail-modal-body">
              <div className="detail-meta">
                <span className="detail-tag subject">{selectedPoint.subject}</span>
                <span className="detail-tag">{selectedPoint.category}</span>
                <span 
                  className="detail-tag importance"
                  style={{ backgroundColor: getImportanceColor(selectedPoint.importance) }}
                >
                  {selectedPoint.importance}
                </span>
                <span 
                  className="detail-tag difficulty"
                  style={{ backgroundColor: getDifficultyColor(selectedPoint.difficulty) }}
                >
                  {selectedPoint.difficulty}
                </span>
              </div>
              {selectedPoint.exam_points && (
                <div className="detail-exam-points">
                  <strong>考点：</strong>{selectedPoint.exam_points}
                </div>
              )}
              {selectedPoint.content && (
                <div className="detail-content">
                  <ReactMarkdown>{selectedPoint.content}</ReactMarkdown>
                </div>
              )}
              {selectedPoint.files && selectedPoint.files.length > 0 && (
                <div className="detail-files">
                  <h4>关联文件：</h4>
                  <div className="detail-files-list">
                    {selectedPoint.files.map(file => (
                      <div key={file.file_id} className="detail-file-tag">
                        📄 {file.file_name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="detail-actions">
                <button 
                  className="edit-button"
                  onClick={() => {
                    setShowDetailModal(false);
                    handleEdit(selectedPoint);
                  }}
                >
                  编辑
                </button>
                <button 
                  className="close-button-secondary"
                  onClick={() => setShowDetailModal(false)}
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeManagement;