// 压测机相关类型定义

export interface LoadGenerator {
  id: number;
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  ssh_key_path?: string;
  cpu_cores: number;
  memory_gb: number;
  network_bandwidth?: string;
  disk_space?: string;
  status: 'online' | 'offline' | 'maintenance';
  last_heartbeat?: string;
  cpu_usage: number;
  memory_usage: number;
  network_usage: number;
  locust_version?: string;
  python_version?: string;
  system_info?: Record<string, any>;
  created_at: string;
  updated_at: string;
  description?: string;
  is_active: boolean;
}

export interface LoadGeneratorConfig {
  id: number;
  load_generator_id: number;
  config_name: string;
  master_enabled: boolean;
  master_cpu_cores: number;
  master_memory_gb: number;
  master_network_mbps: number;
  worker_count: number;
  worker_cpu_cores: number;
  worker_memory_gb: number;
  worker_network_mbps: number;
  system_cpu_cores: number;
  system_memory_gb: number;
  system_network_mbps: number;
  is_valid: boolean;
  validation_message?: string;
  created_at: string;
  updated_at: string;
  description?: string;
  is_active: boolean;
}

export interface LoadGeneratorCreate {
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  ssh_key_path?: string;
  cpu_cores: number;
  memory_gb: number;
  network_bandwidth?: string;
  disk_space?: string;
  description?: string;
}

export interface LoadGeneratorUpdate {
  name?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  ssh_key_path?: string;
  cpu_cores?: number;
  memory_gb?: number;
  network_bandwidth?: string;
  disk_space?: string;
  description?: string;
  is_active?: boolean;
}

export interface LoadGeneratorConfigCreate {
  config_name: string;
  master_enabled: boolean;
  master_cpu_cores: number;
  master_memory_gb: number;
  master_network_mbps: number;
  worker_count: number;
  worker_cpu_cores: number;
  worker_memory_gb: number;
  worker_network_mbps: number;
  system_cpu_cores: number;
  system_memory_gb: number;
  system_network_mbps: number;
  description?: string;
}

export interface LoadGeneratorConfigUpdate {
  config_name?: string;
  master_enabled?: boolean;
  master_cpu_cores?: number;
  master_memory_gb?: number;
  master_network_mbps?: number;
  worker_count?: number;
  worker_cpu_cores?: number;
  worker_memory_gb?: number;
  worker_network_mbps?: number;
  system_cpu_cores?: number;
  system_memory_gb?: number;
  system_network_mbps?: number;
  description?: string;
  is_active?: boolean;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  system_info?: Record<string, any>;
}

export interface ConfigValidationResult {
  is_valid: boolean;
  message: string;
  resource_usage?: {
    cpu_cores: number;
    memory_gb: number;
    network_mbps: number;
  };
}
