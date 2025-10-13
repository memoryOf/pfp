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
  testScenarioService,
  loadGeneratorService 
} from '../services/api';
import type { 
  TestTask, 
  TestTaskWithScenarios, 
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
  const [testTask, setTestTask] = useState<TestTaskWithScenarios | null>(null);
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
  const [expandedScenarios, setExpandedScenarios] = useState<Set<string>>(new Set());
  const [editorContent, setEditorContent] = useState('');
  const [isCreatingScenario, setIsCreatingScenario] = useState(false);
  const [currentScenario, setCurrentScenario] = useState<any>(null);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);
  const [editingScenarioName, setEditingScenarioName] = useState('');
  
  // 脚本编辑器相关状态
  const [scriptContent, setScriptContent] = useState('');
  const [currentScriptFileName, setCurrentScriptFileName] = useState('locustfile.py');
  const [scenarioFiles, setScenarioFiles] = useState<{[key: number]: any[]}>({});
  const [forceEditorForEmptyScenario, setForceEditorForEmptyScenario] = useState(false);

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

  // 当场景文件加载完成后，自动加载当前场景的脚本
  useEffect(() => {
    console.log('=== useEffect triggered ===');
    console.log('currentScenario:', currentScenario);
    console.log('scenarioFiles:', scenarioFiles);
    console.log('currentScenario?.id:', currentScenario?.id);
    console.log('scenarioFiles[currentScenario?.id]:', currentScenario ? scenarioFiles[currentScenario.id] : 'N/A');
    
    if (currentScenario && scenarioFiles[currentScenario.id] && scenarioFiles[currentScenario.id].length > 0) {
      // 一旦有文件，确保退出空场景的强制编辑模式
      if (forceEditorForEmptyScenario) setForceEditorForEmptyScenario(false);
      const files = scenarioFiles[currentScenario.id];
      console.log('Found files for scenario:', files);
      
      const scriptFile = files.find(file => 
        file.file_name.endsWith('.py') || file.is_script
      );
      
      if (scriptFile) {
        console.log('Loading Python script:', scriptFile);
        handleLoadScript(scriptFile);
      } else if (files[0]) {
        console.log('Loading first file:', files[0]);
        handleLoadScript(files[0]);
      }
    } else if (currentScenario && scenarioFiles[currentScenario.id] && scenarioFiles[currentScenario.id].length === 0) {
      // 如果场景存在但没有文件，清空编辑器
      console.log('Scenario exists but no files, clearing editor');
      setScriptContent('');
      setCurrentScriptFileName('locustfile.py');
    } else if (!currentScenario) {
      // 如果没有当前场景，清空编辑器
      console.log('No current scenario, clearing editor');
      if (forceEditorForEmptyScenario) setForceEditorForEmptyScenario(false);
      setScriptContent('');
      setCurrentScriptFileName('locustfile.py');
    } else {
      console.log('Other condition - currentScenario exists but no files data');
    }
  }, [currentScenario, scenarioFiles, handleLoadScript, forceEditorForEmptyScenario]);

  // 创建默认脚本模板并打开编辑器
  const handleCreateDefaultScript = () => {
    const defaultTemplate = `from locust import HttpUser, task, between

class QuickstartUser(HttpUser):
    wait_time = between(1, 3)

    @task
    def hello_world(self):
        self.client.get("/")
        self.client.get("/world")
`;
    setScriptContent(defaultTemplate);
    setCurrentScriptFileName('locustfile.py');
    setForceEditorForEmptyScenario(true);
  };

  const fetchTestTask = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await testTaskService.getTestTask(parseInt(id));
      console.log('=== fetchTestTask ===');
      console.log('Task data:', data);
      setTestTask(data);
      
      // 获取每个scenario的文件
      if (data.scenarios && data.scenarios.length > 0) {
        const filesMap: {[key: number]: any[]} = {};
        for (const scenario of data.scenarios) {
          try {
            const files = await testScenarioService.getScenarioFiles(scenario.id);
            console.log(`Files for scenario ${scenario.id}:`, files);
            filesMap[scenario.id] = files;
          } catch (error) {
            console.error(`Failed to fetch files for scenario ${scenario.id}:`, error);
            filesMap[scenario.id] = [];
          }
        }
        console.log('Final filesMap:', filesMap);
        setScenarioFiles(filesMap);
        
        // 如果没有当前选中的场景，自动选择第一个场景
        if (!currentScenario) {
          const firstScenario = data.scenarios[0];
          console.log('Auto-selecting first scenario:', firstScenario);
          setCurrentScenario(firstScenario);
          
          // 如果第一个场景有文件，立即加载第一个脚本并自动展开
          if (filesMap[firstScenario.id] && filesMap[firstScenario.id].length > 0) {
            const files = filesMap[firstScenario.id];
            const scriptFile = files.find(file => 
              file.file_name.endsWith('.py') || file.is_script
            );
            
            if (scriptFile) {
              console.log('Auto-loading Python script:', scriptFile);
              // 直接设置脚本内容，因为文件内容已经在API响应中
              setScriptContent(scriptFile.file_content || '');
              setCurrentScriptFileName(scriptFile.file_name);
            } else if (files[0]) {
              console.log('Auto-loading first file:', files[0]);
              setScriptContent(files[0].file_content || '');
              setCurrentScriptFileName(files[0].file_name);
            }
            
            // 自动展开第一个场景的文件列表
            setExpandedScenarios(new Set([firstScenario.id.toString()]));
            console.log('Auto-expanding scenario files for:', firstScenario.id);
          }
        }
      } else {
        // 如果没有场景，清空当前场景和脚本内容
        setCurrentScenario(null);
        setScriptContent('');
        setCurrentScriptFileName('locustfile.py');
        setScenarioFiles({});
      }
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

  // 场景创建相关处理函数
  const handleCreateScenario = () => {
    const newScenario = {
      id: Date.now(), // 临时ID
      name: `Scenario ${scenarios.length + 1}`,
      interface_name: '',
      interface_url: '',
      method: 'GET',
      weight: 1,
      headers: {},
      body: '',
      timeout: 30,
      isNew: true
    };
    
    setScenarios([...scenarios, newScenario]);
    setCurrentScenario(newScenario);
    setIsCreatingScenario(false);
    setCurrentStep(0);
    setSelectedStrategy(null);
    setSelectedLoadGenerator(null);
    setSelectedConfig(null);
    setUploadedFiles([]);
    setSelectedFileId(null);
    setEditorContent('');
  };

  const handleSelectScenario = async (scenario: any) => {
    setCurrentScenario(scenario);
    setIsCreatingScenario(false);
    setCurrentStep(0);
    
    // 自动加载该场景的脚本文件
    const files = scenarioFiles[scenario.id];
    if (files && files.length > 0) {
      // 如果有脚本文件，自动加载第一个
      const scriptFile = files.find(file => 
        file.file_name.endsWith('.py') || file.is_script
      );
      
      if (scriptFile) {
        await handleLoadScript(scriptFile);
      } else {
        // 如果没有找到Python脚本，加载第一个文件
        await handleLoadScript(files[0]);
      }
    } else {
      // 如果没有脚本文件，清空编辑器
      setScriptContent('');
      setCurrentScriptFileName('locustfile.py');
    }
  };

  const handleCancelScenario = () => {
    setIsCreatingScenario(false);
    setCurrentStep(0);
    setSelectedStrategy(null);
    setSelectedLoadGenerator(null);
    setSelectedConfig(null);
    setUploadedFiles([]);
    setSelectedFileId(null);
    setEditorContent('');
  };

  const handleSaveScenario = async () => {
    if (!currentScenario || !testTask) return;
    
    try {
      // 准备保存到数据库的数据
      const scenarioData = {
        task_id: testTask.id,
        interface_name: currentScenario.name,
        interface_url: currentScenario.interface_url || 'http://example.com',
        method: currentScenario.method || 'GET',
        weight: currentScenario.weight || 1,
        order: currentScenario.order || 1,
        headers: currentScenario.headers || {},
        body: currentScenario.body || '',
        timeout: currentScenario.timeout || 30
      };

      // 调用API保存场景
      const savedScenario = await testScenarioService.createTestScenario(scenarioData);
      
      message.success('Scenario saved successfully');
      
      // 更新场景列表，将本地场景替换为保存的场景
      setScenarios(scenarios.map(s => 
        s.id === currentScenario.id 
          ? { ...savedScenario, isNew: false }
          : s
      ));
      
      // 更新当前场景
      const updatedScenario = { ...savedScenario, isNew: false };
      setCurrentScenario(updatedScenario);
      
      // 重新获取任务数据以更新数据库中的场景列表
      await fetchTestTask();
      
      // 确保当前场景保持为刚保存的场景
      setCurrentScenario(updatedScenario);
      
    } catch (error) {
      console.error('Failed to save scenario:', error);
      message.error('Failed to save scenario');
    }
  };

  const handleDeleteScenario = async (scenarioId: number) => {
    try {
      // 检查是否是本地创建的scenario
      const localScenario = scenarios.find(s => s.id === scenarioId);
      const dbScenario = testTask?.scenarios?.find(s => s.id === scenarioId);
      
      if (localScenario && localScenario.isNew) {
        // 本地scenario，直接从状态中删除
        setScenarios(scenarios.filter(s => s.id !== scenarioId));
        
        // 如果删除的是当前场景，清空当前场景
        if (currentScenario?.id === scenarioId) {
          setCurrentScenario(null);
        }
      } else if (dbScenario) {
        // 数据库中的scenario，调用API删除
        await testScenarioService.deleteTestScenario(scenarioId);
        message.success('Scenario deleted successfully');
        
        // 重新获取任务数据
        await fetchTestTask();
      }
    } catch (error) {
      console.error('Failed to delete scenario:', error);
      message.error('Failed to delete scenario');
    }
  };

  const handleToggleScenario = (scenarioId: string) => {
    setExpandedScenarios(prev => {
      const newSet = new Set(prev);
      if (newSet.has(scenarioId)) {
        newSet.delete(scenarioId);
      } else {
        newSet.add(scenarioId);
      }
      return newSet;
    });
  };

  const handleStartEditScenario = (scenario: any) => {
    setEditingScenarioId(scenario.id.toString());
    setEditingScenarioName(scenario.name || scenario.interface_name || '');
  };

  const handleSaveScenarioName = async (scenarioId: string) => {
    if (editingScenarioName && editingScenarioName.trim()) {
      try {
        // 检查是否是数据库中的scenario
        const dbScenario = testTask?.scenarios?.find(s => s.id.toString() === scenarioId);
        const localScenario = scenarios.find(s => s.id.toString() === scenarioId);
        
        if (dbScenario) {
          // 更新数据库中的scenario
          await testScenarioService.updateTestScenario(dbScenario.id, {
            interface_name: editingScenarioName.trim()
          });
          // 重新获取任务数据
          await fetchTestTask();
        } else if (localScenario) {
          // 更新本地scenario
          setScenarios(scenarios.map(s => 
            s.id.toString() === scenarioId 
              ? { ...s, name: editingScenarioName.trim() }
              : s
          ));
          
          // 如果修改的是当前场景的名称，也要更新当前场景
          if (currentScenario?.id.toString() === scenarioId) {
            setCurrentScenario({
              ...currentScenario,
              name: editingScenarioName.trim()
            });
          }
        }
        
        setEditingScenarioId(null);
        setEditingScenarioName('');
        message.success('Scenario name updated successfully');
        
      } catch (error) {
        console.error('Failed to update scenario name:', error);
        message.error('Failed to update scenario name');
      }
    }
  };

  const handleCancelEditScenario = () => {
    setEditingScenarioId(null);
    setEditingScenarioName('');
  };

  // 处理脚本保存
  const handleScriptSave = async (content: string, fileName: string) => {
    if (!currentScenario || !testTask) {
      message.warning('请先选择一个场景');
      return;
    }

    try {
      // 创建文件对象
      const file = new File([content], fileName, { type: 'text/python' });
      
      // 如果当前场景已保存到数据库，直接上传文件
      if (!currentScenario.isNew) {
        // 上传文件到MinIO并关联到场景
        const formData = new FormData();
        formData.append('file', file);
        formData.append('description', `Script file for scenario: ${currentScenario.interface_name}`);
        
        // 调用文件上传API
        const uploadedFile = await testScenarioService.uploadScenarioFile(currentScenario.id, formData);
        
        // 重新获取任务数据以更新文件列表
        await fetchTestTask();
        
        // 在fetchTestTask完成后，再次确保文件被添加到状态中
        setScenarioFiles(prev => ({
          ...prev,
          [currentScenario.id]: [...(prev[currentScenario.id] || []), uploadedFile]
        }));
        
        message.success('脚本保存成功');
      } else {
        // 如果是新场景，先保存场景再保存文件
        await handleSaveScenario();
        
        // 使用当前场景的ID（已经更新为保存后的ID）
        if (currentScenario && !currentScenario.isNew) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('description', `Script file for scenario: ${currentScenario.interface_name}`);
          
          const uploadedFile = await testScenarioService.uploadScenarioFile(currentScenario.id, formData);
          
          // 立即更新本地文件列表状态
          setScenarioFiles(prev => ({
            ...prev,
            [currentScenario.id]: [...(prev[currentScenario.id] || []), uploadedFile]
          }));
          
          // 保存后立即加载脚本到编辑器
          setScriptContent(content);
          setCurrentScriptFileName(fileName);
        }
        
        message.success('场景和脚本保存成功');
      }
      
      // 更新脚本内容
      setScriptContent(content);
      setCurrentScriptFileName(fileName);
      
    } catch (error) {
      console.error('保存脚本失败:', error);
      message.error('保存脚本失败');
    }
  };

  const handleCloneScenario = (scenario: any) => {
    setScenarioModalVisible(true);
    setCurrentStep(0);
    scenarioForm.setFieldsValue(scenario);
    message.info('Scenario cloned, please modify as needed');
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

  // 删除已保存的场景文件
  const handleDeleteScenarioFile = async (fileId: number, scenarioId: number) => {
    try {
      // 调用后端API删除文件
      await testScenarioService.deleteScenarioFile(fileId);
      
      // 更新本地状态
      setScenarioFiles(prev => ({
        ...prev,
        [scenarioId]: prev[scenarioId]?.filter(file => file.id !== fileId) || []
      }));
      
      // 如果删除的是当前正在编辑的文件，清空编辑器
      if (currentScenario?.id === scenarioId) {
        const remainingFiles = scenarioFiles[scenarioId]?.filter(file => file.id !== fileId) || [];
        if (remainingFiles.length > 0) {
          // 加载第一个剩余文件
          handleLoadScript(remainingFiles[0]);
        } else {
          // 清空编辑器
          setScriptContent('');
          setCurrentScriptFileName('locustfile.py');
        }
      }
      
      message.success('文件删除成功');
    } catch (error) {
      console.error('删除文件失败:', error);
      message.error('删除文件失败');
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
                {currentScenario ? (
                  (scenarioFiles[currentScenario.id]?.length > 0 || forceEditorForEmptyScenario) ? (
                    <ScriptEditor
                      key={`script-editor-${currentScenario?.id}-${currentScriptFileName}`}
                      value={scriptContent}
                      onChange={setScriptContent}
                      onSave={handleScriptSave}
                      fileName={currentScriptFileName}
                      height="calc(100vh - 300px)"
                    />
                  ) : (
                    <div style={{
                      height: 'calc(100vh - 300px)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '8px',
                      color: '#8c8c8c'
                    }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>
                        📄
                      </div>
                      <Title level={4} style={{ color: '#8c8c8c', marginBottom: '8px', fontSize: '16px' }}>
                        No scripts found for this scenario
                      </Title>
                      <Text style={{ color: '#666', fontSize: '12px', textAlign: 'center', maxWidth: '360px', marginBottom: '16px' }}>
                        Click the button below to create a default locustfile.py and start editing
                      </Text>
                      <Button 
                        type="primary"
                        icon={<FileTextOutlined />}
                        onClick={handleCreateDefaultScript}
                        style={{
                          background: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
                          border: 'none',
                          height: '36px',
                          borderRadius: '6px',
                          padding: '0 20px',
                          fontWeight: 500,
                          fontSize: '12px'
                        }}
                      >
                        Create Script
                      </Button>
                    </div>
                  )
                ) : (
                  <div style={{
                    height: 'calc(100vh - 300px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    color: '#8c8c8c'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>
                      📝
                    </div>
                    <Title level={4} style={{ color: '#8c8c8c', marginBottom: '8px', fontSize: '16px' }}>
                      Create First Scenario
                    </Title>
                    <Text style={{ color: '#666', fontSize: '12px', textAlign: 'center', maxWidth: '300px' }}>
                      Please create a test scenario first to start writing and uploading your Locust scripts
                    </Text>
                  </div>
                )}
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

      {/* 测试场景管理区域 */}
      <Card 
        style={{ 
          marginBottom: '20px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '8px',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
        }}
        headStyle={{
          background: 'transparent',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '16px 20px 12px 20px'
        }}
        bodyStyle={{
          background: 'transparent',
          padding: '0'
        }}
      >
        <Title level={3} style={{ color: '#fff', margin: 0, fontWeight: 600, fontSize: '16px' }}>
          🎯 Test Scenarios Management
        </Title>
        <Row gutter={0} style={{ height: 'calc(100vh - 200px)' }}>
          {/* 左侧场景列表 */}
          <Col span={4} style={{ 
            borderRight: '1px solid rgba(255, 255, 255, 0.08)', 
            padding: '16px',
            height: 'calc(100vh - 300px)',
            overflowY: 'auto',
            background: 'rgba(255, 255, 255, 0.01)'
          }}>
            <div style={{ marginBottom: '16px' }}>
              <Title level={4} style={{ margin: 0, color: '#fff', fontWeight: 600, fontSize: '14px' }}>
                📝 Scenarios
              </Title>
              <Text style={{ color: '#8c8c8c', fontSize: '11px' }}>
                Manage your test scenarios
              </Text>
            </div>
            
            
            {/* 场景列表 */}
            <div style={{ marginBottom: '16px' }}>
              {(testTask.scenarios && testTask.scenarios.length > 0) || scenarios.length > 0 ? (
                <div>
                  {/* 显示数据库中的场景 */}
                  {testTask.scenarios && testTask.scenarios.map((scenario, index) => {
                    const isExpanded = expandedScenarios.has(scenario.id.toString());
                    const hasFiles = scenarioFiles[scenario.id] && scenarioFiles[scenario.id].length > 0;
                    const isCurrentScenario = currentScenario?.id === scenario.id;
                    
                    return (
                      <div key={scenario.id} style={{ marginBottom: '8px' }}>
                        {/* 场景主项 */}
                        <div
                          style={{
                            padding: '10px 12px',
                            background: isCurrentScenario 
                              ? 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)' 
                              : 'rgba(255, 255, 255, 0.03)',
                            borderRadius: '6px',
                            border: isCurrentScenario 
                              ? '1px solid rgba(24, 144, 255, 0.3)' 
                              : '1px solid rgba(255, 255, 255, 0.05)',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: isCurrentScenario 
                              ? '0 2px 12px rgba(24, 144, 255, 0.2)' 
                              : '0 1px 4px rgba(0, 0, 0, 0.1)'
                          }}
                          onClick={() => handleSelectScenario(scenario)}
                        >
                          <div style={{ 
                            flex: 1, 
                            display: 'flex', 
                            alignItems: 'center' 
                          }}>
                            <div style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: isCurrentScenario ? '#fff' : '#1890ff',
                              marginRight: '8px'
                            }} />
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {editingScenarioId === scenario.id.toString() ? (
                                  <Input
                                    value={editingScenarioName || ''}
                                    onChange={(e) => setEditingScenarioName(e.target.value)}
                                    onPressEnter={() => handleSaveScenarioName(scenario.id.toString())}
                                    onBlur={() => handleSaveScenarioName(scenario.id.toString())}
                                    style={{
                                      fontSize: '12px',
                                      height: '20px',
                                      background: 'transparent',
                                      border: '1px solid #1890ff',
                                      color: '#fff'
                                    }}
                                    autoFocus
                                  />
                                ) : (
                                  <Text 
                                    style={{ 
                                      color: isCurrentScenario ? '#fff' : '#fff',
                                      fontSize: '12px',
                                      fontWeight: isCurrentScenario ? 600 : 500,
                                      cursor: 'pointer'
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartEditScenario(scenario);
                                    }}
                                  >
                                    {scenario.interface_name || `Scenario ${index + 1}`}
                                  </Text>
                                )}
                              </div>
                              <Text 
                                style={{ 
                                  color: isCurrentScenario ? 'rgba(255, 255, 255, 0.8)' : '#8c8c8c',
                                  fontSize: '10px',
                                  display: 'block'
                                }}
                              >
                                Database scenario
                              </Text>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            {/* 展开/收缩按钮 - 有文件时就显示 */}
                            {hasFiles && (
                              <Button
                                type="text"
                                size="small"
                                icon={<DownOutlined />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleScenario(scenario.id.toString());
                                }}
                                style={{
                                  color: isCurrentScenario ? '#fff' : '#a0aec0',
                                  padding: '2px',
                                  minWidth: '20px',
                                  height: '20px',
                                  borderRadius: '4px',
                                  background: 'transparent',
                                  border: 'none',
                                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.2s ease'
                                }}
                              />
                            )}
                            {/* 删除按钮 - 所有场景都显示 */}
                            <Button
                              type="text"
                              size="small"
                              icon={<DeleteOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteScenario(scenario.id);
                              }}
                              style={{
                                color: '#ff4d4f',
                                padding: '2px',
                                minWidth: '20px',
                                height: '20px',
                                borderRadius: '4px',
                                background: 'rgba(255, 77, 79, 0.1)',
                                border: '1px solid rgba(255, 77, 79, 0.2)'
                              }}
                            />
                          </div>
                        </div>
                        
                        {/* 展开的文件列表 - 展开时就显示 */}
                        {isExpanded && hasFiles && (
                          <div style={{
                            marginTop: '4px',
                            marginLeft: '20px',
                            padding: '8px 12px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            borderRadius: '4px',
                            border: '1px solid rgba(255, 255, 255, 0.05)'
                          }}>
                            <Text style={{ 
                              color: '#8c8c8c', 
                              fontSize: '10px', 
                              marginBottom: '6px',
                              display: 'block'
                            }}>
                              Saved Files ({scenarioFiles[scenario.id].length})
                            </Text>
                            {scenarioFiles[scenario.id].map((file) => (
                              <div
                                key={file.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '4px 8px',
                                  marginBottom: '2px',
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  borderRadius: '3px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease'
                                }}
                                onClick={() => {
                                  // 加载文件到编辑器
                                  handleLoadScript(file);
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <FileTextOutlined style={{ 
                                    fontSize: '10px', 
                                    color: '#1890ff' 
                                  }} />
                                  <Text style={{ 
                                    color: '#fff', 
                                    fontSize: '10px',
                                    maxWidth: '100px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {file.file_name}
                                  </Text>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Text style={{ 
                                    color: '#8c8c8c', 
                                    fontSize: '9px' 
                                  }}>
                                    {file.file_size ? `${(file.file_size / 1024).toFixed(1)}KB` : 'N/A'}
                                  </Text>
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={<DeleteOutlined />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteScenarioFile(file.id, scenario.id);
                                    }}
                                    style={{
                                      color: '#ff4d4f',
                                      padding: '1px',
                                      minWidth: '16px',
                                      height: '16px',
                                      borderRadius: '2px',
                                      background: 'rgba(255, 77, 79, 0.1)',
                                      border: '1px solid rgba(255, 77, 79, 0.2)',
                                      fontSize: '8px'
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* 显示本地创建的场景 */}
                  {scenarios.map((scenario, index) => {
                    const isExpanded = expandedScenarios.has(scenario.id.toString());
                    const hasFiles = uploadedFiles.length > 0;
                    const isCurrentScenario = currentScenario?.id === scenario.id;
                    
                    return (
                      <div key={scenario.id} style={{ marginBottom: '8px' }}>
                        {/* 场景主项 */}
                        <div
                          style={{
                            padding: '10px 12px',
                            background: isCurrentScenario 
                              ? 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)' 
                              : 'rgba(255, 255, 255, 0.03)',
                            borderRadius: '6px',
                            border: isCurrentScenario 
                              ? '1px solid rgba(24, 144, 255, 0.3)' 
                              : '1px solid rgba(255, 255, 255, 0.05)',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: isCurrentScenario 
                              ? '0 2px 12px rgba(24, 144, 255, 0.2)' 
                              : '0 1px 4px rgba(0, 0, 0, 0.1)'
                          }}
                          onClick={() => handleSelectScenario(scenario)}
                        >
                          <div style={{ 
                            flex: 1, 
                            display: 'flex', 
                            alignItems: 'center' 
                          }}>
                            <div style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: isCurrentScenario ? '#fff' : '#52c41a',
                              marginRight: '8px'
                            }} />
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {editingScenarioId === scenario.id.toString() ? (
                                  <Input
                                    value={editingScenarioName || ''}
                                    onChange={(e) => setEditingScenarioName(e.target.value)}
                                    onPressEnter={() => handleSaveScenarioName(scenario.id.toString())}
                                    onBlur={() => handleSaveScenarioName(scenario.id.toString())}
                                    style={{
                                      fontSize: '12px',
                                      height: '20px',
                                      background: 'transparent',
                                      border: '1px solid #1890ff',
                                      color: '#fff'
                                    }}
                                    autoFocus
                                  />
                                ) : (
                                  <Text 
                                    style={{ 
                                      color: isCurrentScenario ? '#fff' : '#fff',
                                      fontSize: '12px',
                                      fontWeight: isCurrentScenario ? 600 : 500,
                                      cursor: 'pointer'
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartEditScenario(scenario);
                                    }}
                                  >
                                    {scenario.name}
                                  </Text>
                                )}
                                {scenario.isNew && (
                                  <div style={{
                                    padding: '1px 4px',
                                    background: '#52c41a',
                                    borderRadius: '3px',
                                    fontSize: '8px',
                                    color: '#fff',
                                    fontWeight: 500
                                  }}>
                                    NEW
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            {/* 展开/收缩按钮 - 有文件时就显示 */}
                            {hasFiles && (
                              <Button
                                type="text"
                                size="small"
                                icon={<DownOutlined />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleScenario(scenario.id.toString());
                                }}
                                style={{
                                  color: isCurrentScenario ? '#fff' : '#a0aec0',
                                  padding: '2px',
                                  minWidth: '20px',
                                  height: '20px',
                                  borderRadius: '4px',
                                  background: 'transparent',
                                  border: 'none',
                                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.2s ease'
                                }}
                              />
                            )}
                            {/* 保存按钮 - 只有新建的场景才显示 */}
                            {scenario.isNew && (
                              <Button
                                type="text"
                                size="small"
                                icon={<SaveOutlined />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSaveScenario();
                                }}
                                style={{
                                  color: '#52c41a',
                                  padding: '2px',
                                  minWidth: '20px',
                                  height: '20px',
                                  borderRadius: '4px',
                                  background: 'rgba(82, 196, 26, 0.1)',
                                  border: '1px solid rgba(82, 196, 26, 0.2)',
                                  fontSize: '10px'
                                }}
                              />
                            )}
                            {/* 删除按钮 - 所有场景都显示 */}
                            <Button
                              type="text"
                              size="small"
                              icon={<DeleteOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteScenario(scenario.id);
                              }}
                              style={{
                                color: '#ff4d4f',
                                padding: '2px',
                                minWidth: '20px',
                                height: '20px',
                                borderRadius: '4px',
                                background: 'rgba(255, 77, 79, 0.1)',
                                border: '1px solid rgba(255, 77, 79, 0.2)'
                              }}
                            />
                          </div>
                        </div>
                        
                        {/* 展开的文件列表 - 展开时就显示 */}
                        {isExpanded && hasFiles && (
                          <div style={{
                            marginTop: '4px',
                            marginLeft: '20px',
                            padding: '8px 12px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            borderRadius: '4px',
                            border: '1px solid rgba(255, 255, 255, 0.05)'
                          }}>
                            <Text style={{ 
                              color: '#8c8c8c', 
                              fontSize: '10px', 
                              marginBottom: '6px',
                              display: 'block'
                            }}>
                              Uploaded Files ({uploadedFiles.length})
                            </Text>
                            {uploadedFiles.map((fileData) => (
                              <div
                                key={fileData.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '4px 8px',
                                  marginBottom: '2px',
                                  background: selectedFileId === fileData.id 
                                    ? 'rgba(24, 144, 255, 0.1)' 
                                    : 'transparent',
                                  borderRadius: '3px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease'
                                }}
                                onClick={() => handleFileSelect(fileData.id)}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <FileTextOutlined style={{ 
                                    fontSize: '10px', 
                                    color: '#1890ff' 
                                  }} />
                                  <Text style={{ 
                                    color: '#fff', 
                                    fontSize: '10px',
                                    maxWidth: '100px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {fileData.file.name}
                                  </Text>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Text style={{ 
                                    color: '#8c8c8c', 
                                    fontSize: '9px' 
                                  }}>
                                    {(fileData.file.size / 1024).toFixed(1)}KB
                                  </Text>
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={<DeleteOutlined />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleFileDelete(fileData.id);
                                    }}
                                    style={{
                                      color: '#ff4d4f',
                                      padding: '1px',
                                      minWidth: '16px',
                                      height: '16px',
                                      borderRadius: '2px',
                                      background: 'rgba(255, 77, 79, 0.1)',
                                      border: '1px solid rgba(255, 77, 79, 0.2)',
                                      fontSize: '8px'
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '20px 12px',
                  color: '#8c8c8c',
                  fontSize: '12px'
                }}>
                  <div style={{ 
                    fontSize: '32px', 
                    marginBottom: '8px',
                    opacity: 0.5
                  }}>
                    📝
                  </div>
                  <div>No scenarios created yet</div>
                  <div style={{ fontSize: '10px', marginTop: '2px' }}>
                    Create your first scenario to get started
                  </div>
                </div>
              )}
            </div>
            
            {/* 创建场景按钮 */}
            <div style={{ marginTop: '12px' }}>
              <Button 
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={handleCreateScenario}
                style={{
                  width: '100%',
                  height: '36px',
                  background: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 500,
                  fontSize: '12px'
                }}
              >
                Create New Scenario
              </Button>
            </div>
          </Col>

          {/* 右侧场景创建和配置区域 */}
          <Col span={20} style={{ padding: '16px' }}>
            <div style={{ 
              maxHeight: '60vh', 
              overflowY: 'auto', 
              paddingRight: '8px',
              background: 'rgba(255, 255, 255, 0.01)',
              borderRadius: '8px',
              padding: '16px'
            }}>
              {/* 顶部步骤指示器 */}
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.03)', 
                padding: '12px 16px', 
                borderRadius: '6px', 
                marginBottom: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(10px)'
              }}>
           <Steps 
             current={currentStep} 
             onChange={(v) => setCurrentStep(v)}
             size="small"
           >
             <Step title="Script Upload" />
             <Step title="Load Test Config" />
             <Step title="Load Generator" />
             <Step title="Execute" />
           </Steps>
              </div>

              {/* 主要内容区域 */}
              <div style={{ 
                minHeight: '350px', 
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '20px',
                backdropFilter: 'blur(10px)'
              }}>
              {currentScenario ? (
                <div>
                  
                  {/* 步骤内容 */}
                  <div style={{ minHeight: 200 }}>
                    {renderScenarioSteps()}
                  </div>
                  
                  {/* 操作按钮 */}
                  <div style={{ 
                    textAlign: 'right', 
                    marginTop: '20px', 
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)', 
                    paddingTop: '16px' 
                  }}>
                    {currentStep === 3 && (
                      <Button 
                        type="primary" 
                        onClick={handleExecuteScenario}
                        disabled={!selectedStrategy || !selectedLoadGenerator || !selectedDeploymentConfig || !selectedConfig}
                        style={{
                          background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
                          border: 'none',
                          height: '36px',
                          borderRadius: '6px',
                          padding: '0 20px',
                          fontWeight: 500,
                          fontSize: '12px'
                        }}
                      >
                        Execute Test
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  height: '250px',
                  textAlign: 'center'
                }}>
                  <div>
                    <div style={{ 
                      fontSize: '48px', 
                      marginBottom: '16px',
                      opacity: 0.3
                    }}>
                      🎯
                    </div>
                    <Title level={4} style={{ color: '#fff', marginBottom: '4px', fontSize: '16px' }}>
                      {scenarios.length > 0 ? 'Select a scenario to configure' : 'No scenarios created yet'}
                    </Title>
                    <Text style={{ color: '#8c8c8c', fontSize: '12px', display: 'block', marginBottom: '16px' }}>
                      {scenarios.length > 0 
                        ? 'Choose a scenario from the left panel to start configuration'
                        : 'Create your first test scenario to get started with performance testing'
                      }
                    </Text>
                    <Button 
                      type="primary" 
                      size="large"
                      onClick={handleCreateScenario}
                      style={{
                        background: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
                        border: 'none',
                        height: '36px',
                        borderRadius: '6px',
                        padding: '0 20px',
                        fontWeight: 500,
                        fontSize: '12px'
                      }}
                    >
                      {scenarios.length > 0 ? 'Create New Scenario' : 'Create Your First Scenario'}
                    </Button>
                  </div>
                </div>
              )}
              </div>
            </div>
          </Col>
        </Row>
      </Card>



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
