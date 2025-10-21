import React, { useState, useCallback, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Typography, 
  Button, 
  Form, 
  Input, 
  InputNumber,
  Select,
  Space,
  Steps,
  message
} from 'antd';
import { 
  PlayCircleOutlined,
  FileTextOutlined,
  SettingOutlined,
  RocketOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import FileManager from '../components/FileManager';
import { scenarioService } from '../services/api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { Step } = Steps;

const LocustCreation = () => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<Array<{id: string, name: string, content: string}>>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const navigate = useNavigate();
  const location = useLocation();

  // 从路由参数或location state获取scenario信息
  const scenarioData = location.state?.scenarioData || {};
  const scenarioId = location.state?.scenarioId;
  const isEdit = location.state?.isEdit || false;

  // 加载已保存的文件数据
  useEffect(() => {
    if (scenarioData.script_files && Array.isArray(scenarioData.script_files)) {
      setFiles(scenarioData.script_files);
      if (scenarioData.script_files.length > 0) {
        setSelectedFile(scenarioData.script_files[0].id);
        setFileContent(scenarioData.script_files[0].content);
      }
    }
  }, [scenarioData]);


  const handleNext = () => {
    if (currentStep < 3) {
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
          // 保存文件数据到scenario记录中
          script_files: files,
        };
        await scenarioService.updateScenario(scenarioId, updateData);
        message.success('Locust scenario updated successfully!');
      } else {
        // 如果没有scenarioId，则创建新的scenario记录
        const createData = {
          name: values.name || 'Locust Scenario',
          description: values.description,
          scenario_type: 'locust' as const,
          is_active: true,
          // 保存文件数据到scenario记录中
          script_files: files,
        };
        await scenarioService.createScenario(createData);
        message.success('Locust scenario created successfully!');
      }
      
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
  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const newFile = {
        id: Date.now().toString(),
        name: file.name,
        content: content
      };
      setFiles(prev => [...prev, newFile]);
      setSelectedFile(newFile.id);
      setFileContent(content);
      message.success(`File ${file.name} uploaded successfully`);
    };
    reader.readAsText(file);
    return false; // 阻止默认上传行为
  }, []);

  // 选择文件
  const handleFileSelect = useCallback((fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file) {
      setSelectedFile(fileId);
      setFileContent(file.content);
    }
  }, [files]);

  // 删除文件
  const handleFileDelete = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    if (selectedFile === fileId) {
      setSelectedFile(null);
      setFileContent('');
    }
    message.success('File deleted successfully');
  }, [selectedFile]);

  // 文件内容变化处理
  const handleFileContentChange = useCallback((content: string) => {
    setFileContent(content);
  }, []);

  // 保存文件内容
  const handleSaveFile = useCallback(() => {
    if (selectedFile) {
      setFiles(prev => prev.map(f => 
        f.id === selectedFile ? { ...f, content: fileContent } : f
      ));
      message.success('File saved successfully');
    }
  }, [selectedFile, fileContent]);

  const steps = [
    {
      title: 'Overview',
      icon: <FileTextOutlined />,
    },
    {
      title: 'Script Configuration',
      icon: <SettingOutlined />,
    },
    {
      title: 'Load Testing',
      icon: <RocketOutlined />,
    },
    {
      title: 'Review & Create',
      icon: <CheckCircleOutlined />,
    }
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div>
            <Title level={3} style={{ color: 'var(--text-primary)', marginBottom: '24px' }}>
              Basic Information
            </Title>
            <Form.Item
              name="name"
              label={<span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Scenario Name</span>}
              rules={[{ required: true, message: 'Please input scenario name!' }]}
            >
              <Input 
                placeholder="Enter scenario name"
                style={{ 
                  background: '#07070D', 
                  borderColor: 'var(--border)', 
                  color: 'var(--text-primary)' 
                }}
              />
            </Form.Item>

            <Form.Item
              name="description"
              label={<span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Description</span>}
            >
              <TextArea 
                rows={4}
                placeholder="Enter scenario description"
                style={{ 
                  background: '#07070D', 
                  borderColor: 'var(--border)', 
                  color: 'var(--text-primary)' 
                }}
              />
            </Form.Item>

            <Form.Item
              name="scenario_type"
              label={<span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Type</span>}
            >
              <Input 
                value={scenarioData.scenario_type || 'locust'}
                readOnly
                style={{ 
                  background: '#07070D', 
                  borderColor: 'var(--border)', 
                  color: 'var(--text-secondary)',
                  cursor: 'not-allowed'
                }}
              />
            </Form.Item>
          </div>
        );

      case 1:
        return (
          <div>
            <Title level={3} style={{ color: 'var(--text-primary)', marginBottom: '24px' }}>
              Script Configuration
            </Title>
            
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
          </div>
        );

      case 2:
        return (
          <div>
            <Title level={3} style={{ color: 'var(--text-primary)', marginBottom: '24px' }}>
              Load Testing Parameters
            </Title>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="user_count"
                  label={<span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>User Count</span>}
                  rules={[{ required: true, message: 'Please input user count!' }]}
                >
                  <InputNumber 
                    min={1}
                    max={10000}
                    placeholder="Number of users"
                    style={{ 
                      width: '100%',
                      background: '#07070D', 
                      borderColor: 'var(--border)', 
                      color: 'var(--text-primary)' 
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="spawn_rate"
                  label={<span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Spawn Rate</span>}
                  rules={[{ required: true, message: 'Please input spawn rate!' }]}
                >
                  <InputNumber 
                    min={1}
                    max={1000}
                    placeholder="Users per second"
                    style={{ 
                      width: '100%',
                      background: '#07070D', 
                      borderColor: 'var(--border)', 
                      color: 'var(--text-primary)' 
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="run_time"
                  label={<span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Run Time (seconds)</span>}
                  rules={[{ required: true, message: 'Please input run time!' }]}
                >
                  <InputNumber 
                    min={1}
                    max={3600}
                    placeholder="Test duration"
                    style={{ 
                      width: '100%',
                      background: '#07070D', 
                      borderColor: 'var(--border)', 
                      color: 'var(--text-primary)' 
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="ramp_up_time"
                  label={<span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Ramp Up Time (seconds)</span>}
                  rules={[{ required: true, message: 'Please input ramp up time!' }]}
                >
                  <InputNumber 
                    min={1}
                    max={600}
                    placeholder="Warm-up duration"
                    style={{ 
                      width: '100%',
                      background: '#07070D', 
                      borderColor: 'var(--border)', 
                      color: 'var(--text-primary)' 
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>
        );

      case 3:
        return (
          <div>
            <Title level={3} style={{ color: 'var(--text-primary)', marginBottom: '24px' }}>
              Review & Create
            </Title>
            <Card 
              style={{ 
                background: '#07070D', 
                border: '1px solid var(--border)',
                borderRadius: '1px',
                marginBottom: '24px'
              }}
            >
              <Title level={4} style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>
                Scenario Summary
              </Title>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text strong style={{ color: 'var(--text-secondary)' }}>Name:</Text>
                  <br />
                  <Text style={{ color: 'var(--text-primary)' }}>{form.getFieldValue('name') || 'Not specified'}</Text>
                </Col>
                <Col span={12}>
                  <Text strong style={{ color: 'var(--text-secondary)' }}>Target Host:</Text>
                  <br />
                  <Text style={{ color: 'var(--text-primary)' }}>{form.getFieldValue('target_host') || 'Not specified'}</Text>
                </Col>
                <Col span={12}>
                  <Text strong style={{ color: 'var(--text-secondary)' }}>User Count:</Text>
                  <br />
                  <Text style={{ color: 'var(--text-primary)' }}>{form.getFieldValue('user_count') || 'Not specified'}</Text>
                </Col>
                <Col span={12}>
                  <Text strong style={{ color: 'var(--text-secondary)' }}>Spawn Rate:</Text>
                  <br />
                  <Text style={{ color: 'var(--text-primary)' }}>{form.getFieldValue('spawn_rate') || 'Not specified'}</Text>
                </Col>
              </Row>
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
      minHeight: '100vh',
      fontFamily: 'Proxima Nova, sans-serif'
    }}>

      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {/* Left Sidebar */}
        <div style={{ 
          width: '300px', 
          background: '#07070D', 
          padding: '24px 24px 24px 40px'
        }}>
          <div style={{ marginBottom: '32px', padding: '25px 0 0 25px' }}>
            <Space>
              <img src="/fi-rr-locust.svg" alt="Locust" style={{ width: '32px', height: '32px' }} />
              <div>
                <Title level={4} style={{ color: 'var(--text-primary)', margin: 0 }}>
                  Setting Up
                </Title>
              </div>
            </Space>
          </div>

          <Steps
            direction="vertical"
            current={currentStep}
            size="small"
            className="locust-creation-steps"
            style={{
              marginTop: '20px',   // 向下移动
              marginLeft: '20px'   // 向右移动
            }}
          >
            {steps.map((step, index) => (
              <Step
                key={index}
                title={
                  <span 
                    onClick={() => handleStepClick(index)}
                    style={{ cursor: 'pointer' }}
                  >
                    {step.title}
                  </span>
                }
                icon={
                  <span 
                    onClick={() => handleStepClick(index)}
                    style={{ cursor: 'pointer' }}
                  >
                    {step.icon}
                  </span>
                }
                className="locust-creation-step"
                status={
                  index < currentStep ? 'finish' : 
                  index === currentStep ? 'process' : 
                  'wait'
                }
              />
            ))}
          </Steps>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, padding: '24px 24px 24px 0px' }}>
          <div style={{ maxWidth: '800px' }}>
            <Title level={1} style={{ 
              color: 'var(--text-primary)', 
              marginBottom: '16px',
              marginLeft: '0px',
              fontSize: '32px',
              fontWeight: 700
            }}>
              Hello, Locust World!
            </Title>
            
            <Paragraph style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '16px',
              marginBottom: '32px'
            }}>
              Welcome and thanks for checking out our Locust load testing platform!
            </Paragraph>
            
            <Paragraph style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '16px',
              marginBottom: '32px'
            }}>
              In the next 5 minutes, you will set up a Locust scenario and configure your load testing parameters.
            </Paragraph>

            <Card 
              style={{ 
                background: '#07070D', 
                border: '1px solid var(--border)',
                borderRadius: '1px',
                marginBottom: '24px'
              }}
            >
              <Form
                form={form}
                layout="vertical"
                initialValues={scenarioData}
              >
                {renderStepContent()}
              </Form>
            </Card>

            {/* Action Buttons */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginTop: '24px'
            }}>
              {currentStep === 0 ? (
                // Overview步骤：显示Previous和Update按钮
                <>
                  <Button 
                    onClick={handlePrev}
                    disabled={true}
                    style={{
                      background: '#07070D',
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    Previous
                  </Button>
                  
                  <Button 
                    type="primary"
                    onClick={handleFinish}
                    loading={loading}
                    style={{
                      background: 'var(--primary)',
                      borderColor: 'var(--primary)',
                      color: 'white'
                    }}
                  >
                    Update
                  </Button>
                </>
              ) : (
                // 其他步骤：显示Previous和Next/Create Scenario按钮
                <>
                  <Button 
                    onClick={handlePrev}
                    style={{
                      background: '#07070D',
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    Previous
                  </Button>
                  
                  <Space>
                    {currentStep === steps.length - 1 ? (
                      <Button 
                        type="primary"
                        onClick={handleFinish}
                        loading={loading}
                        style={{
                          background: 'var(--primary)',
                          borderColor: 'var(--primary)',
                          color: 'white'
                        }}
                      >
                        Create Scenario
                      </Button>
                    ) : (
                      <Button 
                        type="primary"
                        onClick={handleNext}
                        style={{
                          background: 'var(--primary)',
                          borderColor: 'var(--primary)',
                          color: 'white'
                        }}
                      >
                        Next
                      </Button>
                    )}
                  </Space>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { LocustCreation };
export default LocustCreation;
