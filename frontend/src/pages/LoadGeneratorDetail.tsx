import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Button, 
  Space, 
  Tag, 
  Table, 
  Modal, 
  Form, 
  Input, 
  InputNumber,
  Switch,
  message,
  Popconfirm,
  Tabs
} from 'antd';
import { 
  ArrowLeftOutlined,
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  SettingOutlined,
  CodeOutlined
} from '@ant-design/icons';
import { loadGeneratorService } from '../services/api';
import type { LoadGenerator, LoadGeneratorConfig } from '../types/loadGenerator';

const LoadGeneratorDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loadGenerator, setLoadGenerator] = useState<LoadGenerator | null>(null);
  const [configs, setConfigs] = useState<LoadGeneratorConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<LoadGeneratorConfig | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    if (id) {
      fetchLoadGenerator();
      fetchConfigs();
    }
  }, [id]);

  const fetchLoadGenerator = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await loadGeneratorService.getLoadGenerator(parseInt(id));
      setLoadGenerator(data);
    } catch (error) {
      message.error('Failed to fetch load generator details');
    } finally {
      setLoading(false);
    }
  };

  const fetchConfigs = async () => {
    if (!id) return;
    try {
      const data = await loadGeneratorService.getConfigs(parseInt(id));
      setConfigs(data);
    } catch (error) {
      message.error('Failed to fetch configuration list');
    }
  };

  const handleTestConnection = async () => {
    if (!id) return;
    try {
      const result = await loadGeneratorService.testConnection(parseInt(id));
      if (result.success) {
        message.success('Connection test successful');
        fetchLoadGenerator();
      } else {
        message.error(result.message);
      }
    } catch (error) {
      message.error('Connection test failed');
    }
  };

  const handleAddConfig = () => {
    setEditingConfig(null);
    form.resetFields();
    setConfigModalVisible(true);
  };

  const handleEditConfig = (config: LoadGeneratorConfig) => {
    setEditingConfig(config);
    form.setFieldsValue(config);
    setConfigModalVisible(true);
  };

  const handleDeleteConfig = async (configId: number) => {
    try {
      await loadGeneratorService.deleteConfig(configId);
      message.success('Delete successful');
      fetchConfigs();
    } catch (error) {
      message.error('Delete failed');
    }
  };

  const handleConfigSubmit = async (values: any) => {
    if (!id) return;
    try {
      if (editingConfig) {
        await loadGeneratorService.updateConfig(editingConfig.id, values);
        message.success('Update successful');
      } else {
        await loadGeneratorService.createConfig(parseInt(id), values);
        message.success('Create successful');
      }
      setConfigModalVisible(false);
      fetchConfigs();
    } catch (error) {
      message.error(editingConfig ? 'Update failed' : 'Create failed');
    }
  };

  const getStatusTag = (status: string) => {
    const statusMap = {
      online: { color: '#52c41a', text: 'ONLINE' },
      offline: { color: '#ff4d4f', text: 'OFFLINE' },
      maintenance: { color: '#faad14', text: 'MAINTENANCE' }
    };
    const config = statusMap[status as keyof typeof statusMap] || { color: '#666', text: status.toUpperCase() };
    return (
      <span style={{
        backgroundColor: config.color,
        color: '#ffffff',
        padding: '4px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {config.text}
      </span>
    );
  };

  const configColumns = [
    {
      title: 'CONFIG NAME',
      dataIndex: 'config_name',
      key: 'config_name',
    },
    {
      title: 'MASTER CONFIG',
      key: 'master',
      render: (_: any, record: LoadGeneratorConfig) => (
        <div>
          <div>CPU: {record.master_cpu_cores} cores</div>
          <div>Memory: {record.master_memory_gb} GB</div>
        </div>
      ),
    },
    {
      title: 'WORKER CONFIG',
      key: 'worker',
      render: (_: any, record: LoadGeneratorConfig) => (
        <div>
          <div>Count: {record.worker_count} workers</div>
          <div>CPU: {record.worker_cpu_cores} cores/worker</div>
          <div>Memory: {record.worker_memory_gb} GB/worker</div>
        </div>
      ),
    },
    {
      title: 'STATUS',
      dataIndex: 'is_valid',
      key: 'is_valid',
      render: (isValid: boolean) => (
        <span style={{
          backgroundColor: isValid ? '#52c41a' : '#ff4d4f',
          color: '#ffffff',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 500
        }}>
          {isValid ? 'VALID' : 'INVALID'}
        </span>
      ),
    },
    {
      title: 'ACTIONS',
      key: 'action',
      render: (_: any, record: LoadGeneratorConfig) => (
        <Space size="small">
          <Button 
            type="link" 
            icon={<EditOutlined />}
            onClick={() => handleEditConfig(record)}
            style={{ color: 'var(--primary)' }}
          >
            EDIT
          </Button>
          <Popconfirm
            title="Delete this configuration?"
            onConfirm={() => handleDeleteConfig(record.id)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{
              style: {
                background: '#6366f1',
                borderColor: '#6366f1',
                color: '#ffffff',
                fontWeight: 600
              }
            }}
            cancelButtonProps={{
              style: {
                background: '#2d2d2d',
                borderColor: '#6366f1',
                color: '#ffffff',
                fontWeight: 500
              }
            }}
            overlayStyle={{
              background: '#1a1a1a',
              border: '2px solid #6366f1',
              borderRadius: '8px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
              color: '#ffffff'
            }}
            overlayClassName="custom-popconfirm"
            icon={
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                style={{ 
                  display: 'inline-block', 
                  verticalAlign: 'baseline',
                  marginBottom: '2px'
                }}
              >
                <circle cx="12" cy="12" r="10" fill="#faad14" />
                <rect x="11" y="6" width="2" height="8" rx="1" fill="#1a1a1a" />
                <circle cx="12" cy="17" r="1.5" fill="#1a1a1a" />
              </svg>
            }
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              DELETE
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (!loadGenerator) {
    return <div style={{ color: 'var(--text-primary)' }}>Loading...</div>;
  }

  const tabItems = [
    {
      key: 'overview',
      label: 'OVERVIEW',
      children: (
        <Row gutter={16}>
          <Col span={8}>
            <Card 
              title={
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '16px',
                  fontWeight: 600
                }}>
                  <InfoCircleOutlined style={{ color: 'var(--primary)' }} />
                  BASIC INFORMATION
                </div>
              }
              className="detail-card"
              style={{ minHeight: '300px' }}
            >
              <div style={{ marginBottom: 16, color: 'var(--text-primary)' }}>
                <strong>Name:</strong> {loadGenerator.name}
              </div>
              <div style={{ marginBottom: 16, color: 'var(--text-primary)' }}>
                <strong>Host Address:</strong> {loadGenerator.host}:{loadGenerator.port}
              </div>
              <div style={{ marginBottom: 16, color: 'var(--text-primary)' }}>
                <strong>Username:</strong> {loadGenerator.username}
              </div>
              <div style={{ marginBottom: 16, color: 'var(--text-primary)' }}>
                <strong>Status:</strong> {getStatusTag(loadGenerator.status)}
              </div>
              {loadGenerator.description && (
                <div style={{ color: 'var(--text-primary)' }}>
                  <strong>Description:</strong> {loadGenerator.description}
                </div>
              )}
            </Card>
          </Col>
          <Col span={8}>
            <Card 
              title={
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '16px',
                  fontWeight: 600
                }}>
                  <SettingOutlined style={{ color: 'var(--primary)' }} />
                  HARDWARE CONFIG
                </div>
              }
              className="detail-card"
              style={{ minHeight: '300px' }}
            >
              <div style={{ marginBottom: 16, color: 'var(--text-primary)' }}>
                <strong>CPU Cores:</strong> {loadGenerator.cpu_cores || 'N/A'} cores
              </div>
              <div style={{ marginBottom: 16, color: 'var(--text-primary)' }}>
                <strong>Memory:</strong> {loadGenerator.memory_gb || 'N/A'} GB
              </div>
              {loadGenerator.network_bandwidth && (
                <div style={{ marginBottom: 16, color: 'var(--text-primary)' }}>
                  <strong>Network Bandwidth:</strong> {loadGenerator.network_bandwidth}
                </div>
              )}
              {loadGenerator.disk_space && (
                <div style={{ color: 'var(--text-primary)' }}>
                  <strong>Disk Space:</strong> {loadGenerator.disk_space}
                </div>
              )}
            </Card>
          </Col>
          <Col span={8}>
            <Card 
              title={
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '16px',
                  fontWeight: 600
                }}>
                  <CodeOutlined style={{ color: 'var(--primary)' }} />
                  SOFTWARE INFO
                </div>
              }
              className="detail-card"
              style={{ minHeight: '300px' }}
            >
              {loadGenerator.os_info && loadGenerator.os_info.trim() && (
                <div style={{ marginBottom: 16, color: 'var(--text-primary)' }}>
                  <strong>Operating System:</strong> {loadGenerator.os_info}
                </div>
              )}
              {loadGenerator.python_version && (
                <div style={{ marginBottom: 16, color: 'var(--text-primary)' }}>
                  <strong>Python Version:</strong> {loadGenerator.python_version}
                </div>
              )}
              {loadGenerator.locust_version && (
                <div style={{ marginBottom: 16, color: 'var(--text-primary)' }}>
                  <strong>Locust Version:</strong> {loadGenerator.locust_version}
                </div>
              )}
              {loadGenerator.last_heartbeat && (
                <div style={{ color: 'var(--text-primary)' }}>
                  <strong>Last Heartbeat:</strong> {new Date(loadGenerator.last_heartbeat).toLocaleString()}
                </div>
              )}
              {!loadGenerator.os_info && !loadGenerator.python_version && !loadGenerator.locust_version && !loadGenerator.last_heartbeat && (
                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No software information available
                </div>
              )}
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'resources',
      label: 'RESOURCE USAGE',
      children: (
        <Row gutter={16}>
          <Col span={8}>
            <Card className="detail-card">
              <Statistic
                title={<span style={{ color: 'var(--text-primary)' }}>CPU Usage</span>}
                value={loadGenerator.cpu_usage || 0}
                suffix="%"
                valueStyle={{ 
                  color: (loadGenerator.cpu_usage || 0) > 80 ? '#ff4d4f' : '#52c41a',
                  fontSize: '24px',
                  fontWeight: 600
                }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card className="detail-card">
              <Statistic
                title={<span style={{ color: 'var(--text-primary)' }}>Memory Usage</span>}
                value={loadGenerator.memory_usage || 0}
                suffix="%"
                valueStyle={{ 
                  color: (loadGenerator.memory_usage || 0) > 80 ? '#ff4d4f' : '#52c41a',
                  fontSize: '24px',
                  fontWeight: 600
                }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card className="detail-card">
              <Statistic
                title={<span style={{ color: 'var(--text-primary)' }}>Network Usage</span>}
                value={loadGenerator.network_usage || 0}
                suffix="%"
                valueStyle={{ 
                  color: (loadGenerator.network_usage || 0) > 80 ? '#ff4d4f' : '#52c41a',
                  fontSize: '24px',
                  fontWeight: 600
                }}
              />
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'configs',
      label: 'CONFIGURATION MANAGEMENT',
      children: (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={handleAddConfig}
              className="detail-button-primary"
              style={{ marginRight: '8px' }}
            >
              ADD CONFIG
            </Button>
            <Button 
              icon={<ReloadOutlined />}
              onClick={fetchConfigs}
              className="detail-button-secondary"
            >
              REFRESH
            </Button>
          </div>
          <Table
            columns={configColumns}
            dataSource={configs}
            rowKey="id"
            pagination={false}
            className="detail-table"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="detail-page-container">
      <div className="detail-page-header">
        <Space style={{ marginBottom: '16px' }}>
          <Button 
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/load-generators')}
            className="detail-button-secondary"
          >
            BACK
          </Button>
          <h1 className="detail-page-title">
            {loadGenerator.name}
          </h1>
          {getStatusTag(loadGenerator.status)}
        </Space>
        <div>
          <Button 
            type="primary"
            icon={<ReloadOutlined />}
            onClick={handleTestConnection}
            className="detail-button-primary"
          >
            TEST CONNECTION
          </Button>
        </div>
      </div>

      <div className="detail-page-content">
        <Tabs 
          items={tabItems} 
          className="detail-tabs"
        />
      </div>

      {/* Configuration Modal */}
      <Modal
        title={editingConfig ? 'Edit Configuration' : 'Add Configuration'}
        open={configModalVisible}
        onCancel={() => setConfigModalVisible(false)}
        onOk={() => form.submit()}
        width={800}
        className="detail-modal"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleConfigSubmit}
          className="detail-form"
        >
          <Form.Item
            name="config_name"
            label="Configuration Name"
            rules={[{ required: true, message: 'Please enter configuration name' }]}
          >
            <Input placeholder="Enter configuration name" />
          </Form.Item>

          <div className="form-section">
            <h3 style={{ color: 'var(--text-primary)' }}>Master Configuration</h3>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="master_enabled"
                  label="Enable Master"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="master_cpu_cores"
                  label="CPU Cores"
                  rules={[{ required: true, message: 'Please enter CPU cores' }]}
                >
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="master_memory_gb"
                  label="Memory (GB)"
                  rules={[{ required: true, message: 'Please enter memory size' }]}
                >
                  <InputNumber min={1} step={0.1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div className="form-section">
            <h3 style={{ color: 'var(--text-primary)' }}>Worker Configuration</h3>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="worker_count"
                  label="Worker Count"
                  rules={[{ required: true, message: 'Please enter worker count' }]}
                >
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="worker_cpu_cores"
                  label="CPU Cores per Worker"
                  rules={[{ required: true, message: 'Please enter CPU cores' }]}
                >
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="worker_memory_gb"
                  label="Memory (GB) per Worker"
                  rules={[{ required: true, message: 'Please enter memory size' }]}
                >
                  <InputNumber min={1} step={0.1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div className="form-section">
            <h3 style={{ color: 'var(--text-primary)' }}>System Reserved</h3>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="system_cpu_cores"
                  label="System Reserved CPU Cores"
                  rules={[{ required: true, message: 'Please enter system reserved CPU cores' }]}
                >
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="system_memory_gb"
                  label="System Reserved Memory (GB)"
                  rules={[{ required: true, message: 'Please enter system reserved memory' }]}
                >
                  <InputNumber min={1} step={0.1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="system_network_mbps"
                  label="System Reserved Network Bandwidth (Mbps)"
                  rules={[{ required: true, message: 'Please enter system reserved network bandwidth' }]}
                >
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <Form.Item
            name="description"
            label="Configuration Description"
          >
            <Input.TextArea rows={3} placeholder="Enter configuration description" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

// 使用 React.memo 优化组件性能，避免不必要的重渲染
export default React.memo(LoadGeneratorDetail);
