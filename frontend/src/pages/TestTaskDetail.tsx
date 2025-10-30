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
  Popconfirm
} from 'antd';
import { 
  ArrowLeftOutlined,
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
  SaveOutlined
} from '@ant-design/icons';
import { 
  testTaskService, 
  testStrategyService, 
  testExecutionService,
  loadGeneratorService 
} from '../services/api';
import type { 
  TestTask, 
  TestExecution, 
  TestStrategy,
  TestExecutionCreate
} from '../types/testTask';
import type { LoadGenerator, LoadGeneratorConfig, DeploymentConfig } from '../types/loadGenerator';
import ScriptEditor from '../components/ScriptEditor';

const { Title, Text } = Typography;
const { Step } = Steps;
const { Panel } = Collapse;

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
  
  // 脚本编辑器相关状态
  const [scriptContent, setScriptContent] = useState('');
  const [currentScriptFileName, setCurrentScriptFileName] = useState('locustfile.py');

  useEffect(() => {
    if (id) {
      fetchTestTask();
      fetchExecutions();
      fetchStrategies();
      fetchLoadGenerators();
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
      background: 'linear-gradient(135deg, #0f1419 0%, #1a1f2e 100%)',
      minHeight: '100vh'
    }}>
      {/* 页面头部和基本信息 */}
      <div style={{ 
        marginBottom: '20px',
        padding: '20px',
        background: 'rgba(255, 255, 255, 0.02)',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '20px', 
          marginBottom: '20px',
          flexWrap: 'wrap'
        }}>
          <Button 
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/test-management')}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#fff',
              height: '36px',
              borderRadius: '6px',
              flexShrink: 0
            }}
          >
            Back
          </Button>
          
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
      </div>

      {/* 脚本编辑器模态框 */}
      <Modal
        title="Script Editor"
        open={editorModalVisible}
        onCancel={() => setEditorModalVisible(false)}
        footer={null}
        width={1000}
        style={{ top: 20 }}
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
