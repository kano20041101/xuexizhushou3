import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

// 获取用户的所有知识点
export const getKnowledgePoints = async (userId, subject = null) => {
  try {
    let url = `${API_BASE_URL}/knowledge-points/${userId}`;
    if (subject) {
      url += `?subject=${encodeURIComponent(subject)}`;
    }
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('获取知识点失败:', error);
    throw error;
  }
};

// 创建知识点
export const createKnowledgePoint = async (knowledgePoint) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/knowledge-points`, knowledgePoint);
    return response.data;
  } catch (error) {
    console.error('创建知识点失败:', error);
    throw error;
  }
};

// 更新知识点
export const updateKnowledgePoint = async (kpId, knowledgePoint) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/knowledge-points/${kpId}`, knowledgePoint);
    return response.data;
  } catch (error) {
    console.error('更新知识点失败:', error);
    throw error;
  }
};

// 删除知识点
export const deleteKnowledgePoint = async (kpId) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/knowledge-points/${kpId}`);
    return response.data;
  } catch (error) {
    console.error('删除知识点失败:', error);
    throw error;
  }
};

// 获取单个知识点详情
export const getKnowledgePointDetail = async (kpId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/knowledge-points/detail/${kpId}`);
    return response.data;
  } catch (error) {
    console.error('获取知识点详情失败:', error);
    throw error;
  }
};

// 批量更新导图状态
export const batchUpdateMindmap = async (kpIds, showInMindmap) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/knowledge-points/batch-update-mindmap`, {
      kp_ids: kpIds,
      show_in_mindmap: showInMindmap
    });
    return response.data;
  } catch (error) {
    console.error('批量更新导图状态失败:', error);
    throw error;
  }
};

// 创建知识点关系
export const createKnowledgeRelation = async (relation) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/knowledge-relations`, relation);
    return response.data;
  } catch (error) {
    console.error('创建知识点关系失败:', error);
    throw error;
  }
};

// 获取知识点关系
export const getKnowledgeRelations = async (userId, sourceKpId = null) => {
  try {
    let url = `${API_BASE_URL}/knowledge-relations/${userId}`;
    if (sourceKpId) {
      url += `?source_kp_id=${sourceKpId}`;
    }
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('获取知识点关系失败:', error);
    throw error;
  }
};

// 删除知识点关系
export const deleteKnowledgeRelation = async (relationId) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/knowledge-relations/${relationId}`);
    return response.data;
  } catch (error) {
    console.error('删除知识点关系失败:', error);
    throw error;
  }
};

// 创建中间节点
export const createIntermediateNode = async (data) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/knowledge-points/create-intermediate-node`, data);
    return response.data;
  } catch (error) {
    console.error('创建中间节点失败:', error);
    throw error;
  }
};
