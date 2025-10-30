import axios from 'axios';

// 创建文件管理专用的axios实例
const fileApi = axios.create({
  baseURL: '/api/v1/file-management',
  timeout: 120000, // 120秒超时
  headers: {
    'Content-Type': 'application/json',
  },
});

// 文件上传专用实例
const fileUploadApi = axios.create({
  baseURL: '/api/v1/file-management',
  timeout: 300000, // 5分钟超时用于大文件上传
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

// 请求拦截器
const addAuthInterceptor = (apiInstance: typeof fileApi) => {
  apiInstance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  apiInstance.interceptors.response.use(
    (response) => {
      return response.data;
    },
    (error) => {
      if (error.response) {
        const { status, data } = error.response;
        if (status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        throw new Error(data.message || '请求失败');
      }
      throw new Error('网络错误');
    }
  );
};

// 为两个实例添加拦截器
addAuthInterceptor(fileApi);
addAuthInterceptor(fileUploadApi);

export interface FileItem {
  id: number;
  original_name: string;
  stored_name: string;
  object_path: string;
  file_size: number;
  content_type?: string;
  description?: string;
  tags: string[];
  upload_path: string;
  creator?: string;
  updater?: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface FileListResponse {
  success: boolean;
  files: FileItem[];
  path: string;
  total: number;
}

export interface FileUploadResponse {
  success: boolean;
  message: string;
  file_id: number;
  file_name: string;
  file_path: string;
  file_size: number;
}

export const fileManagementService = {
  // 获取文件列表
  getFiles: (path: string = '/', recursive: boolean = false): Promise<FileListResponse> =>
    fileApi.get('/files', { 
      params: { path, recursive },
      timeout: 60000 // 60秒超时
    }),

  // 上传文件
  uploadFile: (formData: FormData): Promise<FileUploadResponse> =>
    fileUploadApi.post('/upload', formData),

  // 获取文件信息
  getFileInfo: (fileId: number): Promise<FileItem> =>
    fileApi.get(`/files/${fileId}`),

  // 下载文件
  downloadFile: (fileId: number): Promise<Blob> =>
    fileApi.get(`/files/${fileId}/download`, { 
      responseType: 'blob',
      timeout: 120000 // 120秒超时
    }),

  // 删除文件
  deleteFile: (fileId: number): Promise<{ success: boolean; message: string }> =>
    fileApi.delete(`/files/${fileId}`),

  // 更新文件信息
  updateFileInfo: (fileId: number, data: { description?: string; tags?: string }): Promise<any> =>
    fileApi.put(`/files/${fileId}`, data),
};

export default fileManagementService;