import axios, { AxiosResponse } from 'axios';
import { LoadGenerator, LoadGeneratorConfig, ConnectionTestResult, ConfigValidationResult } from '../types/loadGenerator';
import { 
  TestTask, TestTaskWithScenarios, TestTaskCreate, TestTaskUpdate,
  TestStrategy, TestStrategyCreate, TestStrategyUpdate,
  TestScenario, TestScenarioCreate, TestScenarioUpdate,
  TestExecution, TestExecutionCreate, TestExecutionUpdate, TestExecutionWithDetails,
  TestExecutionStartRequest, TestExecutionStopRequest,
  TestScript 
} from '../types/testTask';

// 创建axios实例
const api = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 可以在这里添加认证token
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

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      if (status === 401) {
        // 处理未授权
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      throw new Error(data.message || '请求失败');
    }
    throw new Error('网络错误');
  }
);

// 压测机相关API
export const loadGeneratorService = {
  // 获取压测机列表
  getLoadGenerators: (params?: any): Promise<LoadGenerator[]> =>
    api.get('/load-generators/', { params }),

  // 获取单个压测机
  getLoadGenerator: (id: number): Promise<LoadGenerator> => 
    api.get(`/load-generators/${id}/`),

  // 创建压测机
  createLoadGenerator: (data: any): Promise<LoadGenerator> => 
    api.post('/load-generators/', data),

  // 更新压测机
  updateLoadGenerator: (id: number, data: any): Promise<LoadGenerator> => 
    api.put(`/load-generators/${id}/`, data),

  // 删除压测机
  deleteLoadGenerator: (id: number): Promise<void> => 
    api.delete(`/load-generators/${id}/`),

  // 测试连接
  testConnection: (id: number): Promise<ConnectionTestResult> => 
    api.post(`/load-generators/${id}/test-connection/`),

  // 获取压测机配置列表
  getConfigs: (id: number): Promise<LoadGeneratorConfig[]> => 
    api.get(`/load-generators/${id}/configs/`),

  // 创建压测机配置
  createConfig: (id: number, data: any): Promise<LoadGeneratorConfig> => 
    api.post(`/load-generators/${id}/configs/`, data),

  // 更新压测机配置
  updateConfig: (id: number, data: any): Promise<LoadGeneratorConfig> => 
    api.put(`/load-generators/configs/${id}/`, data),

  // 删除压测机配置
  deleteConfig: (id: number): Promise<void> => 
    api.delete(`/load-generators/configs/${id}/`),

  // 验证压测机配置
  validateConfig: (id: number): Promise<ConfigValidationResult> => 
    api.post(`/load-generators/configs/${id}/validate/`),
};

// 测试任务相关API
export const testTaskService = {
  // 获取测试任务列表
  getTestTasks: (params?: any): Promise<TestTask[]> =>
    api.get('/test-tasks/', { params }),

  // 获取单个测试任务（包含场景）
  getTestTask: (id: number): Promise<TestTaskWithScenarios> =>
    api.get(`/test-tasks/${id}/`),

  // 创建测试任务
  createTestTask: (data: TestTaskCreate): Promise<TestTask> =>
    api.post('/test-tasks/', data),

  // 更新测试任务
  updateTestTask: (id: number, data: TestTaskUpdate): Promise<TestTask> =>
    api.put(`/test-tasks/${id}/`, data),

  // 删除测试任务
  deleteTestTask: (id: number): Promise<void> =>
    api.delete(`/test-tasks/${id}/`),

  // 获取测试执行记录
  getExecutions: (taskId: number): Promise<TestExecution[]> =>
    api.get(`/test-tasks/${taskId}/executions/`),
};

// 测试策略相关API
export const testStrategyService = {
  // 获取测试策略列表
  getTestStrategies: (params?: any): Promise<TestStrategy[]> =>
    api.get('/test-strategies/', { params }),

  // 获取单个测试策略
  getTestStrategy: (id: number): Promise<TestStrategy> =>
    api.get(`/test-strategies/${id}/`),

  // 创建测试策略
  createTestStrategy: (data: TestStrategyCreate): Promise<TestStrategy> =>
    api.post('/test-strategies/', data),

  // 更新测试策略
  updateTestStrategy: (id: number, data: TestStrategyUpdate): Promise<TestStrategy> =>
    api.put(`/test-strategies/${id}/`, data),

  // 删除测试策略
  deleteTestStrategy: (id: number): Promise<void> =>
    api.delete(`/test-strategies/${id}/`),
};

