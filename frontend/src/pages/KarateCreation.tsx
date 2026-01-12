import React, { useState, useCallback, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Typography, 
  Button, 
  Form, 
  Input, 
  Space,
  Steps,
  message,
  Alert,
  Modal,
  Spin
} from 'antd';
import { 
  FileTextOutlined,
  CheckCircleOutlined,
  UserOutlined,
  RocketOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import FileManager from '../components/FileManager';
import { scenarioService, scenarioFileService } from '../services/api';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Step } = Steps;

const KarateCreation = () => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<Array<{id: number, name: string, content: string}>>([]);
  const [selectedFile, setSelectedFile] = useState<number | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [running, setRunning] = useState(false);
  const [runResultVisible, setRunResultVisible] = useState(false);
  const [runResult, setRunResult] = useState<{success: boolean, output: string, error: string} | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // 从路由参数或location state获取scenario信息
  const scenarioData = location.state?.scenarioData || {};
  const scenarioId = location.state?.scenarioId;
  const isEdit = location.state?.isEdit || false;

  // 默认 Karate feature 文件模板
  const defaultFeatureContent = `Feature: API Test Scenario

  Background:
    * url 'https://api.example.com'
    * configure headers = { 'Content-Type': 'application/json' }

  Scenario: Get user information
    Given path 'users', 1
    When method GET
    Then status 200
    And match response.id == 1
    And match response.name == '#string'

  Scenario: Create new user
    Given path 'users'
    And request { name: 'John Doe', email: 'john@example.com' }
    When method POST
    Then status 201
    And match response.name == 'John Doe'
`;

  // 初始化表单数据（编辑模式）
  useEffect(() => {
    if (isEdit && scenarioData) {
      form.setFieldsValue({
        name: scenarioData.name || '',
        description: scenarioData.description || ''
      });
    }
  }, [isEdit, scenarioData, form]);

  // 加载已保存的文件数据
  const loadScenarioFiles = useCallback(async () => {
    if (scenarioId) {
      try {
        const scenarioFiles = await scenarioFileService.getScenarioFiles(scenarioId);
          const filesWithContent = await Promise.all(
            scenarioFiles.map(async (file: any) => {
              const fileData = await scenarioFileService.getScenarioFile(scenarioId, file.id);
              return {
                id: file.id,
                name: file.file_name,
                content: fileData.file_content,
                folder: undefined // 确保所有文件都显示在默认文件夹中
              };
            })
          );
        setFiles(filesWithContent);
        if (filesWithContent.length > 0) {
          // 如果当前没有选中文件，或者选中的文件不在列表中，则选中第一个文件
          setSelectedFile(prevSelected => {
            const currentFileExists = filesWithContent.some(f => f.id === prevSelected);
            if (!currentFileExists) {
              const firstFile = filesWithContent[0];
              setFileContent(firstFile.content);
              return firstFile.id;
            }
            return prevSelected;
          });
        }
      } catch (error) {
        console.error('Failed to load scenario files:', error);
      }
    }
  }, [scenarioId]);

  useEffect(() => {
    loadScenarioFiles();
  }, [scenarioId, loadScenarioFiles]);

  const handleNext = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();

      // 如果有scenarioId，则更新已创建的scenario记录
      if (scenarioId) {
        const updateData = {
          ...values,
        };
        await scenarioService.updateScenario(scenarioId, updateData);
        message.success('Karate scenario updated successfully!');
      } else {
        // 如果没有scenarioId，则创建新的scenario记录
        const createData = {
          name: values.name || 'Karate Scenario',
          description: values.description,
          scenario_type: 'karate' as const,
          is_active: true,
        };
        const createdScenario = await scenarioService.createScenario(createData);
        
        // 保存文件到MinIO
        for (const file of files) {
          await scenarioFileService.createScenarioFile(createdScenario.id, {
            file_name: file.name,
            file_content: file.content,
            content_type: 'text/plain'
          });
        }
        
        message.success('Karate scenario created successfully!');
      }

      // 跳转到scenario列表页
      navigate('/scenarios');
    } catch (error) {
      message.error('Please fill in all required fields');
    } finally {
      setLoading(false);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  // 文件上传处理
  const handleFileUpload = useCallback(async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      const newFile = {
        id: Date.now(), // 临时ID
        name: file.name,
        content: content,
        folder: undefined // 确保文件显示在默认文件夹中
      };
      
      // 如果有scenarioId，直接保存到MinIO
      if (scenarioId) {
        try {
          const savedFile = await scenarioFileService.createScenarioFile(scenarioId, {
            file_name: file.name,
            file_content: content,
            content_type: 'text/plain'
          });
          newFile.id = savedFile.id; // 使用服务器返回的真实ID
        } catch (error) {
          message.error('Failed to save file to server');
          return false;
        }
      }
      
      setFiles(prev => [...prev, newFile]);
      setSelectedFile(newFile.id);
      setFileContent(content);
      message.success(`File ${file.name} uploaded successfully`);
    };
    reader.readAsText(file);
    return false; // 阻止默认上传行为
  }, [scenarioId]);

  // 选择文件
  const handleFileSelect = useCallback((fileId: number) => {
    const file = files.find(f => f.id === fileId);
    if (file) {
      setSelectedFile(fileId);
      setFileContent(file.content);
    }
  }, [files]);

  // 删除文件
  const handleFileDelete = useCallback(async (fileId: number) => {
    // 如果有scenarioId，从服务器删除
    if (scenarioId) {
      try {
        await scenarioFileService.deleteScenarioFile(scenarioId, fileId);
      } catch (error) {
        message.error('Failed to delete file from server');
        return;
      }
    }
    
    setFiles(prev => prev.filter(f => f.id !== fileId));
    if (selectedFile === fileId) {
      setSelectedFile(null);
      setFileContent('');
    }
    message.success('File deleted successfully');
  }, [selectedFile, scenarioId]);

  // 文件内容变化处理
  const handleFileContentChange = useCallback((content: string) => {
    setFileContent(content);
  }, []);

  // 保存文件内容
  const handleSaveFile = useCallback(async () => {
    if (!selectedFile) return;
    
    const currentFile = files.find(f => f.id === selectedFile);
    if (!currentFile) return;
    
    if (scenarioId) {
      try {
        // 检查是否是临时ID（大于1000000000000的数字通常是Date.now()生成的临时ID）
        // 或者检查文件是否已经在服务器上（通过检查ID是否看起来像数据库ID）
        const isTemporaryId = selectedFile > 1000000000000;
        
        if (isTemporaryId) {
          // 临时ID，需要先创建文件
          const savedFile = await scenarioFileService.createScenarioFile(scenarioId, {
            file_name: currentFile.name,
            file_content: fileContent,
            content_type: 'text/plain'
          });
          
          // 更新本地状态，使用真实ID替换临时ID
          setFiles(prev => prev.map(f =>
            f.id === selectedFile ? { ...f, id: savedFile.id, content: fileContent } : f
          ));
          setSelectedFile(savedFile.id);
          message.success('File created and saved successfully');
        } else {
          // 真实ID，更新文件
          await scenarioFileService.updateScenarioFile(scenarioId, selectedFile, {
            file_content: fileContent,
            content_type: 'text/plain'
          });
          
          // 更新本地状态
          setFiles(prev => prev.map(f =>
            f.id === selectedFile ? { ...f, content: fileContent } : f
          ));
          message.success('File saved successfully');
        }
      } catch (error) {
        console.error('Failed to save file:', error);
        message.error('Failed to save file to server');
      }
    } else {
      // 本地保存（没有scenarioId时）
      setFiles(prev => prev.map(f =>
        f.id === selectedFile ? { ...f, content: fileContent } : f
      ));
      message.success('File saved successfully');
    }
  }, [selectedFile, fileContent, scenarioId, files]);

  // 运行Karate测试
  const handleRunTest = useCallback(async () => {
    if (!fileContent || !fileContent.trim()) {
      message.warning('Please select a file with content to run');
      return;
    }

    // 检查是否是.feature文件
    const currentFile = files.find(f => f.id === selectedFile);
    if (currentFile && !currentFile.name.endsWith('.feature')) {
      message.warning('Only .feature files can be run');
      return;
    }

    setRunning(true);
    setRunResultVisible(true);
    setRunResult(null);

    try {
      let result;
      
      // 如果有scenarioId和文件ID（真实ID），使用文件运行API
      if (scenarioId && selectedFile && selectedFile <= 1000000000000) {
        result = await scenarioFileService.runKarateFile(scenarioId, selectedFile);
      } else {
        // 否则使用内容运行API
        const fileName = currentFile?.name || 'test.feature';
        result = await scenarioFileService.runKarateContent(scenarioId || 0, {
          file_content: fileContent,
          file_name: fileName
        });
      }

      setRunResult({
        success: result.success,
        output: result.output || '',
        error: result.error || ''
      });

      if (result.success) {
        message.success('Karate test executed successfully!');
      } else {
        message.error('Karate test execution failed');
      }
    } catch (error: any) {
      console.error('Failed to run Karate test:', error);
      setRunResult({
        success: false,
        output: '',
        error: error.response?.data?.detail || error.message || 'Failed to run Karate test'
      });
      message.error('Failed to run Karate test');
    } finally {
      setRunning(false);
    }
  }, [fileContent, selectedFile, files, scenarioId]);

  // 创建默认 feature 文件
  const handleCreateDefaultFeature = async () => {
    const defaultFileName = 'api-test.feature';
    
    // 如果有scenarioId，立即创建文件到服务器
    if (scenarioId) {
      try {
        const savedFile = await scenarioFileService.createScenarioFile(scenarioId, {
          file_name: defaultFileName,
          file_content: defaultFeatureContent,
          content_type: 'text/plain'
        });
        
        const newFile = {
          id: savedFile.id, // 使用服务器返回的真实ID
          name: defaultFileName,
          content: defaultFeatureContent,
          folder: undefined // 确保文件显示在默认文件夹中
        };
        
        // 检查文件是否已存在（避免重复添加）
        const fileExists = files.some(f => f.id === newFile.id || f.name === defaultFileName);
        if (!fileExists) {
          // 直接添加到文件列表
          setFiles(prev => [...prev, newFile]);
        } else {
          // 如果文件已存在，更新它
          setFiles(prev => prev.map(f => 
            f.id === newFile.id || f.name === defaultFileName 
              ? { ...f, id: newFile.id, content: defaultFeatureContent }
              : f
          ));
        }
        
        // 选中新创建的文件
        setSelectedFile(newFile.id);
        setFileContent(defaultFeatureContent);
        
        message.success('Default feature file created');
      } catch (error) {
        console.error('Failed to create default feature file:', error);
        message.error('Failed to create default feature file on server');
      }
    } else {
      // 如果没有scenarioId，使用临时ID（在最终保存场景时会创建）
      const tempId = Date.now();
      const newFile = {
        id: tempId,
        name: defaultFileName,
        content: defaultFeatureContent,
        folder: undefined // 确保文件显示在默认文件夹中
      };
      
      // 检查文件是否已存在（避免重复添加）
      const fileExists = files.some(f => f.name === defaultFileName);
      if (!fileExists) {
        setFiles(prev => [...prev, newFile]);
        setSelectedFile(tempId);
        setFileContent(defaultFeatureContent);
        message.success('Default feature file created');
      } else {
        // 如果文件已存在，选中它并更新内容
        const existingFile = files.find(f => f.name === defaultFileName);
        if (existingFile) {
          setSelectedFile(existingFile.id);
          setFileContent(defaultFeatureContent);
          // 更新文件内容
          setFiles(prev => prev.map(f => 
            f.id === existingFile.id 
              ? { ...f, content: defaultFeatureContent }
              : f
          ));
          message.success('Default feature file updated');
        }
      }
    }
  };

  const steps = [
    {
      title: 'Overview',
      icon: <UserOutlined />,
    },
    {
      title: 'Feature Files',
      icon: <FileTextOutlined />,
    },
    {
      title: 'Review & Create',
      icon: <CheckCircleOutlined />,
    }
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Overview
        return (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <Title level={1} style={{ 
                color: 'var(--text-primary)', 
                marginBottom: '16px',
                fontSize: '32px',
                fontWeight: 700
              }}>
                Welcome to Karate Testing!
              </Title>
              
              <Paragraph style={{ 
                color: 'var(--text-secondary)', 
                fontSize: '16px',
                marginBottom: '8px'
              }}>
                Karate is a unified framework for API testing, mocking, and performance testing.
              </Paragraph>
              
              <Paragraph style={{ 
                color: 'var(--text-secondary)', 
                fontSize: '16px',
                margin: 0
              }}>
                Create your Karate feature files using Gherkin syntax for BDD-style API testing.
              </Paragraph>
            </div>

            <Card 
              style={{ 
                background: '#07070D', 
                border: '1px solid var(--border)',
                borderRadius: '1px'
              }}
            >
              <Title level={3} style={{ color: 'var(--text-primary)', marginBottom: '24px' }}>
                Basic Information
              </Title>
              <Form.Item
                name="name"
                label={<span style={{ color: 'var(--text-primary)' }}>Scenario Name</span>}
                rules={[{ required: true, message: 'Please enter scenario name' }]}
                initialValue={scenarioData.name || ''}
              >
                <Input 
                  placeholder="Enter scenario name"
                  style={{ background: '#1A192E', borderColor: '#344156', color: '#E5E7EB' }}
                />
              </Form.Item>
              
              <Form.Item
                name="description"
                label={<span style={{ color: 'var(--text-primary)' }}>Description</span>}
                initialValue={scenarioData.description || ''}
              >
                <TextArea 
                  rows={4}
                  placeholder="Enter scenario description"
                  style={{ background: '#1A192E', borderColor: '#344156', color: '#E5E7EB' }}
                />
              </Form.Item>

              <Alert
                message="About Karate"
                description="Karate uses .feature files written in Gherkin syntax. You can create multiple feature files for different API endpoints or test scenarios."
                type="info"
                showIcon
                style={{ marginTop: 16, background: '#1A192E', borderColor: '#344156' }}
              />
            </Card>
          </div>
        );

      case 1: // Feature Files
        return (
          <div>
            <Card 
              style={{ 
                background: '#07070D', 
                border: '1px solid var(--border)',
                borderRadius: '1px',
                marginBottom: 16
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={3} style={{ color: 'var(--text-primary)', margin: 0 }}>
                  Feature Files
                </Title>
                <Space>
                  {selectedFile && fileContent && (
                    <Button 
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      onClick={handleRunTest}
                      loading={running}
                      style={{
                        background: '#52c41a',
                        borderColor: '#52c41a'
                      }}
                    >
                      Run Test
                    </Button>
                  )}
                  <Button 
                    type="primary"
                    icon={<FileTextOutlined />}
                    onClick={handleCreateDefaultFeature}
                  >
                    Create Default Feature
                  </Button>
                </Space>
              </div>
              
              <Paragraph style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
                Upload or create .feature files for your Karate test scenarios. Files should use Gherkin syntax.
              </Paragraph>

              <FileManager
                files={files}
                selectedFile={selectedFile}
                fileContent={fileContent}
                onFileUpload={handleFileUpload}
                onFileSelect={handleFileSelect}
                onFileDelete={handleFileDelete}
                onFileContentChange={handleFileContentChange}
                onSaveFile={handleSaveFile}
              />
            </Card>
          </div>
        );

      case 2: // Review & Create
        return (
          <div>
            <Card 
              style={{ 
                background: '#07070D', 
                border: '1px solid var(--border)',
                borderRadius: '1px'
              }}
            >
              <Title level={3} style={{ color: 'var(--text-primary)', marginBottom: '24px' }}>
                Review & Create
              </Title>
              
              <Row gutter={16}>
                <Col span={12}>
                  <Card 
                    style={{ 
                      background: '#1A192E', 
                      border: '1px solid #344156',
                      marginBottom: 16
                    }}
                  >
                    <Text strong style={{ color: 'var(--text-primary)' }}>Scenario Name:</Text>
                    <div style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
                      {form.getFieldValue('name') || 'Not set'}
                    </div>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card 
                    style={{ 
                      background: '#1A192E', 
                      border: '1px solid #344156',
                      marginBottom: 16
                    }}
                  >
                    <Text strong style={{ color: 'var(--text-primary)' }}>Description:</Text>
                    <div style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
                      {form.getFieldValue('description') || 'No description'}
                    </div>
                  </Card>
                </Col>
              </Row>

              <Card 
                style={{ 
                  background: '#1A192E', 
                  border: '1px solid #344156',
                  marginTop: 16
                }}
              >
                <Text strong style={{ color: 'var(--text-primary)' }}>Feature Files ({files.length}):</Text>
                <div style={{ marginTop: 12 }}>
                  {files.length === 0 ? (
                    <Text style={{ color: 'var(--text-secondary)' }}>No files uploaded</Text>
                  ) : (
                    files.map(file => (
                      <div key={file.id} style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
                        <FileTextOutlined style={{ marginRight: 8 }} />
                        {file.name}
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <Alert
                message="Ready to Create"
                description="Review your scenario information above. Click 'Create' to save your Karate scenario."
                type="success"
                showIcon
                style={{ marginTop: 16, background: '#1A192E', borderColor: '#344156' }}
              />
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ 
      background: '#07070D', 
      minHeight: 'calc(100vh - 48px)',
      padding: '24px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <Steps 
          current={currentStep} 
          onChange={handleStepClick}
          style={{ marginBottom: '32px' }}
        >
          {steps.map((step, index) => (
            <Step 
              key={index} 
              title={step.title} 
              icon={step.icon}
            />
          ))}
        </Steps>

        <Form form={form} layout="vertical">
          {renderStepContent()}
        </Form>

        <div style={{ 
          marginTop: '32px', 
          display: 'flex', 
          justifyContent: 'space-between' 
        }}>
          <Button 
            onClick={() => navigate('/scenarios')}
            style={{ 
              background: '#2d2d2d',
              borderColor: '#6366f1',
              color: '#ffffff'
            }}
          >
            Cancel
          </Button>
          
          <Space>
            {currentStep > 0 && (
              <Button 
                onClick={handlePrev}
                style={{ 
                  background: '#2d2d2d',
                  borderColor: '#6366f1',
                  color: '#ffffff'
                }}
              >
                Previous
              </Button>
            )}
            
            {currentStep < steps.length - 1 ? (
              <Button 
                type="primary"
                onClick={handleNext}
                icon={<RocketOutlined />}
              >
                Next
              </Button>
            ) : (
              <Button 
                type="primary"
                onClick={handleFinish}
                loading={loading}
                icon={<CheckCircleOutlined />}
              >
                {isEdit ? 'Update' : 'Create'}
              </Button>
            )}
          </Space>
        </div>
      </div>

      {/* 运行结果Modal */}
      <Modal
        title="Karate Test Execution Result"
        open={runResultVisible}
        onCancel={() => setRunResultVisible(false)}
        footer={[
          <Button key="close" onClick={() => setRunResultVisible(false)}>
            Close
          </Button>
        ]}
        width={800}
        style={{ top: 20 }}
      >
        {running ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16, color: 'var(--text-secondary)' }}>
              Running Karate test...
            </div>
          </div>
        ) : runResult ? (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Alert
                message={runResult.success ? 'Test Passed' : 'Test Failed'}
                type={runResult.success ? 'success' : 'error'}
                showIcon
                style={{ marginBottom: 16 }}
              />
            </div>
            
            {runResult.output && (
              <div style={{ marginBottom: 16 }}>
                <Text strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>
                  Output:
                </Text>
                <div
                  style={{
                    background: '#1A192E',
                    border: '1px solid #344156',
                    borderRadius: '4px',
                    padding: '12px',
                    maxHeight: '400px',
                    overflow: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    color: 'var(--text-primary)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {runResult.output}
                </div>
              </div>
            )}
            
            {runResult.error && (
              <div>
                <Text strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>
                  Error:
                </Text>
                <div
                  style={{
                    background: '#1A192E',
                    border: '1px solid #ff4d4f',
                    borderRadius: '4px',
                    padding: '12px',
                    maxHeight: '300px',
                    overflow: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    color: '#ff4d4f',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {runResult.error}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default KarateCreation;
