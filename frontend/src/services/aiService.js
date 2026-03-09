import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

/**
 * 调用AI生成知识点内容
 * @param {Object} requestData - 请求数据
 * @param {string} requestData.subject - 科目
 * @param {string} requestData.point_name - 知识点名称
 * @param {string} requestData.category - 分类
 * @param {string} requestData.difficulty - 难度
 * @param {string} requestData.importance - 重要度
 * @returns {Promise} 返回AI生成的内容
 */
export const generateKnowledgeContent = async (requestData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/ai/generate-content`, requestData);
    return response.data;
  } catch (error) {
    console.error('AI生成内容失败:', error);
    throw error.response?.data || { detail: 'AI服务调用失败' };
  }
};

/**
 * 调用AI回答问题
 * @param {Object} requestData - 请求数据
 * @param {string} requestData.question - 问题内容
 * @param {string} requestData.context - 可选的上下文信息
 * @returns {Promise} 返回AI的回答
 */
export const askQuestion = async (requestData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/ai/ask-question`, requestData);
    return response.data;
  } catch (error) {
    console.error('AI回答问题失败:', error);
    throw error.response?.data || { detail: 'AI问答服务调用失败' };
  }
};

/**
 * 调用AI进行学情分析
 * @param {Object} requestData - 请求数据
 * @param {number} requestData.user_id - 用户ID
 * @returns {Promise} 返回AI的学情分析结果
 */
export const analyzeLearning = async (requestData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/ai/analyze-learning`, requestData);
    return response.data;
  } catch (error) {
    console.error('AI学情分析失败:', error);
    throw error.response?.data || { detail: 'AI学情分析服务调用失败' };
  }
};

/**
 * 创建学习记录
 * @param {Object} recordData - 学习记录数据
 * @param {number} recordData.user_id - 用户ID
 * @param {string} recordData.action_type - 学习行为类型
 * @param {number} recordData.duration - 学习时长（秒）
 * @param {number} [recordData.kp_id] - 可选的知识点ID
 * @param {number} [recordData.score] - 可选的测试得分
 * @param {string} [recordData.result] - 可选的测试结果
 * @param {string} [recordData.notes] - 可选的学习笔记
 * @returns {Promise} 返回创建结果
 */
export const createLearningRecord = async (recordData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/learning-records`, recordData);
    return response.data;
  } catch (error) {
    console.error('创建学习记录失败:', error);
    // 确保无论什么类型的错误都被正确抛出
    throw error.response?.data || error.message || error || { detail: '创建学习记录失败' };
  }
};

/**
 * 获取用户学习记录
 * @param {number} userId - 用户ID
 * @returns {Promise} 返回用户的学习记录列表
 */
export const getUserLearningRecords = async (userId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/learning-records/${userId}`);
    return response.data;
  } catch (error) {
    console.error('获取学习记录失败:', error);
    throw error.response?.data || { detail: '获取学习记录失败' };
  }
};

/**
 * 调用AI生成习题
 * @param {Object} requestData - 请求数据
 * @param {number} requestData.user_id - 用户ID
 * @param {number} requestData.kp_id - 知识点ID
 * @param {string} requestData.question_type - 题目类型（选择题/填空题/简答题）
 * @param {number} [requestData.question_count=3] - 题目数量
 * @param {string} [requestData.difficulty=中等] - 难度等级
 * @returns {Promise} 返回AI生成的习题列表
 */
export const generateExercises = async (requestData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/ai/generate-exercises`, requestData);
    return response.data;
  } catch (error) {
    console.error('AI生成习题失败:', error);
    throw error.response?.data || { detail: 'AI生成习题服务调用失败' };
  }
};

/**
 * 保存习题到数据库
 * @param {Object} requestData - 请求数据
 * @param {number} requestData.user_id - 用户ID
 * @param {number} requestData.kp_id - 知识点ID
 * @param {Array} requestData.exercises - 习题列表
 * @returns {Promise} 返回保存结果
 */
export const saveExercises = async (requestData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/exercises`, requestData);
    return response.data;
  } catch (error) {
    console.error('保存习题失败:', error);
    throw error.response?.data || { detail: '保存习题服务调用失败' };
  }
};

/**
 * 提交用户答案
 * @param {Object} requestData - 请求数据
 * @param {number} requestData.user_id - 用户ID
 * @param {number} requestData.exercise_id - 习题ID
 * @param {string} requestData.user_answer - 用户答案
 * @returns {Promise} 返回提交结果
 */
export const submitExerciseAnswer = async (requestData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/exercises/submit-answer`, requestData);
    return response.data;
  } catch (error) {
    console.error('提交答案失败:', error);
    const errorData = error.response?.data;
    if (errorData && typeof errorData === 'object') {
      throw errorData;
    }
    throw { detail: '提交答案服务调用失败' };
  }
};

/**
 * 获取用户保存的习题
 * @param {number} userId - 用户ID
 * @param {number} [kpId] - 可选的知识点ID
 * @param {number} [page=1] - 页码
 * @param {number} [pageSize=5] - 每页数量
 * @returns {Promise} 返回用户习题列表
 */
export const getUserExercises = async (userId, kpId = null, page = 1, pageSize = 5) => {
  try {
    let url = `${API_BASE_URL}/exercises/${userId}`;
    const params = [];
    if (kpId) {
      params.push(`kp_id=${kpId}`);
    }
    params.push(`page=${page}`);
    params.push(`page_size=${pageSize}`);
    if (params.length > 0) {
      url += '?' + params.join('&');
    }
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('获取习题失败:', error);
    throw error.response?.data || { detail: '获取习题服务调用失败' };
  }
};

/**
 * 删除习题
 * @param {number} exerciseId - 习题ID
 * @param {number} userId - 用户ID
 * @returns {Promise} 返回删除结果
 */
export const deleteExercise = async (exerciseId, userId) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/exercises/${exerciseId}?user_id=${userId}`);
    return response.data;
  } catch (error) {
    console.error('删除习题失败:', error);
    throw error.response?.data || { detail: '删除习题服务调用失败' };
  }
};

