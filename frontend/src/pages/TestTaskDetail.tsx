import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  Row, 
  Col, 
  Button, 
  Space, 
  Tag, 
  Table, 
  message,
  Tabs,
  Statistic,
  Progress,
  Modal,
  Form,
  Input,
  Select,
  Upload,
  Divider,
  Typography,
  Steps,
  Collapse,
  Tooltip,
  Popconfirm,
  Switch,
  Pagination
} from 'antd';
import { 
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  ExperimentOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  UploadOutlined,
  EditOutlined,
  CopyOutlined,
  DeleteOutlined,
  FileTextOutlined,
  SettingOutlined,
  CloudServerOutlined,
  InfoCircleOutlined,
  DownOutlined,
  SaveOutlined,
  EyeOutlined,
  FolderOpenOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { 
  testTaskService, 
  testStrategyService, 
  testExecutionService,
  loadGeneratorService,
  deploymentService,
  debugService
} from '../services/api';
import { scenarioService } from '../services/api';
import type { 
  TestTask, 
  TestExecution, 
  TestStrategy,
  TestExecutionCreate
} from '../types/testTask';
import type { LoadGenerator, LoadGeneratorConfig, DeploymentConfig } from '../types/loadGenerator';
import type { Scenario } from '../types/scenario';
import ScriptEditor from '../components/ScriptEditor';
import LoadProfile from './LoadProfile';

const { Title, Text } = Typography;
const { Step } = Steps;
const { Panel } = Collapse;

type ScenarioRow = { id: string; name: string; enabled: boolean; referenceId?: number; scenarioId: number };

const TestTaskDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [testTask, setTestTask] = useState<TestTask | null>(null);
  const [executions, setExecutions] = useState<TestExecution[]>([]);
  const [strategies, setStrategies] = useState<TestStrategy[]>([]);
  const [loadGenerators, setLoadGenerators] = useState<LoadGenerator[]>([]);
  const [loadGeneratorConfigs, setLoadGeneratorConfigs] = useState<LoadGeneratorConfig[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 场景创建相关状态
  const [scenarioModalVisible, setScenarioModalVisible] = useState(false);
  const [executionModalVisible, setExecutionModalVisible] = useState(false);
  const [editorModalVisible, setEditorModalVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [scenarioForm] = Form.useForm();
  const [executionForm] = Form.useForm();
  
  // 场景配置状态
  const [selectedStrategy, setSelectedStrategy] = useState<TestStrategy | null>(null);
  const [selectedLoadGenerator, setSelectedLoadGenerator] = useState<LoadGenerator | null>(null);
  const [selectedDeploymentConfig, setSelectedDeploymentConfig] = useState<DeploymentConfig | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<LoadGeneratorConfig | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{file: File, content: string, id: string}>>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [isCreatingScenario, setIsCreatingScenario] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState<string>('scenario');
  const [scenarioRows, setScenarioRows] = useState<ScenarioRow[]>([]);
  
  // 脚本编辑器相关状态
  const [scriptContent, setScriptContent] = useState('');
  const [currentScriptFileName, setCurrentScriptFileName] = useState('locustfile.py');
  // 场景选择弹窗
  const [scenarioPickerVisible, setScenarioPickerVisible] = useState(false);
  const [scenarioPickerLoading, setScenarioPickerLoading] = useState(false);
  const [scenarioPickerData, setScenarioPickerData] = useState<Scenario[]>([]);
  const [scenarioPickerSelectedRowKeys, setScenarioPickerSelectedRowKeys] = useState<React.Key[]>([]);
  const [scenarioPickerPage, setScenarioPickerPage] = useState({ current: 1, pageSize: 5 });
  
  // 部署和调试相关状态
  const [deploymentType, setDeploymentType] = useState<'local' | 'remote'>('remote');
  const [selectedDeployLoadGenerator, setSelectedDeployLoadGenerator] = useState<LoadGenerator | null>(null);
  const [deployStep, setDeployStep] = useState(0);
  const [deploymentLoading, setDeploymentLoading] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<any>(null);
  // 部署步骤状态
  const [deploymentSteps, setDeploymentSteps] = useState([
    { id: 'venv', name: 'Preparing virtual environment', status: 'waiting' as 'waiting' | 'processing' | 'success' | 'error' },
    { id: 'directory', name: 'Creating target directory', status: 'waiting' as 'waiting' | 'processing' | 'success' | 'error' },
    { id: 'cleanup', name: 'Cleaning old files', status: 'waiting' as 'waiting' | 'processing' | 'success' | 'error' },
    { id: 'upload', name: 'Uploading script files', status: 'waiting' as 'waiting' | 'processing' | 'success' | 'error' },
    { id: 'validate', name: 'Validating script syntax', status: 'waiting' as 'waiting' | 'processing' | 'success' | 'error' },
  ]);
  const [debugId, setDebugId] = useState<string | null>(null);
  const [debugStatus, setDebugStatus] = useState<string>('idle'); // idle, running, stopped
  const [debugLogs, setDebugLogs] = useState<Array<{timestamp: string, level: string, message: string}>>([]);
  const [debugWs, setDebugWs] = useState<WebSocket | null>(null);
  const [debugConfig, setDebugConfig] = useState({ users: 1, duration: 30, host: '', spawn_rate: 1 });

  // 组件卸载时关闭WebSocket连接
  useEffect(() => {
    return () => {
      if (debugWs) {
        debugWs.close();
      }
    };
  }, [debugWs]);

  const handleScenarioConfirm = async () => {
    if (!id) return;
    const selected = scenarioPickerData.filter(s => scenarioPickerSelectedRowKeys.includes(s.id));
    try {
      // 批量保存到服务端
      const refs = selected.map(s => ({
        scenario_id: s.id,
        is_enabled: !!s.is_active
      }));
      await testTaskService.createTaskScenarioReferences(parseInt(id), refs);
      message.success('Scenarios bound successfully');
      // 重新加载
      await loadTaskScenarioReferences();
    } catch (error) {
      console.error('Failed to bind scenarios:', error);
      message.error('Failed to bind scenarios');
    }
    setScenarioPickerVisible(false);
    setScenarioPickerSelectedRowKeys([]);
  };

  const loadTaskScenarioReferences = async () => {
    if (!id) return;
    try {
      const references = await testTaskService.getTaskScenarioReferences(parseInt(id));
      // 获取场景详情
      const rows = await Promise.all(references.map(async (ref: any): Promise<ScenarioRow | null> => {
        try {
          const scenario = await scenarioService.getScenario(ref.scenario_id);
          return {
            id: String(scenario.id),
            name: scenario.name,
            enabled: Boolean(ref.is_enabled),
            referenceId: Number(ref.id),
            scenarioId: Number(scenario.id)
          };
        } catch (e) {
          return null;
        }
      }));
      setScenarioRows(rows.filter((r): r is ScenarioRow => r !== null));
    } catch (error) {
      console.error('Failed to load task scenario references:', error);
    }
  };

  useEffect(() => {
    if (id) {
      fetchTestTask();
      fetchExecutions();
      fetchStrategies();
      fetchLoadGenerators();
      loadTaskScenarioReferences();
    }
  }, [id]);

  // 加载脚本文件到编辑器
  const handleLoadScript = useCallback(async (file: any) => {
    try {
      // 获取文件内容
      const response = await fetch(`/api/v1/scenario-files/files/${file.id}/content/`);
      if (response.ok) {
        const content = await response.text();
        setScriptContent(content);
        setCurrentScriptFileName(file.file_name);
        message.success(`脚本 ${file.file_name} 加载成功`);
      } else {
        message.error('加载脚本失败');
      }
    } catch (error) {
      console.error('加载脚本失败:', error);
      message.error('加载脚本失败');
    }
  }, []);

  const fetchTestTask = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await testTaskService.getTestTask(parseInt(id));
      console.log('=== fetchTestTask ===');
      console.log('Task data:', data);
      setTestTask(data);
    } catch (error) {
      console.error('Error in fetchTestTask:', error);
      message.error('Failed to fetch test task details');
    } finally {
      setLoading(false);
    }
  };

  const fetchExecutions = async () => {
    if (!id) return;
    try {
      const data = await testTaskService.getExecutions(parseInt(id));
      setExecutions(data);
    } catch (error) {
      message.error('Failed to fetch execution records');
    }
  };

  const fetchStrategies = async () => {
    try {
      const data = await testStrategyService.getTestStrategies();
      setStrategies(data);
    } catch (error) {
      message.error('Failed to fetch strategy list');
    }
  };

  const fetchLoadGenerators = async () => {
    try {
      const data = await loadGeneratorService.getLoadGenerators();
      setLoadGenerators(data);
    } catch (error) {
      message.error('Failed to fetch load generator list');
    }
  };

  const loadLoadGeneratorConfigs = async (loadGeneratorId: number) => {
    try {
      const configs = await loadGeneratorService.getConfigs(loadGeneratorId);
      setLoadGeneratorConfigs(configs);
    } catch (error) {
      message.error('Failed to load load generator configs');
    }
  };



  const handleFileSelect = (fileId: string) => {
    setSelectedFileId(fileId);
    const selectedFile = uploadedFiles.find(f => f.id === fileId);
    if (selectedFile) {
      setEditorContent(selectedFile.content);
    }
  };

  const handleFileDelete = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    
    // 如果删除的是当前选中的文件，选择其他文件或清空
    if (selectedFileId === fileId) {
      const remainingFiles = uploadedFiles.filter(f => f.id !== fileId);
      if (remainingFiles.length > 0) {
        const newSelectedId = remainingFiles[0].id;
        setSelectedFileId(newSelectedId);
        setEditorContent(remainingFiles[0].content);
      } else {
        setSelectedFileId(null);
        setEditorContent('');
      }
    }
  };

  const handleContentUpdate = (content: string) => {
    setEditorContent(content);
    if (selectedFileId) {
      setUploadedFiles(prev => prev.map(f => 
        f.id === selectedFileId ? { ...f, content } : f
      ));
    }
  };

  const handleEditorSave = () => {
    setEditorModalVisible(false);
    message.success('Script saved successfully');
  };


  const handleExecuteScenario = async () => {
    if (!selectedStrategy || !selectedLoadGenerator || !selectedDeploymentConfig || !selectedConfig) {
      message.error('Please complete all configuration steps');
      return;
    }

    try {
      const executionData: TestExecutionCreate = {
        task_id: parseInt(id!),
        strategy_id: selectedStrategy.id,
        load_generator_id: selectedLoadGenerator.id,
        load_generator_config_id: selectedConfig.id,
        execution_name: `Execution_${new Date().toLocaleString()}`
      };
      
      await testExecutionService.createTestExecution(executionData);
      message.success('Test execution created successfully');
      setIsCreatingScenario(false);
      setCurrentStep(0);
      fetchExecutions();
    } catch (error) {
      message.error('Failed to create test execution');
    }
  };

  const handleStart = () => {
    setExecutionModalVisible(true);
  };

  const handleCreateExecution = async (values: any) => {
    if (!id) return;
    try {
      const executionData: TestExecutionCreate = {
        task_id: parseInt(id),
        strategy_id: values.strategy_id,
        load_generator_id: values.load_generator_id,
        load_generator_config_id: values.load_generator_config_id,
        execution_name: values.execution_name || `Execution_${new Date().toLocaleString()}`
      };
      
      await testExecutionService.createTestExecution(executionData);
      message.success('Test execution created successfully');
      setExecutionModalVisible(false);
      fetchExecutions();
    } catch (error) {
      message.error('Failed to create test execution');
    }
  };


  const getStatusTag = (status: string) => {
    const statusMap = {
      pending: { color: 'default', text: 'Pending' },
      running: { color: 'processing', text: 'Running' },
      completed: { color: 'success', text: 'Completed' },
      failed: { color: 'error', text: 'Failed' },
      cancelled: { color: 'warning', text: 'Cancelled' }
    };
    const config = statusMap[status as keyof typeof statusMap] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getScenarioTypeTag = (scenarioType: string) => {
    const typeMap = {
      single: { color: 'blue', text: 'Single Interface' },
      multi: { color: 'green', text: 'Multi Interface' }
    };
    const config = typeMap[scenarioType as keyof typeof typeMap] || { color: 'default', text: scenarioType };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const executionColumns = [
    {
      title: 'Execution Name',
      dataIndex: 'execution_name',
      key: 'execution_name',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Total Requests',
      dataIndex: 'total_requests',
      key: 'total_requests',
    },
    {
      title: 'Failures',
      dataIndex: 'total_failures',
      key: 'total_failures',
    },
    {
      title: 'Avg Response Time (ms)',
      dataIndex: 'avg_response_time',
      key: 'avg_response_time',
      render: (time: number) => time.toFixed(2),
    },
    {
      title: 'RPS',
      dataIndex: 'requests_per_second',
      key: 'requests_per_second',
      render: (rps: number) => rps.toFixed(2),
    },
    {
      title: 'Error Rate',
      dataIndex: 'error_rate',
      key: 'error_rate',
      render: (rate: number) => `${(rate * 100).toFixed(2)}%`,
    },
    {
      title: 'Started At',
      dataIndex: 'started_at',
      key: 'started_at',
      render: (date: string) => date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: 'Completed At',
      dataIndex: 'completed_at',
      key: 'completed_at',
      render: (date: string) => date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: 'Actions',
      key: 'action',
      render: (_: any, record: TestExecution) => (
        <Space>
          {record.status === 'pending' && (
            <Button
              size="small"
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={() => {
                testExecutionService.startTestExecution(record.id).then(() => {
                  message.success('Execution started');
                  fetchExecutions();
                }).catch(() => {
                  message.error('Failed to start execution');
                });
              }}
            >
              Start
            </Button>
          )}
          {record.status === 'running' && (
            <Button
              size="small"
              danger
              icon={<PauseCircleOutlined />}
              onClick={() => {
                testExecutionService.stopTestExecution(record.id, { reason: 'Manual stop' }).then(() => {
                  message.success('Execution stopped');
                  fetchExecutions();
                }).catch(() => {
                  message.error('Failed to stop execution');
                });
              }}
            >
              Stop
            </Button>
          )}
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => navigate(`/test-executions/${record.id}`)}
          >
            View Details
          </Button>
        </Space>
      ),
    },
  ];

  if (!testTask) {
    return <div>Loading...</div>;
  }

  const latestExecution = executions[0];
  const successRate = latestExecution ? 
    ((latestExecution.total_requests - latestExecution.total_failures) / latestExecution.total_requests * 100) : 0;

  // 场景创建步骤内容
  const renderScenarioSteps = () => {
    const steps = [
      {
        title: 'Script Upload',
        content: (
          <div>
            <Row gutter={16} style={{ height: 'calc(100vh - 300px)' }}>
              {/* 脚本编辑器 / 空场景创建引导 */}
              <Col span={24}>
                <ScriptEditor
                  value={scriptContent}
                  onChange={setScriptContent}
                  fileName={currentScriptFileName}
                  height="calc(100vh - 300px)"
                />
              </Col>
            </Row>
          </div>
        )
      },
      {
        title: 'Load Test Configuration',
        content: (
          <div>
            <Title level={4} style={{ color: '#fff', marginBottom: '20px' }}>Configure Load Test Deployment</Title>
            
            {/* 压测机选择 */}
            <div style={{ marginBottom: '24px' }}>
              <Title level={5} style={{ color: '#fff', marginBottom: '16px' }}>Select Load Generator</Title>
              <Row gutter={16}>
                {loadGenerators.map(lg => (
                  <Col span={8} key={lg.id}>
                    <Card
                      hoverable
                      style={{ 
                        border: selectedLoadGenerator?.id === lg.id ? '2px solid #1890ff' : '1px solid #555',
                        cursor: 'pointer',
                        background: '#333',
                        borderRadius: '8px'
                      }}
                      bodyStyle={{
                        background: '#333',
                        color: '#fff',
                        padding: '16px'
                      }}
                      onClick={() => setSelectedLoadGenerator(lg)}
                    >
                      <div style={{ textAlign: 'center' }}>
                        <CloudServerOutlined style={{ fontSize: 24, color: '#1890ff', marginBottom: 8 }} />
                        <Title level={5} style={{ color: '#fff', margin: '0 0 8px 0' }}>{lg.name}</Title>
                        <Text style={{ color: '#ccc', display: 'block', marginBottom: '8px' }}>
                          {lg.host}:{lg.port}
                        </Text>
                        <div style={{ fontSize: '12px' }}>
                          <div style={{ color: lg.status === 'online' ? '#52c41a' : '#ff4d4f', marginBottom: '4px' }}>
                            Status: {lg.status}
                          </div>
                          <div style={{ color: '#8c8c8c' }}>
                            CPU: {lg.cpu_cores || 'N/A'} | Memory: {lg.memory_gb || 'N/A'}GB
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>

            {/* 部署方式选择 */}
            <div style={{ marginBottom: '24px' }}>
              <Title level={5} style={{ color: '#fff', marginBottom: '16px' }}>Select Deployment Mode</Title>
              <Row gutter={16}>
                <Col span={8}>
                  <Card
                    hoverable
                    style={{ 
                      border: selectedDeploymentConfig?.deployment_mode === 'standalone' ? '2px solid #1890ff' : '1px solid #555',
                      cursor: 'pointer',
                      background: '#333',
                      borderRadius: '8px'
                    }}
                    bodyStyle={{
                      background: '#333',
                      color: '#fff',
                      padding: '16px'
                    }}
                    onClick={() => setSelectedDeploymentConfig({ 
                      id: 1, 
                      deployment_mode: 'standalone',
                      name: 'Standalone Mode',
                      description: 'Single machine deployment'
                    })}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <SettingOutlined style={{ fontSize: 24, color: '#1890ff', marginBottom: 8 }} />
                      <Title level={5} style={{ color: '#fff', margin: '0 0 8px 0' }}>Standalone</Title>
                      <Text style={{ color: '#ccc', fontSize: '12px' }}>
                        Single machine deployment for small-scale testing
                      </Text>
                    </div>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card
                    hoverable
                    style={{ 
                      border: selectedDeploymentConfig?.deployment_mode === 'master-slave-1' ? '2px solid #1890ff' : '1px solid #555',
                      cursor: 'pointer',
                      background: '#333',
                      borderRadius: '8px'
                    }}
                    bodyStyle={{
                      background: '#333',
                      color: '#fff',
                      padding: '16px'
                    }}
                    onClick={() => setSelectedDeploymentConfig({ 
                      id: 2, 
                      deployment_mode: 'master-slave-1',
                      name: '1 Master + 1 Slave',
                      description: 'Distributed testing with 2 machines'
                    })}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <CloudServerOutlined style={{ fontSize: 24, color: '#1890ff', marginBottom: 8 }} />
                      <Title level={5} style={{ color: '#fff', margin: '0 0 8px 0' }}>1 Master + 1 Slave</Title>
                      <Text style={{ color: '#ccc', fontSize: '12px' }}>
                        Distributed testing with 2 machines
                      </Text>
                    </div>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card
                    hoverable
                    style={{ 
                      border: selectedDeploymentConfig?.deployment_mode === 'master-slave-2' ? '2px solid #1890ff' : '1px solid #555',
                      cursor: 'pointer',
                      background: '#333',
                      borderRadius: '8px'
                    }}
                    bodyStyle={{
                      background: '#333',
                      color: '#fff',
                      padding: '16px'
                    }}
                    onClick={() => setSelectedDeploymentConfig({ 
                      id: 3, 
                      deployment_mode: 'master-slave-2',
                      name: '1 Master + 2 Slaves',
                      description: 'High-performance distributed testing'
                    })}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <CloudServerOutlined style={{ fontSize: 24, color: '#1890ff', marginBottom: 8 }} />
                      <Title level={5} style={{ color: '#fff', margin: '0 0 8px 0' }}>1 Master + 2 Slaves</Title>
                      <Text style={{ color: '#ccc', fontSize: '12px' }}>
                        High-performance distributed testing
                      </Text>
                    </div>
                  </Card>
                </Col>
              </Row>
            </div>

            {/* 部署配置详情 */}
            {selectedLoadGenerator && selectedDeploymentConfig && (
              <div style={{ 
                background: '#333', 
                borderRadius: '8px', 
                padding: '20px',
                border: '1px solid #555'
              }}>
                <Title level={5} style={{ color: '#fff', marginBottom: '16px' }}>Deployment Configuration</Title>
                <Row gutter={16}>
                  <Col span={12}>
                    <div style={{ marginBottom: '12px' }}>
                      <Text style={{ color: '#8c8c8c', fontSize: '12px' }}>Load Generator:</Text>
                      <div style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>
                        {selectedLoadGenerator.name} ({selectedLoadGenerator.host}:{selectedLoadGenerator.port})
                      </div>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <Text style={{ color: '#8c8c8c', fontSize: '12px' }}>Deployment Mode:</Text>
                      <div style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>
                        {selectedDeploymentConfig.name}
                      </div>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ marginBottom: '12px' }}>
                      <Text style={{ color: '#8c8c8c', fontSize: '12px' }}>Status:</Text>
                      <div style={{ 
                        color: selectedLoadGenerator.status === 'online' ? '#52c41a' : '#ff4d4f', 
                        fontSize: '14px', 
                        fontWeight: 500 
                      }}>
                        {selectedLoadGenerator.status}
                      </div>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <Text style={{ color: '#8c8c8c', fontSize: '12px' }}>Description:</Text>
                      <div style={{ color: '#fff', fontSize: '14px' }}>
                        {selectedDeploymentConfig.description}
                      </div>
                    </div>
                  </Col>
                </Row>
              </div>
            )}
          </div>
        )
      },
      {
        title: 'Load Generator Configuration',
        content: (
          <div>
            <Title level={4} style={{ color: '#fff', marginBottom: '20px' }}>Select Load Generator & Configuration</Title>
            <Row gutter={16}>
              <Col span={12}>
                <Title level={5} style={{ color: '#fff', marginBottom: '12px' }}>Load Generators</Title>
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  {loadGenerators.map(lg => (
                    <Card
                      key={lg.id}
                      size="small"
                      hoverable
                      style={{ 
                        border: selectedLoadGenerator?.id === lg.id ? '2px solid #1890ff' : '1px solid #555',
                        cursor: 'pointer',
                        background: '#333',
                        borderRadius: '6px'
                      }}
                      bodyStyle={{
                        background: '#333',
                        color: '#fff',
                        padding: '12px'
                      }}
                      onClick={() => {
                        setSelectedLoadGenerator(lg);
                        loadLoadGeneratorConfigs(lg.id);
                      }}
                    >
                      <Space>
                        <CloudServerOutlined style={{ color: '#1890ff' }} />
                        <div>
                          <Text strong style={{ color: '#fff' }}>{lg.name}</Text><br/>
                          <Text style={{ color: '#ccc' }}>{lg.host}:{lg.port}</Text>
                        </div>
                      </Space>
                    </Card>
                  ))}
                </Space>
              </Col>
              <Col span={12}>
                <Title level={5} style={{ color: '#fff', marginBottom: '12px' }}>Configurations</Title>
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  {loadGeneratorConfigs.map(config => (
                    <Card
                      key={config.id}
                      size="small"
                      hoverable
                      style={{ 
                        border: selectedConfig?.id === config.id ? '2px solid #1890ff' : '1px solid #555',
                        cursor: 'pointer',
                        background: '#333',
                        borderRadius: '6px'
                      }}
                      bodyStyle={{
                        background: '#333',
                        color: '#fff',
                        padding: '12px'
                      }}
                      onClick={() => setSelectedConfig(config)}
                    >
                      <Space>
                        <InfoCircleOutlined style={{ color: '#1890ff' }} />
                        <div>
                          <Text strong style={{ color: '#fff' }}>{config.config_name}</Text><br/>
                          <Text style={{ color: '#ccc' }}>CPU: {config.system_cpu_cores} cores, Memory: {config.system_memory_gb}GB</Text>
                        </div>
                      </Space>
                    </Card>
                  ))}
                </Space>
              </Col>
            </Row>
          </div>
        )
      },
      {
        title: 'Execute',
        content: (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Title level={4} style={{ color: '#fff', marginBottom: '30px' }}>Ready to Execute</Title>
            <Space direction="vertical" size="large">
              <div style={{ 
                background: '#333', 
                padding: '20px', 
                borderRadius: '8px',
                border: '1px solid #555',
                textAlign: 'left',
                maxWidth: '400px',
                margin: '0 auto'
              }}>
                <Text style={{ color: '#fff', display: 'block', marginBottom: '8px' }}>
                  <strong>Strategy:</strong> {selectedStrategy?.name}
                </Text>
                <Text style={{ color: '#fff', display: 'block', marginBottom: '8px' }}>
                  <strong>Load Generator:</strong> {selectedLoadGenerator?.name}
                </Text>
                <Text style={{ color: '#fff', display: 'block', marginBottom: '8px' }}>
                  <strong>Deployment Mode:</strong> {selectedDeploymentConfig?.name}
                </Text>
                <Text style={{ color: '#fff', display: 'block' }}>
                  <strong>Configuration:</strong> {selectedConfig?.config_name}
                </Text>
              </div>
              <Button 
                type="primary" 
                size="large"
                icon={<PlayCircleOutlined />}
                onClick={handleExecuteScenario}
                style={{
                  height: '48px',
                  fontSize: '16px',
                  padding: '0 32px'
                }}
              >
                Execute Test
              </Button>
            </Space>
          </div>
        )
      }
    ];

    return steps[currentStep]?.content;
  };

  return (
    <div style={{ 
      padding: '20px', 
      background: '#07070D',
      height: 'calc(100vh - 48px)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Tabs 放置在卡片上方，底边贴合卡片上边框 */}
      <style>{`
        .task-detail-tabs .ant-tabs-nav { margin: 0 !important; }
        .task-detail-tabs .ant-tabs-nav::before { border-bottom: none !important; }
        .task-detail-tabs .ant-tabs-tab .ant-tabs-tab-btn { color: #CBD5E1 !important; }
        .task-detail-tabs .ant-tabs-tab-active .ant-tabs-tab-btn { color: #CBD5E1 !important; }
        .task-detail-tabs .ant-tabs-nav-list { gap: 0 !important; }
        .task-detail-tabs .ant-tabs-tab { 
          border: 2px solid #344156 !important; 
          background: transparent !important; 
          padding: 8px 16px !important; 
          margin: 0 !important;
          border-radius: 0 !important;
        }
        .task-detail-tabs .ant-tabs-tab + .ant-tabs-tab { border-left: none !important; }
        .task-detail-tabs .ant-tabs-tab:first-of-type { border-top-left-radius: 12px !important; border-bottom-left-radius: 0 !important; }
        /* 针对最后一个真实 Tab：Antd 会在末尾插入 ink-bar，因此这里用 nth-last-child(2) */
        .task-detail-tabs .ant-tabs-nav-list > .ant-tabs-tab:nth-last-child(2) { 
          border-top-right-radius: 12px !important; 
          border-bottom-right-radius: 0 !important; 
          overflow: hidden !important; /* 确保背景按圆角裁剪 */
        }
        .task-detail-tabs .ant-tabs-nav-list > .ant-tabs-tab:nth-last-child(2) .ant-tabs-tab-btn {
          border-top-right-radius: 12px !important;
        }
        .task-detail-tabs .ant-tabs-nav-list > .ant-tabs-tab:nth-last-child(2).ant-tabs-tab-active {
          border-top-right-radius: 12px !important; 
          border-bottom-right-radius: 0 !important; 
          overflow: hidden !important;
        }
        .task-detail-tabs .ant-tabs-nav-list > .ant-tabs-tab:nth-last-child(2).ant-tabs-tab-active .ant-tabs-tab-btn {
          border-top-right-radius: 12px !important;
        }
        .task-detail-tabs .ant-tabs-nav-list { overflow: visible !important; }
        /* 选中态背景色 */
        .task-detail-tabs .ant-tabs-tab-active { background: #6366F1 !important; }
        /* 等宽 Tab 设置 */
        .task-detail-tabs .ant-tabs-tab { width: 130px !important; justify-content: center !important; }
        .task-detail-tabs .ant-tabs-tab .ant-tabs-tab-btn { width: 100% !important; text-align: center !important; }
      `}</style>
      <div style={{ display: 'inline-flex', alignItems: 'flex-end', marginBottom: 0, marginLeft: '5px' }}>
        <Tabs
          className="task-detail-tabs"
          activeKey={activeTabKey}
          onChange={(key) => setActiveTabKey(key)}
          items={[
            { key: 'scenario', label: 'Scenario Config', children: <div style={{ display: 'none' }} /> },
            { key: 'deploy', label: 'Deploy & Debug', children: <div style={{ display: 'none' }} /> },
            { key: 'load', label: 'Load Profile', children: <div style={{ display: 'none' }} /> },
            { key: 'results', label: 'Results', children: <div style={{ display: 'none' }} /> },
          ]}
        />
      </div>
      {/* 页面头部和基本信息（扩展至底部） */}
      <div style={{ 
        padding: '20px',
        background: '#07070D',
        borderRadius: '8px',
        border: '1px solid #344156',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '20px', 
          marginBottom: '20px',
          flexWrap: 'wrap'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px',
            flex: 1,
            minWidth: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ 
                color: '#8c8c8c', 
                fontSize: '12px', 
                fontWeight: 500
              }}>
                Task:
              </span>
              <Title level={4} style={{ margin: 0, color: '#fff', fontWeight: 600, fontSize: '18px' }}>
                {testTask.name}
              </Title>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ 
                color: '#8c8c8c', 
                fontSize: '12px', 
                fontWeight: 500
              }}>
                Created:
              </span>
              <Text style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>
                {new Date(testTask.created_at).toLocaleString()}
              </Text>
            </div>
            
            {testTask.description && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                flex: 1,
                minWidth: 0
              }}>
                <span style={{ 
                  color: '#8c8c8c', 
                  fontSize: '12px', 
                  fontWeight: 500,
                  flexShrink: 0
                }}>
                  Desc:
                </span>
                <Text style={{ 
                  color: '#fff', 
                  fontSize: '14px', 
                  lineHeight: '1.4',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {testTask.description}
                </Text>
              </div>
            )}
          </div>
        </div>

        {/* 卡片主体内容区域（Scenario Config 等） */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {activeTabKey === 'scenario' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <Button 
                  icon={<FolderOpenOutlined />}
                  style={{ background: '#1A192E', border: '1px solid #344156', color: '#CBD5E1' }}
                  onClick={async () => {
                    setScenarioPickerVisible(true);
                    setScenarioPickerLoading(true);
                    try {
                      const list = await scenarioService.getScenarios();
                      setScenarioPickerData(list);
                    } catch (e) {
                      message.error('Failed to load scenarios');
                    } finally {
                      setScenarioPickerLoading(false);
                    }
                  }}
                >
                  Load Scenarios
                </Button>
              </div>
              <Card style={{ background: '#07070D', border: '1px solid #344156' }}>
                <Table
                  size="middle"
                  rowKey="id"
                  dataSource={scenarioRows}
                  pagination={false}
                  columns={[
                    {
                      title: <span style={{ color: '#CBD5E1' }}>Scenario ID</span>,
                      dataIndex: 'scenarioId',
                      key: 'scenarioId',
                      width: 120,
                      render: (text: number) => <span style={{ color: '#CBD5E1' }}>{text}</span>
                    },
                    {
                      title: <span style={{ color: '#CBD5E1' }}>Scenario Name</span>,
                      dataIndex: 'name',
                      key: 'name',
                      render: (text: string) => <span style={{ color: '#FFFFFF' }}>{text}</span>
                    },
                    {
                      title: <span style={{ color: '#CBD5E1' }}>Enable/Disable</span>,
                      key: 'enabled',
                      width: 160,
                      render: (_: any, record: any, index: number) => (
                        <Switch
                          checked={record.enabled}
                          onChange={async (checked) => {
                            if (!id || !record.referenceId) return;
                            try {
                              await testTaskService.updateTaskScenarioReference(parseInt(id), record.referenceId, { is_enabled: checked });
                              setScenarioRows(prev => prev.map((r, i) => i === index ? { ...r, enabled: checked } : r));
                            } catch (error) {
                              console.error('Failed to update scenario reference:', error);
                              message.error('Failed to update scenario');
                            }
                          }}
                        />
                      )
                    },
                    {
                      title: <span style={{ color: '#CBD5E1' }}>Actions</span>,
                      key: 'action',
                      width: 160,
                      render: (_: any, record: any) => (
                        <Space>
                          <Button 
                            type="text"
                            shape="circle" 
                            icon={<EyeOutlined />}
                            onClick={async () => {
                              try {
                                // 获取场景详情以确定类型
                                const scenario = await scenarioService.getScenario(record.scenarioId);
                                // 根据场景类型跳转到对应的编辑页面
                                if (scenario.scenario_type === 'locust') {
                                  navigate('/scenarios/locust/create', {
                                    state: {
                                      scenarioData: {
                                        name: scenario.name,
                                        description: scenario.description,
                                        scenario_type: scenario.scenario_type
                                      },
                                      scenarioId: scenario.id,
                                      isEdit: true
                                    }
                                  });
                                } else if (scenario.scenario_type === 'jmeter') {
                                  message.info('JMeter scenario detail page coming soon!');
                                } else if (scenario.scenario_type === 'gatling') {
                                  message.info('Gatling scenario detail page coming soon!');
                                } else {
                                  message.warning('Unknown scenario type');
                                }
                              } catch (error) {
                                console.error('Failed to load scenario details:', error);
                                message.error('Failed to load scenario details');
                              }
                            }}
                            style={{ color: '#8B5CF6' }}
                          />
                          <Button 
                            danger 
                            shape="circle" 
                            icon={<DeleteOutlined />}
                            onClick={async () => {
                              if (!id || !record.referenceId) return;
                              try {
                                await testTaskService.deleteTaskScenarioReference(parseInt(id), record.referenceId);
                                message.success('Scenario removed');
                                await loadTaskScenarioReferences();
                              } catch (error) {
                                console.error('Failed to delete scenario reference:', error);
                                message.error('Failed to remove scenario');
                              }
                            }}
                          />
                        </Space>
                      )
                    }
                  ]}
                />
              </Card>
            </div>
          )}

          {activeTabKey === 'deploy' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
              <style>{`
                .load-generator-card-selected {
                  background: #344156 !important;
                }
                .load-generator-card-selected .ant-card-body {
                  background: #344156 !important;
                }
                .ant-progress-text {
                  color: #CBD5E1 !important;
                }
                .ant-progress .ant-progress-text {
                  color: #CBD5E1 !important;
                }
                .ant-progress-status-active .ant-progress-text {
                  color: #CBD5E1 !important;
                }
                .ant-progress-show-info .ant-progress-text {
                  color: #CBD5E1 !important;
                }
                .deployment-progress .ant-progress-text {
                  color: #FFFFFF !important;
                  font-weight: bold !important;
                  font-size: 14px !important;
                }
                .deployment-progress .ant-progress-text * {
                  color: #FFFFFF !important;
                }
                .ant-steps-item-title {
                  color: #CBD5E1 !important;
                }
                .ant-steps-item-description {
                  color: #CBD5E1 !important;
                }
                .ant-steps-item-finish .ant-steps-item-title {
                  color: #CBD5E1 !important;
                }
                .ant-steps-item-finish .ant-steps-item-description {
                  color: #CBD5E1 !important;
                }
                .ant-steps-item-process .ant-steps-item-title {
                  color: #FFFFFF !important;
                  font-weight: 600 !important;
                }
                .ant-steps-item-process .ant-steps-item-description {
                  color: #CBD5E1 !important;
                }
                .ant-steps-item-wait .ant-steps-item-title {
                  color: #8c8c8c !important;
                }
                .ant-steps-item-wait .ant-steps-item-description {
                  color: #8c8c8c !important;
                }
              `}</style>
              <Steps
                current={deployStep}
                items={[
                  { title: 'Select LoadGen', description: 'Select Load Generator' },
                  { title: 'Deploy', description: '部署脚本' },
                  { title: 'Debug', description: '远程调试' },
                ]}
                style={{ marginBottom: 24 }}
              />
              
              {deployStep === 0 && (
                <Card style={{ background: '#07070D', border: '1px solid #344156', flex: 1 }}>
                  <Title level={5} style={{ color: '#CBD5E1', marginBottom: 16 }}>Select Load Generator</Title>
                  <Row gutter={16}>
                    {loadGenerators.map(lg => (
                      <Col span={4} key={lg.id}>
                        <Card
                          hoverable
                          className={selectedDeployLoadGenerator?.id === lg.id ? 'load-generator-card-selected' : ''}
                          style={{ 
                            border: selectedDeployLoadGenerator?.id === lg.id ? '2px solid #6366F1' : '1px solid #344156',
                            cursor: 'pointer',
                            background: selectedDeployLoadGenerator?.id === lg.id ? '#344156' : '#07070D',
                          }}
                          bodyStyle={{ 
                            padding: '16px',
                            background: selectedDeployLoadGenerator?.id === lg.id ? '#344156' : '#07070D',
                          }}
                          onClick={() => {
                            // 如果已选中，则取消选中；否则选中
                            if (selectedDeployLoadGenerator?.id === lg.id) {
                              setSelectedDeployLoadGenerator(null);
                            } else {
                              setSelectedDeployLoadGenerator(lg);
                            }
                          }}
                        >
                          <div style={{ textAlign: 'center' }}>
                            <CloudServerOutlined style={{ fontSize: 24, color: lg.status === 'online' ? '#52c41a' : '#ff4d4f', marginBottom: 8 }} />
                            <Title level={5} style={{ color: '#fff', margin: '0 0 8px 0' }}>{lg.name}</Title>
                            <Text style={{ color: '#CBD5E1', display: 'block', marginBottom: '8px' }}>
                              {lg.host}:{lg.port}
                            </Text>
                            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                              <div style={{ color: lg.status === 'online' ? '#52c41a' : '#ff4d4f', marginBottom: '4px' }}>
                                Status: {lg.status}
                              </div>
                              <div>
                                CPU: {lg.cpu_cores || 'N/A'} | Memory: {lg.memory_gb || 'N/A'}GB
                              </div>
                            </div>
                          </div>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                  <div style={{ marginTop: 24, textAlign: 'right' }}>
                    <Button 
                      type="primary"
                      disabled={!selectedDeployLoadGenerator}
                      onClick={() => {
                        if (selectedDeployLoadGenerator) {
                          setDeployStep(1);
                        }
                      }}
                    >
                      Next: Deploy Scripts
                    </Button>
                  </div>
                </Card>
              )}

              {deployStep === 1 && (
                <Card style={{ background: '#07070D', border: '1px solid #344156', flex: 1 }}>
                  <Title level={5} style={{ color: '#CBD5E1', marginBottom: 16 }}>Deploy Scripts</Title>
                  
                  {/* 部署信息 */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ marginBottom: 12 }}>
                      <Text style={{ color: '#CBD5E1' }}>Selected Load Generator: </Text>
                      <Text strong style={{ color: '#fff' }}>{selectedDeployLoadGenerator?.name}</Text>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <Text style={{ color: '#CBD5E1' }}>Scenarios to deploy: </Text>
                      <Text style={{ color: '#fff' }}>{scenarioRows.filter(r => r.enabled).length} enabled</Text>
                    </div>
                  </div>

                  {/* 部署步骤列表 - 始终显示 */}
                  <div style={{ marginBottom: 24, background: '#1A192E', padding: '16px', borderRadius: '4px' }}>
                    <Text style={{ color: '#CBD5E1', fontSize: '14px', fontWeight: 'bold', marginBottom: '16px', display: 'block' }}>
                      Deployment Steps:
                    </Text>
                    {deploymentSteps.map((step, index) => (
                      <div 
                        key={step.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '12px 0',
                          borderBottom: index < deploymentSteps.length - 1 ? '1px solid #344156' : 'none'
                        }}
                      >
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: '12px',
                          flexShrink: 0,
                          background: step.status === 'success' ? '#52c41a' : 
                                     step.status === 'processing' ? '#1890ff' : 
                                     step.status === 'error' ? '#ff4d4f' : '#344156',
                          border: step.status === 'waiting' ? '2px solid #555' : 'none'
                        }}>
                          {step.status === 'success' && (
                            <CheckCircleOutlined style={{ color: '#fff', fontSize: '16px' }} />
                          )}
                          {step.status === 'processing' && (
                            <LoadingOutlined style={{ color: '#fff', fontSize: '16px' }} />
                          )}
                          {step.status === 'error' && (
                            <CloseCircleOutlined style={{ color: '#fff', fontSize: '16px' }} />
                          )}
                          {step.status === 'waiting' && (
                            <span style={{ color: '#8c8c8c', fontSize: '12px', fontWeight: 'bold' }}>{index + 1}</span>
                          )}
                        </div>
                        <Text style={{ 
                          color: step.status === 'success' ? '#52c41a' : 
                                 step.status === 'processing' ? '#1890ff' : 
                                 step.status === 'error' ? '#ff4d4f' : '#CBD5E1',
                          fontSize: '14px'
                        }}>
                          {step.name}
                        </Text>
                      </div>
                    ))}
                  </div>

                  {/* 部署日志 - 仅在部署过程中显示 */}
                  {deploymentLoading && deploymentResult?.logs && deploymentResult.logs.length > 0 && (
                    <div style={{ marginBottom: 24, textAlign: 'left', background: '#1A192E', padding: '12px', borderRadius: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                      <Text style={{ color: '#CBD5E1', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
                        Deployment Logs:
                      </Text>
                      {deploymentResult.logs.map((log: string, idx: number) => (
                        <div key={idx} style={{ color: '#CBD5E1', fontSize: '12px', marginBottom: '4px' }}>{log}</div>
                      ))}
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
                    <Button 
                      onClick={() => setDeployStep(0)}
                      disabled={deploymentLoading}
                    >
                      Back
                    </Button>
                    <Button 
                      type="primary"
                      disabled={!selectedDeployLoadGenerator || scenarioRows.filter(r => r.enabled).length === 0 || deploymentLoading}
                      loading={deploymentLoading}
                      onClick={async () => {
                        if (!id || !selectedDeployLoadGenerator) return;
                        
                        // 重置步骤状态为等待
                        setDeploymentSteps([
                          { id: 'venv', name: 'Preparing virtual environment', status: 'waiting' },
                          { id: 'directory', name: 'Creating target directory', status: 'waiting' },
                          { id: 'cleanup', name: 'Cleaning old files', status: 'waiting' },
                          { id: 'upload', name: 'Uploading script files', status: 'waiting' },
                          { id: 'validate', name: 'Validating script syntax', status: 'waiting' },
                        ]);
                        
                        setDeploymentLoading(true);
                        setDeploymentResult({ progress: 0, logs: [] });
                        
                        try {
                          const scenarioIds = scenarioRows.filter(r => r.enabled).map(r => r.scenarioId);
                          
                          // 更新步骤状态的函数
                          const updateStep = (stepId: string, status: 'waiting' | 'processing' | 'success' | 'error') => {
                            setDeploymentSteps(prev => prev.map(step => 
                              step.id === stepId ? { ...step, status } : step
                            ));
                          };
                          
                          // 步骤1: 准备虚拟环境
                          updateStep('venv', 'processing');
                          await new Promise(resolve => setTimeout(resolve, 500));
                          
                          const result = await deploymentService.deployScripts(parseInt(id), {
                            load_generator_id: selectedDeployLoadGenerator.id,
                            scenario_ids: scenarioIds,
                            deployment_mode: 'overwrite'
                          });
                          
                          // 根据返回结果更新步骤状态
                          if (result.venv_status?.status === 'ok' || result.venv_status?.status === 'created') {
                            updateStep('venv', 'success');
                          } else {
                            updateStep('venv', 'error');
                          }
                          
                          // 步骤2: 创建目标目录
                          updateStep('directory', 'processing');
                          const logs = result.logs || [];
                          if (logs.some((log: string) => log.includes('Created directory'))) {
                            await new Promise(resolve => setTimeout(resolve, 300));
                            updateStep('directory', 'success');
                          } else {
                            updateStep('directory', 'error');
                          }
                          
                          // 步骤3: 清理旧文件
                          updateStep('cleanup', 'processing');
                          if (logs.some((log: string) => log.includes('Cleared existing scripts') || log.includes('overwrite mode'))) {
                            await new Promise(resolve => setTimeout(resolve, 300));
                            updateStep('cleanup', 'success');
                          } else {
                            // 如果没有清理日志，可能是增量模式，也标记为成功
                            await new Promise(resolve => setTimeout(resolve, 200));
                            updateStep('cleanup', 'success');
                          }
                          
                          // 步骤4: 上传文件
                          updateStep('upload', 'processing');
                          const uploadedFiles = logs.filter((log: string) => log.includes('Uploaded'));
                          if (uploadedFiles.length > 0) {
                            await new Promise(resolve => setTimeout(resolve, 500));
                            updateStep('upload', 'success');
                          } else {
                            updateStep('upload', 'error');
                          }
                          
                          // 步骤5: 验证脚本
                          updateStep('validate', 'processing');
                          if (result.validation) {
                            await new Promise(resolve => setTimeout(resolve, 300));
                            if (result.validation.valid) {
                              updateStep('validate', 'success');
                            } else if (result.validation.error_count > 0) {
                              updateStep('validate', 'error');
                            } else {
                              updateStep('validate', 'success');
                            }
                          } else {
                            // 如果没有验证结果，检查日志中是否有验证信息
                            const validationLogs = logs.filter((log: string) => 
                              log.includes('valid') || log.includes('Validating') || log.includes('OK:')
                            );
                            if (validationLogs.length > 0) {
                              await new Promise(resolve => setTimeout(resolve, 300));
                              updateStep('validate', 'success');
                            } else {
                              updateStep('validate', 'error');
                            }
                          }
                          
                          setDeploymentResult(result);
                          
                          // 检查是否有错误
                          const hasError = deploymentSteps.some(step => step.status === 'error');
                          if (!hasError) {
                            message.success('Scripts deployed successfully');
                            // 部署完成后停留在当前页面，不自动跳转
                            // 用户可以手动点击步骤2进入远程调试页面
                          } else {
                            message.warning('Deployment completed with some errors');
                          }
                        } catch (error: any) {
                          // 标记当前进行中的步骤为错误
                          setDeploymentSteps(prev => prev.map(step => 
                            step.status === 'processing' ? { ...step, status: 'error' } : step
                          ));
                          message.error(`Deployment failed: ${error.message || 'Unknown error'}`);
                          console.error('Deployment error:', error);
                        } finally {
                          setDeploymentLoading(false);
                        }
                      }}
                    >
                      {deploymentLoading ? 'Deploying...' : 'Deploy Scripts'}
                    </Button>
                  </div>
                </Card>
              )}

              {deployStep === 2 && (
                <Card style={{ background: '#07070D', border: '1px solid #344156', flex: 1 }}>
                  <Title level={5} style={{ color: '#CBD5E1', marginBottom: 16 }}>远程调试</Title>
                  <Form layout="vertical" style={{ marginBottom: 16 }}>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item label={<span style={{ color: '#CBD5E1' }}>Users</span>}>
                          <Input 
                            type="number" 
                            value={debugConfig.users} 
                            onChange={(e) => setDebugConfig({...debugConfig, users: parseInt(e.target.value) || 1})}
                            style={{ background: '#1A192E', border: '1px solid #344156', color: '#CBD5E1' }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item label={<span style={{ color: '#CBD5E1' }}>Duration (seconds)</span>}>
                          <Input 
                            type="number" 
                            value={debugConfig.duration} 
                            onChange={(e) => setDebugConfig({...debugConfig, duration: parseInt(e.target.value) || 30})}
                            style={{ background: '#1A192E', border: '1px solid #344156', color: '#CBD5E1' }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item label={<span style={{ color: '#CBD5E1' }}>Host</span>}>
                          <Input 
                            value={debugConfig.host || testTask?.target_host || ''} 
                            onChange={(e) => setDebugConfig({...debugConfig, host: e.target.value})}
                            placeholder="https://api.example.com"
                            style={{ background: '#1A192E', border: '1px solid #344156', color: '#CBD5E1' }}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Form>
                  
                  <div style={{ marginBottom: 16 }}>
                    <Space>
                      <Button 
                        type="primary"
                        icon={<PlayCircleOutlined />}
                        disabled={debugStatus === 'running' || !deploymentResult}
                        onClick={async () => {
                          if (!id || !selectedDeployLoadGenerator || !deploymentResult) return;
                          
                          // 立即清空日志和关闭之前的WebSocket连接
                          setDebugLogs([]);
                          if (debugWs) {
                            debugWs.close();
                            setDebugWs(null);
                          }
                          
                          try {
                            const result = await debugService.startDebug(parseInt(id), {
                              load_generator_id: selectedDeployLoadGenerator.id,
                              deployment_id: deploymentResult.deployment_id,
                              deployment_info: deploymentResult,
                              debug_config: {
                                users: debugConfig.users,
                                duration: debugConfig.duration,
                                host: debugConfig.host || testTask?.target_host || 'http://localhost',
                                spawn_rate: debugConfig.spawn_rate
                              }
                            });
                            setDebugId(result.debug_id);
                            setDebugStatus('running');
                            
                            // 建立WebSocket连接
                            // 使用相对路径，通过代理转发
                            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                            const wsHost = window.location.host;
                            const wsUrl = `${wsProtocol}//${wsHost}/api/v1/ws/debug/${result.debug_id}/logs`;
                            const ws = new WebSocket(wsUrl);
                            
                            ws.onmessage = (event) => {
                              const logEntry = JSON.parse(event.data);
                              setDebugLogs(prev => [...prev, logEntry]);
                            };
                            
                            ws.onerror = (error) => {
                              console.error('WebSocket error:', error);
                            };
                            
                            ws.onclose = () => {
                              setDebugStatus('stopped');
                            };
                            
                            setDebugWs(ws);
                            message.success('Debug started');
                          } catch (error: any) {
                            message.error(`Failed to start debug: ${error.message || 'Unknown error'}`);
                            console.error('Debug start error:', error);
                          }
                        }}
                      >
                        Start Debug
                      </Button>
                      <Button 
                        danger
                        icon={<PauseCircleOutlined />}
                        disabled={debugStatus !== 'running'}
                        onClick={async () => {
                          if (!debugId) return;
                          try {
                            await debugService.stopDebug(debugId);
                            debugWs?.close();
                            setDebugWs(null);
                            setDebugStatus('stopped');
                            message.success('Debug stopped');
                          } catch (error: any) {
                            message.error(`Failed to stop debug: ${error.message || 'Unknown error'}`);
                          }
                        }}
                      >
                        Stop Debug
                      </Button>
                    </Space>
                  </div>
                  
                  <div style={{ 
                    background: '#1A192E', 
                    padding: '16px', 
                    borderRadius: '4px',
                    height: '400px',
                    overflowY: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '12px'
                  }}>
                    {debugLogs.length === 0 ? (
                      <Text style={{ color: '#8c8c8c' }}>Debug logs will appear here...</Text>
                    ) : (
                      debugLogs.map((log, idx) => (
                        <div 
                          key={idx} 
                          style={{ 
                            color: log.level === 'ERROR' ? '#ff4d4f' : log.level === 'WARNING' ? '#faad14' : '#CBD5E1',
                            marginBottom: '4px'
                          }}
                        >
                          <span style={{ color: '#8c8c8c' }}>[{log.timestamp}]</span> {log.message}
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
                    <Button onClick={() => setDeployStep(1)}>Back</Button>
                    <Button 
                      type="primary"
                      disabled={debugStatus === 'running'}
                      onClick={() => {
                        message.info('Please complete debug before proceeding to load profile configuration');
                      }}
                    >
                      Debug Complete, Next Step
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          )}

          {activeTabKey === 'load' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
              <LoadProfile />
            </div>
          )}

          {activeTabKey === 'results' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
              <Card style={{ background: '#07070D', border: '1px solid #344156' }}>
                <Title level={4} style={{ color: '#fff', marginBottom: 16 }}>
                  Test Results
                </Title>
                <Text style={{ color: '#8c8c8c' }}>
                  Results will be displayed here after test execution.
                </Text>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* 脚本编辑器模态框 */}
      <Modal
        title="Script Editor"
        open={editorModalVisible}
        onCancel={() => setEditorModalVisible(false)}
        footer={null}
        width={1000}
        style={{ top: 300 }}
      >
        <div style={{ marginBottom: 16 }}>
          <Text>Edit your Locust script below:</Text>
        </div>
        <Input.TextArea
          value={editorContent}
          onChange={(e) => handleContentUpdate(e.target.value)}
          placeholder="Enter your Locust script here..."
          rows={20}
          style={{ fontFamily: 'monospace' }}
        />
        <div style={{ textAlign: 'right', marginTop: 16 }}>
          <Space>
            <Button onClick={() => setEditorModalVisible(false)}>
              Cancel
            </Button>
            <Button type="primary" onClick={handleEditorSave}>
              Save Script
            </Button>
          </Space>
        </div>
      </Modal>

      {/* 场景列表弹窗 */}
      <Modal
        title={null}
        open={scenarioPickerVisible}
        onCancel={() => setScenarioPickerVisible(false)}
        footer={null}
        width={950}
        centered={false}
        bodyStyle={{ background: '#07070D', padding: 0, maxHeight: '44vh', overflowY: 'auto' }}
        wrapClassName="scenario-picker-modal-wrap"
      >
        <style>{`
          /* 强制设置弹窗位置 */
          .scenario-picker-modal-wrap .ant-modal {
            top: 15% !important;
            left: 36% !important;
            transform: translateX(-50%) !important;
          }
          /* 统一分页所在行背景以及其父容器背景为 #1A192E；去掉外层边框 */
          .scenario-picker-wrap { background: #1A192E !important; border: none !important; border-radius: 0 !important; }
          .scenario-picker-wrap .ant-table-wrapper { background: #1A192E !important; }
          .scenario-picker-wrap .ant-spin-nested-loading { background: #1A192E !important; }
          .scenario-picker-wrap .ant-spin-container { background: #1A192E !important; }
          .scenario-picker-wrap .ant-table { background: transparent !important; }
          .scenario-picker-wrap .ant-table-pagination { 
            background: #1A192E !important; 
            margin: 0 !important; 
            padding: 12px 16px !important; 
            border-top: 1px solid #344156 !important;
          }
          .scenario-picker-wrap .ant-pagination { background: transparent !important; }
        `}</style>
        <div className="scenario-picker-wrap" style={{ padding: '16px' }}>
          <Table
            loading={scenarioPickerLoading}
            rowKey="id"
            dataSource={scenarioPickerData.slice((scenarioPickerPage.current - 1) * scenarioPickerPage.pageSize, scenarioPickerPage.current * scenarioPickerPage.pageSize)}
            pagination={false}
            rowSelection={{
              selectedRowKeys: scenarioPickerSelectedRowKeys,
              onChange: setScenarioPickerSelectedRowKeys,
            }}
            columns={[
              { title: 'ID', dataIndex: 'id', width: 120 },
              { title: 'Name', dataIndex: 'name' },
              { title: 'Type', dataIndex: 'scenario_type', width: 140, render: (t: string) => t || '-' },
              { title: 'Status', dataIndex: 'is_active', width: 140, render: (v: boolean) => (v ? 'Active' : 'Inactive') },
              { title: 'Updated', dataIndex: 'updated_at', width: 220, render: (t: string) => new Date(t).toLocaleString() },
            ]}
          />
          {/* 合并区域：分页 + 操作按钮 */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 8,
            background: '#1A192E', 
            padding: '12px 16px'
          }}>
            <Pagination
              size="small"
              current={scenarioPickerPage.current}
              pageSize={scenarioPickerPage.pageSize}
              total={scenarioPickerData.length}
              showSizeChanger
              pageSizeOptions={['5','10','20']}
              onChange={(page, pageSize) => setScenarioPickerPage({ current: page, pageSize })}
              style={{ background: 'transparent', fontSize: 12, marginRight: 200 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, width: '100%' }}>
              <Button onClick={() => setScenarioPickerVisible(false)} style={{ background: '#1A192E', border: '1px solid #344156', color: '#CBD5E1' }}>Cancel</Button>
              <Button type="primary" onClick={handleScenarioConfirm} style={{ background: '#6366F1', borderColor: '#6366F1' }}>Confirm</Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* 创建执行模态框 */}
      <Modal
        title="Create Test Execution"
        open={executionModalVisible}
        onCancel={() => setExecutionModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          layout="vertical"
          onFinish={handleCreateExecution}
        >
          <Form.Item
            name="strategy_id"
            label="Test Strategy"
            rules={[{ required: true, message: 'Please select test strategy' }]}
          >
            <Select placeholder="Select test strategy">
              {strategies.map(strategy => (
                <Select.Option key={strategy.id} value={strategy.id}>
                  {strategy.name} ({strategy.strategy_type})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="load_generator_id"
            label="Load Generator"
            rules={[{ required: true, message: 'Please select load generator' }]}
          >
            <Select 
              placeholder="Select load generator"
              onChange={(value) => loadLoadGeneratorConfigs(value)}
            >
              {loadGenerators.map(lg => (
                <Select.Option key={lg.id} value={lg.id}>
                  {lg.name} ({lg.host})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="load_generator_config_id"
            label="Load Generator Config"
            rules={[{ required: true, message: 'Please select load generator config' }]}
          >
            <Select placeholder="Select load generator config">
              {loadGeneratorConfigs.map(config => (
                <Select.Option key={config.id} value={config.id}>
                  {config.config_name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="execution_name"
            label="Execution Name"
          >
            <Input placeholder="Enter execution name (optional)" />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Create Execution
              </Button>
              <Button onClick={() => setExecutionModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

// 使用 React.memo 优化组件性能，避免不必要的重渲染
export default React.memo(TestTaskDetail);
