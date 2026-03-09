import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import './KnowledgeMindMap.css';
import ReactMarkdown from 'react-markdown';
import { getKnowledgePoints, createKnowledgeRelation, getKnowledgeRelations, deleteKnowledgeRelation, createIntermediateNode } from '../services/knowledgePointService';

const KnowledgeMindMap = () => {
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
  
  const [relations, setRelations] = useState([]);
  const [showRelationModal, setShowRelationModal] = useState(false);
  const [createIntermediate, setCreateIntermediate] = useState(false);
  const [relationFormData, setRelationFormData] = useState({
    source_kp_id: null,
    target_kp_id: null,
    intermediate_node_name: '',
    relation_type: '相关概念',
    strength: 3,
    description: ''
  });

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
    // 模拟加载知识点数据
    loadKnowledgePoints();
    loadUserFiles();
  }, [userId]);

  useEffect(() => {
    filterKnowledgePoints();
  }, [knowledgePoints, selectedSubject, searchTerm]);

  useEffect(() => {
    if (filteredPoints.length > 0) {
      generateGraphData(filteredPoints);
    } else {
      setGraphData({ nodes: [], links: [] });
    }
  }, [filteredPoints, relations]);

  const loadKnowledgePoints = async () => {
    try {
      const data = await getKnowledgePoints(userId);
      setKnowledgePoints(data);
    } catch (error) {
      console.error('加载知识点失败:', error);
      alert('加载知识点失败，请稍后重试');
    }
  };

  const loadRelations = async () => {
    try {
      const data = await getKnowledgeRelations(userId);
      setRelations(data);
    } catch (error) {
      console.error('加载关系失败:', error);
      alert('加载关系失败，请稍后重试');
    }
  };

  useEffect(() => {
    loadKnowledgePoints();
    loadRelations();
  }, [userId]);

  // 生成可视化图数据
  const generateGraphData = (points) => {
    const nodes = points.map(point => ({
      id: point.kp_id.toString(),
      name: point.point_name,
      subject: point.subject,
      category: point.category,
      importance: point.importance,
      difficulty: point.difficulty,
      radius: point.node_type === 'intermediate' ? getRadiusByImportance('低') : getRadiusByImportance(point.importance),
      color: point.node_type === 'intermediate' ? '#FFEAA7' : getColorBySubject(point.subject),
      borderWidth: point.node_type === 'intermediate' ? 2 : 0,
      borderColor: point.node_type === 'intermediate' ? '#DDA0DD' : 'transparent',
      nodeType: point.node_type
    }));

    const links = [];
    
    relations.forEach(relation => {
      const sourcePoint = points.find(p => p.kp_id === relation.source_kp_id);
      const targetPoint = points.find(p => p.kp_id === relation.target_kp_id);
      
      if (sourcePoint && targetPoint) {
        links.push({
          from: relation.source_kp_id.toString(),
          to: relation.target_kp_id.toString(),
          value: relation.strength,
          label: relation.relation_type,
          color: { color: getRelationColor(relation.relation_type) },
          arrows: 'to',
          relation_id: relation.relation_id
        });
      }
    });

    setGraphData({ nodes, links });
  };

  const getRelationColor = (relationType) => {
    const colorMap = {
      '前置知识': '#FF6B6B',
      '相关概念': '#45B7D1',
      '应用场景': '#96CEB4',
      '包含关系': '#FFEAA7',
      '对比关系': '#DDA0DD'
    };
    return colorMap[relationType] || '#999999';
  };

  // 根据重要性设置节点半径
  const getRadiusByImportance = (importance) => {
    const radiusMap = {
      '低': 8,
      '中': 12,
      '高': 16,
      '必考': 20
    };
    return radiusMap[importance] || 12;
  };

  // 根据科目设置节点颜色
  const getColorBySubject = (subject) => {
    const colorMap = {
      '数据结构': '#FF6B6B',
      '计算机组成原理': '#4ECDC4',
      '操作系统': '#45B7D1',
      '计算机网络': '#96CEB4'
    };
    return colorMap[subject] || '#DDA0DD';
  };

  const handleCreateRelation = async () => {
    if (!relationFormData.source_kp_id || !relationFormData.target_kp_id) {
      alert('请选择源知识点和目标知识点');
      return;
    }
    
    if (relationFormData.source_kp_id === relationFormData.target_kp_id) {
      alert('源知识点和目标知识点不能相同');
      return;
    }
    
    if (createIntermediate && !relationFormData.intermediate_node_name) {
      alert('请输入中间节点名称');
      return;
    }
    
    try {
      if (createIntermediate) {
        await createIntermediateNode({
          source_kp_id: relationFormData.source_kp_id,
          target_kp_id: relationFormData.target_kp_id,
          intermediate_node_name: relationFormData.intermediate_node_name,
          relation_type: relationFormData.relation_type,
          strength: relationFormData.strength,
          description: relationFormData.description
        });
        alert('中间节点创建成功');
      } else {
        await createKnowledgeRelation({
          source_kp_id: relationFormData.source_kp_id,
          target_kp_id: relationFormData.target_kp_id,
          relation_type: relationFormData.relation_type,
          strength: relationFormData.strength,
          description: relationFormData.description
        });
        alert('关系创建成功');
      }
      
      setShowRelationModal(false);
      loadRelations();
      loadKnowledgePoints();
      setRelationFormData({
        source_kp_id: null,
        target_kp_id: null,
        intermediate_node_name: '',
        relation_type: '相关概念',
        strength: 3,
        description: ''
      });
      setCreateIntermediate(false);
    } catch (error) {
      console.error('创建失败:', error);
      alert(error.response?.data?.detail || '创建失败，请稍后重试');
    }
  };

  const filterKnowledgePoints = () => {
    let filtered = knowledgePoints.filter(kp => kp.show_in_mindmap);
    
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
      // 模拟删除操作
      setKnowledgePoints(prev => prev.filter(kp => kp.kp_id !== kpId));
      alert('删除成功');
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请稍后重试');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingPoint) {
        // 模拟更新操作
        setKnowledgePoints(prev => 
          prev.map(kp => kp.kp_id === editingPoint.kp_id ? {...editingPoint, ...formData} : kp)
        );
        alert('更新成功');
      } else {
        // 模拟创建操作
        const newPoint = {
          ...formData,
          id: userId,
          kp_id: Math.max(...knowledgePoints.map(kp => kp.kp_id), 0) + 1
        };
        setKnowledgePoints(prev => [...prev, newPoint]);
        alert('创建成功');
      }
      setShowModal(false);
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败，请稍后重试');
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
      // 模拟AI生成内容
      setTimeout(() => {
        const mockContent = `这是由AI生成的关于${formData.point_name}的内容...\n\n您可以在这里看到详细的解释和示例。`;
        setFormData(prev => ({
          ...prev,
          content: prev.content ? prev.content + '\n\n' + mockContent : mockContent
        }));
        alert('内容生成成功！');
        setIsGenerating(false);
      }, 1000);
    } catch (error) {
      console.error('AI生成失败:', error);
      alert('AI生成失败，请稍后重试');
      setIsGenerating(false);
    }
  };

  // 文件上传相关函数
  const loadUserFiles = async () => {
    try {
      // 模拟加载文件列表
      setTimeout(() => {
        const mockFiles = [
          { file_id: 1, file_name: '数据结构笔记.pdf', file_type: 'pdf', file_size: 1024000, upload_time: new Date().toISOString() },
          { file_id: 2, file_name: '操作系统复习.docx', file_type: 'docx', file_size: 2048000, upload_time: new Date().toISOString() }
        ];
        setUserFiles(mockFiles);
      }, 500);
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
      // 模拟文件上传
      setTimeout(() => {
        alert('文件上传成功！');
        loadUserFiles();
      }, 1000);
    } catch (error) {
      console.error('文件上传失败:', error);
      alert('文件上传失败，请稍后重试');
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
      // 模拟删除文件
      setUserFiles(prev => prev.filter(f => f.file_id !== fileId));
      alert('文件删除成功');
    } catch (error) {
      console.error('删除文件失败:', error);
      alert('删除文件失败，请稍后重试');
    }
  };

  const handleAttachFileToKnowledgePoint = async (kpId, fileId) => {
    try {
      // 模拟文件关联
      alert('文件关联成功');
      loadKnowledgePoints();
    } catch (error) {
      console.error('文件关联失败:', error);
      alert('文件关联失败，请稍后重试');
    }
  };

  const handleDetachFileFromKnowledgePoint = async (kpId, fileId) => {
    try {
      // 模拟取消文件关联
      alert('文件取消关联成功');
      loadKnowledgePoints();
    } catch (error) {
      console.error('取消关联失败:', error);
      alert('取消关联失败，请稍后重试');
    }
  };

  const [showFileAttachModal, setShowFileAttachModal] = useState(false);
  const [selectedKpId, setSelectedKpId] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState(null);
  
  // 可视化相关状态
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const networkRef = useRef();
  const containerRef = useRef();

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

  // 处理节点点击事件
  const handleNodeClick = (event) => {
    const { nodes } = event;
    if (nodes.length > 0) {
      const nodeId = parseInt(nodes[0]);
      const clickedPoint = knowledgePoints.find(kp => kp.kp_id === nodeId);
      if (clickedPoint) {
        setSelectedPoint(clickedPoint);
        setShowDetailModal(true);
      }
    }
  };

  // 初始化网络图
  useEffect(() => {
    if (containerRef.current && graphData.nodes.length > 0) {
      const nodes = new DataSet(
        graphData.nodes.map(node => ({
          ...node,
          label: node.name,
          color: {
            background: node.color,
            border: node.borderColor || '#ffffff',
            highlight: {
              background: node.color,
              border: '#333333'
            }
          },
          size: node.radius,
          borderWidth: node.borderWidth || 2,
          shape: node.nodeType === 'intermediate' ? 'box' : 'dot',
          font: node.nodeType === 'intermediate' ? {
            size: 14,
            face: 'Microsoft YaHei, Arial, sans-serif',
            color: '#333333'
          } : {
            size: 12,
            face: 'Microsoft YaHei, Arial, sans-serif',
            color: '#ffffff'
          },
          margin: node.nodeType === 'intermediate' ? {
            top: 10,
            right: 10,
            bottom: 10,
            left: 10
          } : {
            top: 5,
            right: 5,
            bottom: 5,
            left: 5
          }
        }))
      );
      
      const edges = new DataSet(graphData.links);

      const networkData = {
        nodes: nodes,
        edges: edges
      };

      const options = {
        nodes: {
          shape: 'dot',
          size: 20,
          font: {
            size: 14,
            face: 'Microsoft YaHei, Arial, sans-serif'
          },
          borderWidth: 2,
          borderWidthSelected: 3,
          borderRadius: 8
        },
        edges: {
          width: 2,
          font: {
            size: 12,
            face: 'Microsoft YaHei, Arial, sans-serif'
          },
          smooth: {
            type: 'curvedCW',
            roundness: 0.2
          },
          arrows: {
            to: { enabled: false, scaleFactor: 0.5 }
          },
          scaling: {
            min: 1,
            max: 10
          }
        },
        physics: {
          stabilization: false,
          barnesHut: {
            gravitationalConstant: -12000,
            springConstant: 0.04,
            springLength: 150
          }
        },
        interaction: {
          dragNodes: true,
          dragView: true,
          zoomView: true,
          selectConnectedEdges: true,
          hover: true
        },
        layout: {
          improvedLayout: true
        }
      };

      // 创建网络实例
      networkRef.current = new Network(containerRef.current, networkData, options);

      // 绑定点击事件
      networkRef.current.on('click', handleNodeClick);

      // 清理函数
      return () => {
        if (networkRef.current) {
          networkRef.current.destroy();
        }
      };
    }
  }, [graphData]);

  // 重置视图
  const resetView = () => {
    if (networkRef.current) {
      networkRef.current.fit();
    }
  };

  // 放大视图
  const zoomIn = () => {
    if (networkRef.current) {
      const scale = networkRef.current.getScale();
      networkRef.current.moveTo({
        scale: scale * 1.2
      });
    }
  };

  // 缩小视图
  const zoomOut = () => {
    if (networkRef.current) {
      const scale = networkRef.current.getScale();
      networkRef.current.moveTo({
        scale: scale * 0.8
      });
    }
  };

  return (
    <div className="knowledge-mindmap-container">
      <div className="content-header">
        <h1 className="content-title">知识点导图</h1>
        <p className="content-subtitle">可视化展示你的考研知识点关系网络</p>
        <div className="mindmap-stats">
          <span className="stat-item">
            📊 当前显示: <strong>{filteredPoints.length}</strong> 个
          </span>
          <span className="stat-item">
            📚 已加入导图: <strong>{knowledgePoints.filter(kp => kp.show_in_mindmap).length}</strong> 个
          </span>
        </div>
      </div>
      
      <div className="content">
        <div className="mindmap-controls">
          <button className="control-btn" onClick={resetView} title="重置视图">🔄</button>
          <button className="control-btn" onClick={zoomIn} title="放大">+</button>
          <button className="control-btn" onClick={zoomOut} title="缩小">-</button>
          <button 
            className="add-relation-btn"
            onClick={() => setShowRelationModal(true)}
            title="添加知识点关系"
          >
            🔗 添加关系
          </button>
          <button 
            className="manage-mindmap-btn"
            onClick={() => navigate('/knowledge-management')}
            title="管理导图知识点"
          >
            🗺️ 管理导图
          </button>
        </div>
        {filteredPoints.length === 0 ? (
          <div className="mindmap-placeholder">
            <div className="mindmap-instruction">
              <h2>🗺️ 导图中还没有知识点</h2>
              <p>去知识点管理页面，点击知识点右侧的按钮将它们加入导图吧！</p>
              <button 
                className="go-to-management-btn"
                onClick={() => navigate('/knowledge-management')}
              >
                前往知识点管理
              </button>
            </div>
          </div>
        ) : (
          <div className="mindmap-view">
            <div 
              ref={containerRef} 
              style={{ 
                width: '100%', 
                height: '600px', 
                border: '1px solid #ddd', 
                borderRadius: '8px' 
              }}
            />
          </div>
        )}
      </div>
      
      {/* 知识点详情模态框 */}
      {showDetailModal && selectedPoint && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedPoint.point_name}</h3>
              <button className="close-btn" onClick={() => setShowDetailModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-item">
                <span className="detail-label">科目：</span>
                <span className="detail-value">{selectedPoint.subject}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">分类：</span>
                <span className="detail-value">{selectedPoint.category}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">重要性：</span>
                <span 
                  className="detail-value importance-tag"
                  style={{ color: getImportanceColor(selectedPoint.importance) }}
                >
                  {selectedPoint.importance}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">难度：</span>
                <span 
                  className="detail-value difficulty-tag"
                  style={{ color: getDifficultyColor(selectedPoint.difficulty) }}
                >
                  {selectedPoint.difficulty}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">考试要点：</span>
                <span className="detail-value">{selectedPoint.exam_points}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">内容：</span>
                <div className="detail-content">
                  <ReactMarkdown remarkPlugins={[require('remark-gfm').default]}>
                    {selectedPoint.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRelationModal && (
        <div className="modal-overlay" onClick={() => setShowRelationModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>管理知识点关系</h3>
              <button className="close-btn" onClick={() => setShowRelationModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>源知识点：</label>
                <select
                  value={relationFormData.source_kp_id || ''}
                  onChange={(e) => setRelationFormData({...relationFormData, source_kp_id: parseInt(e.target.value)})}
                >
                  <option value="">选择源知识点</option>
                  {filteredPoints.map(point => (
                    <option key={point.kp_id} value={point.kp_id}>{point.point_name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>目标知识点：</label>
                <select
                  value={relationFormData.target_kp_id || ''}
                  onChange={(e) => setRelationFormData({...relationFormData, target_kp_id: parseInt(e.target.value)})}
                >
                  <option value="">选择目标知识点</option>
                  {filteredPoints.map(point => (
                    <option key={point.kp_id} value={point.kp_id}>{point.point_name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={createIntermediate}
                    onChange={(e) => setCreateIntermediate(e.target.checked)}
                  />
                  创建中间节点（如"排序"连接"基数排序"和"冒泡排序"）
                </label>
              </div>
              {createIntermediate && (
                <div className="form-group">
                  <label>中间节点名称：</label>
                  <input
                    type="text"
                    value={relationFormData.intermediate_node_name}
                    onChange={(e) => setRelationFormData({...relationFormData, intermediate_node_name: e.target.value})}
                    placeholder="输入中间节点名称，如：排序"
                  />
                </div>
              )}
              <div className="form-group">
                <label>关系类型：</label>
                <select
                  value={relationFormData.relation_type}
                  onChange={(e) => setRelationFormData({...relationFormData, relation_type: e.target.value})}
                >
                  <option value="前置知识">前置知识</option>
                  <option value="相关概念">相关概念</option>
                  <option value="应用场景">应用场景</option>
                  <option value="包含关系">包含关系</option>
                  <option value="对比关系">对比关系</option>
                </select>
              </div>
              <div className="form-group">
                <label>关联强度：{relationFormData.strength}</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={relationFormData.strength}
                  onChange={(e) => setRelationFormData({...relationFormData, strength: parseInt(e.target.value)})}
                />
              </div>
              <div className="form-group">
                <label>关系描述：</label>
                <textarea
                  value={relationFormData.description}
                  onChange={(e) => setRelationFormData({...relationFormData, description: e.target.value})}
                  placeholder="描述这两个知识点之间的关系..."
                  rows="3"
                />
              </div>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowRelationModal(false)}>取消</button>
                <button className="btn-primary" onClick={handleCreateRelation}>创建关系</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeMindMap;