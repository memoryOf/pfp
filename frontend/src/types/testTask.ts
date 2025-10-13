// 测试任务相关类型定义

export interface TestTask {
  id: number;
  name: string;
  description?: string;
  scenario_type: 'single' | 'multi';
  target_host: string;
  script_id?: number;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface TestTaskCreate {
  name: string;
  description?: string;
  scenario_type: 'single' | 'multi';
  target_host: string;
  script_id?: number;
}

export interface TestTaskUpdate {
  name?: string;
  description?: string;
  scenario_type?: 'single' | 'multi';
  target_host?: string;
  script_id?: number;
}

export interface TestTaskWithScenarios extends TestTask {
  scenarios: TestScenario[];
}

export interface TestStrategy {
  id: number;
  name: string;
  description?: string;
  strategy_type: 'linear' | 'step' | 'adaptive';
  user_count: number;
  spawn_rate: number;
  run_time: number;
  ramp_up_time: number;
  strategy_config?: Record<string, any>;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface TestStrategyCreate {
  name: string;
  description?: string;
  strategy_type: 'linear' | 'step' | 'adaptive';
  user_count: number;
  spawn_rate: number;
  run_time: number;
  ramp_up_time: number;
  strategy_config?: Record<string, any>;
}

export interface TestStrategyUpdate {
  name?: string;
  description?: string;
  strategy_type?: 'linear' | 'step' | 'adaptive';
  user_count?: number;
  spawn_rate?: number;
  run_time?: number;
  ramp_up_time?: number;
  strategy_config?: Record<string, any>;
}

export interface TestScenario {
  id: number;
  task_id: number;
  interface_name: string;
  interface_url: string;
  method: string;
  weight: number;
  order: number;
  headers?: Record<string, string>;
  body?: string;
  timeout: number;
  created_at: string;
  updated_at: string;
}

export interface TestScenarioCreate {
  task_id: number;
  interface_name: string;
  interface_url: string;
  method: string;
  weight: number;
  order: number;
  headers?: Record<string, string>;
  body?: string;
  timeout: number;
}

export interface TestScenarioUpdate {
  interface_name?: string;
  interface_url?: string;
  method?: string;
  weight?: number;
  order?: number;
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}

export interface TestExecution {
  id: number;
  task_id: number;
  strategy_id: number;
  load_generator_id: number;
  load_generator_config_id: number;
  execution_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  total_requests: number;
  total_failures: number;
  avg_response_time: number;
  max_response_time: number;
  min_response_time: number;
  requests_per_second: number;
  error_message?: string;
  error_rate: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  duration?: number;
}

export interface TestExecutionCreate {
  task_id: number;
  strategy_id: number;
  load_generator_id: number;
  load_generator_config_id: number;
  execution_name: string;
}

export interface TestExecutionUpdate {
  execution_name?: string;
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  total_requests?: number;
  total_failures?: number;
  avg_response_time?: number;
  max_response_time?: number;
  min_response_time?: number;
  requests_per_second?: number;
  error_message?: string;
  error_rate?: number;
  started_at?: string;
  completed_at?: string;
  duration?: number;
}

export interface TestExecutionWithDetails extends TestExecution {
  task?: TestTask;
  strategy?: TestStrategy;
  load_generator?: {
    id: number;
    name: string;
    host: string;
    status: string;
  };
  load_generator_config?: {
    id: number;
    config_name: string;
    master_cpu_cores: number;
    master_memory_gb: number;
    worker_count: number;
  };
}

export interface TestExecutionStartRequest {
  task_id: number;
  strategy_id: number;
  load_generator_id: number;
  load_generator_config_id: number;
  execution_name?: string;
}

export interface TestExecutionStopRequest {
  reason?: string;
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