// 测试场景相关API
export const testScenarioService = {
  // 根据任务ID获取测试场景列表
  getTestScenariosByTask: (taskId: number): Promise<TestScenario[]> =>
    api.get(`/test-scenarios/task/${taskId}/`),

  // 获取单个测试场景
  getTestScenario: (id: number): Promise<TestScenario> =>
    api.get(`/test-scenarios/${id}/`),

  // 创建测试场景
  createTestScenario: (data: TestScenarioCreate): Promise<TestScenario> =>
    api.post('/test-scenarios/', data),

  // 更新测试场景
  updateTestScenario: (id: number, data: TestScenarioUpdate): Promise<TestScenario> =>
    api.put(`/test-scenarios/${id}/`, data),

  // 删除测试场景
  deleteTestScenario: (id: number): Promise<void> =>
    api.delete(`/test-scenarios/${id}/`),

  // 获取场景关联的文件
  getScenarioFiles: (scenarioId: number): Promise<any[]> =>
    api.get(`/scenario-files/scenario/${scenarioId}/files/`),

  // 上传场景文件
  uploadScenarioFile: (scenarioId: number, formData: FormData): Promise<any> =>
    api.post(`/scenario-files/scenario/${scenarioId}/files/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  // 删除场景文件
  deleteScenarioFile: (fileId: number): Promise<void> =>
    api.delete(`/scenario-files/files/${fileId}/`),
};

// 测试执行相关API
export const testExecutionService = {
  // 获取测试执行列表
  getTestExecutions: (params?: any): Promise<TestExecution[]> =>
    api.get('/test-executions/', { params }),

  // 获取单个测试执行详情
  getTestExecution: (id: number): Promise<TestExecutionWithDetails> =>
    api.get(`/test-executions/${id}/`),

  // 创建测试执行
  createTestExecution: (data: TestExecutionCreate): Promise<TestExecution> =>
    api.post('/test-executions/', data),

  // 更新测试执行
  updateTestExecution: (id: number, data: TestExecutionUpdate): Promise<TestExecution> =>
    api.put(`/test-executions/${id}/`, data),

  // 启动测试执行
  startTestExecution: (id: number): Promise<any> =>
    api.post(`/test-executions/${id}/start/`),

  // 停止测试执行
  stopTestExecution: (id: number, data: TestExecutionStopRequest): Promise<any> =>
    api.post(`/test-executions/${id}/stop/`, data),

  // 删除测试执行
  deleteTestExecution: (id: number): Promise<void> =>
    api.delete(`/test-executions/${id}/`),
};

// 测试脚本相关API
export const testScriptService = {
  // 获取测试脚本列表
  getTestScripts: (params?: any): Promise<TestScript[]> =>
    api.get('/test-scripts/', { params }),

  // 获取单个测试脚本
  getTestScript: (id: number): Promise<TestScript> =>
    api.get(`/test-scripts/${id}/`),

  // 创建测试脚本
  createTestScript: (data: any): Promise<TestScript> =>
    api.post('/test-scripts/', data),

  // 更新测试脚本
  updateTestScript: (id: number, data: any): Promise<TestScript> =>
    api.put(`/test-scripts/${id}/`, data),

  // 删除测试脚本
  deleteTestScript: (id: number): Promise<void> =>
    api.delete(`/test-scripts/${id}/`),

  // AI生成脚本
  generateScript: (data: any): Promise<TestScript> =>
    api.post('/test-scripts/generate/', data),

  // AI优化脚本
  optimizeScript: (id: number, data: any): Promise<TestScript> =>
    api.post(`/test-scripts/${id}/optimize/`, data),
};

// 心跳检测相关API
export const heartbeatService = {
  // 获取心跳检测状态
  getHeartbeatStatus: (): Promise<any> =>
    api.get('/heartbeat/status'),

  // 手动触发心跳检测
  checkAllHeartbeats: (): Promise<any> =>
    api.post('/heartbeat/check-all'),

  // 异步触发心跳检测
  checkAllHeartbeatsAsync: (): Promise<any> =>
    api.post('/heartbeat/check-all-async'),

  // 获取任务状态
  getTaskStatus: (taskId: string): Promise<any> =>
    api.get(`/heartbeat/task/${taskId}`),
};


// 监控相关API
export const monitoringService = {
  // 获取实时监控数据
  getRealtimeMetrics: (loadGeneratorId: number) => 
    api.get(`/monitoring/realtime/${loadGeneratorId}`),

  // 获取历史监控数据
  getHistoricalMetrics: (loadGeneratorId: number, params: any) => 
    api.get(`/monitoring/historical/${loadGeneratorId}`, { params }),

  // 获取测试报告
  getTestReport: (executionId: number) => 
    api.get(`/monitoring/reports/${executionId}`),
};

export default api;
