import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

/**
 * 上传参考文件
 * @param {FormData} formData - 包含user_id和file的FormData对象
 * @returns {Promise} 上传结果
 */
export const uploadFile = async (formData) => {
  const response = await axios.post(`${API_BASE_URL}/upload-file`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

/**
 * 获取用户上传的所有文件
 * @param {number} userId - 用户ID
 * @returns {Promise} 文件列表
 */
export const getUserFiles = async (userId) => {
  const response = await axios.get(`${API_BASE_URL}/files/${userId}`);
  return response.data;
};

/**
 * 为知识点关联参考文件
 * @param {number} kpId - 知识点ID
 * @param {number} fileId - 文件ID
 * @param {string} referenceNote - 引用说明（可选）
 * @returns {Promise} 关联结果
 */
export const attachFileToKnowledgePoint = async (kpId, fileId, referenceNote = '') => {
  const formData = new FormData();
  formData.append('file_id', fileId);
  if (referenceNote) {
    formData.append('reference_note', referenceNote);
  }

  const response = await axios.post(
    `${API_BASE_URL}/knowledge-points/${kpId}/files`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
};

/**
 * 获取知识点关联的所有文件
 * @param {number} kpId - 知识点ID
 * @returns {Promise} 文件列表
 */
export const getKnowledgePointFiles = async (kpId) => {
  const response = await axios.get(`${API_BASE_URL}/knowledge-points/${kpId}/files`);
  return response.data;
};

/**
 * 取消知识点与文件的关联
 * @param {number} kpId - 知识点ID
 * @param {number} fileId - 文件ID
 * @returns {Promise} 取消结果
 */
export const detachFileFromKnowledgePoint = async (kpId, fileId) => {
  const response = await axios.delete(
    `${API_BASE_URL}/knowledge-points/${kpId}/files/${fileId}`
  );
  return response.data;
};

/**
 * 删除文件
 * @param {number} fileId - 文件ID
 * @returns {Promise} 删除结果
 */
export const deleteFile = async (fileId) => {
  const response = await axios.delete(`${API_BASE_URL}/files/${fileId}`);
  return response.data;
};

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的文件大小
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

