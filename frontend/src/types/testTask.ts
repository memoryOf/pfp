// 测试任务相关类型定义

export interface TestTask {
  id: number;
  name: string;
  description?: string;
  target_host: string;
  target_port: number;
  user_count: number;
  spawn_rate: number;
  run_time: number;
  test_strategy: 'single' | 'progressive' | 'adaptive';
  status: 'draft' | 'running' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  created_by?: string;
  load_generator_id?: number;
  script_id?: number;
}

export interface TestTaskCreate {
  name: string;
  description?: string;
  target_host: string;
  target_port: number;
  user_count: number;
  spawn_rate: number;
  run_time: number;
  test_strategy: 'single' | 'progressive' | 'adaptive';
  load_generator_id?: number;
  script_id?: number;
}

export interface TestTaskUpdate {
  name?: string;
  description?: string;
  target_host?: string;
  target_port?: number;
  user_count?: number;
  spawn_rate?: number;
  run_time?: number;
  test_strategy?: 'single' | 'progressive' | 'adaptive';
  status?: 'draft' | 'running' | 'completed' | 'failed' | 'cancelled';
  load_generator_id?: number;
  script_id?: number;
}

export interface TestExecution {
  id: number;
  task_id: number;
  execution_id: string;
  execution_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  user_count: number;
  spawn_rate: number;
  run_time: number;
  start_time?: string;
  end_time?: string;
  started_at?: string;
  completed_at?: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  total_failures: number;
  avg_response_time: number;
  max_response_time: number;
  min_response_time: number;
  requests_per_second: number;
  error_rate: number;
  created_at: string;
  updated_at: string;
}

export interface TestScript {
  id: number;
  name: string;
  content: string;
  version: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  description?: string;
}

export interface TestScriptCreate {
  name: string;
  content: string;
  description?: string;
}

export interface TestScriptUpdate {
  name?: string;
  content?: string;
  description?: string;
  is_active?: boolean;
}
