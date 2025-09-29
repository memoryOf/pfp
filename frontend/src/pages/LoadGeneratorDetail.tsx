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
  CloseCircleOutlined
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
      message.error('获取压测机详情失败');
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
      message.error('获取配置列表失败');
    }
  };

  const handleTestConnection = async () => {
    if (!id) return;
    try {
      const result = await loadGeneratorService.testConnection(parseInt(id));
      if (result.success) {
        message.success('连接测试成功');
        fetchLoadGenerator();
      } else {
        message.error(result.message);
      }
    } catch (error) {
      message.error('连接测试失败');
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
      message.success('删除成功');
      fetchConfigs();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleConfigSubmit = async (values: any) => {
    if (!id) return;
    try {
      if (editingConfig) {
        await loadGeneratorService.updateConfig(editingConfig.id, values);
        message.success('更新成功');
      } else {
        await loadGeneratorService.createConfig(parseInt(id), values);
        message.success('创建成功');
      }
      setConfigModalVisible(false);
      fetchConfigs();
    } catch (error) {
      message.error(editingConfig ? '更新失败' : '创建失败');
    }
  };

  const getStatusTag = (status: string) => {
    const statusMap = {
      online: { color: 'green', text: '在线' },
      offline: { color: 'red', text: '离线' },
      maintenance: { color: 'orange', text: '维护中' }
    };
    const config = statusMap[status as keyof typeof statusMap] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const configColumns = [
    {
      title: '配置名称',
      dataIndex: 'config_name',
      key: 'config_name',
    },
    {
      title: 'Master配置',
      key: 'master',
      render: (_: any, record: LoadGeneratorConfig) => (
        <div>
          <div>CPU: {record.master_cpu_cores}核</div>
          <div>内存: {record.master_memory_gb}GB</div>
        </div>
      ),
    },
    {
      title: 'Worker配置',
      key: 'worker',
      render: (_: any, record: LoadGeneratorConfig) => (
        <div>
          <div>数量: {record.worker_count}个</div>
          <div>CPU: {record.worker_cpu_cores}核/个</div>
          <div>内存: {record.worker_memory_gb}GB/个</div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_valid',
      key: 'is_valid',
      render: (isValid: boolean) => (
        <Tag color={isValid ? 'green' : 'red'}>
          {isValid ? '有效' : '无效'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: LoadGeneratorConfig) => (
        <Space size="small">
          <Button 
            type="link" 
            icon={<EditOutlined />}
            onClick={() => handleEditConfig(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个配置吗？"
            onConfirm={() => handleDeleteConfig(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (!loadGenerator) {
    return <div>加载中...</div>;
  }

  const tabItems = [
    {
      key: 'overview',
      label: '概览',
      children: (
        <Row gutter={16}>
          <Col span={8}>
            <Card title="基本信息">
              <div style={{ marginBottom: 16 }}>
                <strong>名称:</strong> {loadGenerator.name}
              </div>
              <div style={{ marginBottom: 16 }}>
                <strong>主机地址:</strong> {loadGenerator.host}:{loadGenerator.port}
              </div>
              <div style={{ marginBottom: 16 }}>
                <strong>用户名:</strong> {loadGenerator.username}
              </div>
              <div style={{ marginBottom: 16 }}>
                <strong>状态:</strong> {getStatusTag(loadGenerator.status)}
              </div>
              {loadGenerator.description && (
                <div>
                  <strong>描述:</strong> {loadGenerator.description}
                </div>
              )}
            </Card>
          </Col>
          <Col span={8}>
            <Card title="硬件配置">
              <div style={{ marginBottom: 16 }}>
                <strong>CPU核心:</strong> {loadGenerator.cpu_cores}核
              </div>
              <div style={{ marginBottom: 16 }}>
                <strong>内存:</strong> {loadGenerator.memory_gb}GB
              </div>
              {loadGenerator.network_bandwidth && (
                <div style={{ marginBottom: 16 }}>
                  <strong>网络带宽:</strong> {loadGenerator.network_bandwidth}
                </div>
              )}
              {loadGenerator.disk_space && (
                <div>
                  <strong>磁盘空间:</strong> {loadGenerator.disk_space}
                </div>
              )}
            </Card>
          </Col>
          <Col span={8}>
            <Card title="软件信息">
              {loadGenerator.python_version && (
                <div style={{ marginBottom: 16 }}>
                  <strong>Python版本:</strong> {loadGenerator.python_version}
                </div>
              )}
              {loadGenerator.locust_version && (
                <div style={{ marginBottom: 16 }}>
                  <strong>Locust版本:</strong> {loadGenerator.locust_version}
                </div>
              )}
              {loadGenerator.last_heartbeat && (
                <div>
                  <strong>最后心跳:</strong> {new Date(loadGenerator.last_heartbeat).toLocaleString()}
                </div>
              )}
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'resources',
      label: '资源使用',
      children: (
        <Row gutter={16}>
          <Col span={8}>
            <Card>
              <Statistic
                title="CPU使用率"
                value={loadGenerator.cpu_usage}
                suffix="%"
                valueStyle={{ color: loadGenerator.cpu_usage > 80 ? '#cf1322' : '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="内存使用率"
                value={loadGenerator.memory_usage}
                suffix="%"
                valueStyle={{ color: loadGenerator.memory_usage > 80 ? '#cf1322' : '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="网络使用率"
                value={loadGenerator.network_usage}
                suffix="%"
                valueStyle={{ color: loadGenerator.network_usage > 80 ? '#cf1322' : '#3f8600' }}
              />
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'configs',
      label: '配置管理',
      children: (
        <div>
          <div className="action-buttons">
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={handleAddConfig}
            >
              添加配置
            </Button>
            <Button 
              icon={<ReloadOutlined />}
              onClick={fetchConfigs}
            >
              刷新
            </Button>
          </div>
          <Table
            columns={configColumns}
            dataSource={configs}
            rowKey="id"
            pagination={false}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <Space>
          <Button 
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/load-generators')}
          >
            返回
          </Button>
          <h1>{loadGenerator.name}</h1>
          {getStatusTag(loadGenerator.status)}
        </Space>
        <div style={{ marginTop: 16 }}>
          <Button 
            type="primary"
            icon={<ReloadOutlined />}
            onClick={handleTestConnection}
          >
            测试连接
          </Button>
        </div>
      </div>

      <div className="page-content">
        <Tabs items={tabItems} />
      </div>

      {/* 配置模态框 */}
      <Modal
        title={editingConfig ? '编辑配置' : '添加配置'}
        open={configModalVisible}
        onCancel={() => setConfigModalVisible(false)}
        onOk={() => form.submit()}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleConfigSubmit}
        >
          <Form.Item
            name="config_name"
            label="配置名称"
            rules={[{ required: true, message: '请输入配置名称' }]}
          >
            <Input placeholder="请输入配置名称" />
          </Form.Item>

          <div className="form-section">
            <h3>Master配置</h3>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="master_enabled"
                  label="启用Master"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="master_cpu_cores"
                  label="CPU核心数"
                  rules={[{ required: true, message: '请输入CPU核心数' }]}
                >
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="master_memory_gb"
                  label="内存(GB)"
                  rules={[{ required: true, message: '请输入内存大小' }]}
                >
                  <InputNumber min={1} step={0.1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div className="form-section">
            <h3>Worker配置</h3>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="worker_count"
                  label="Worker数量"
                  rules={[{ required: true, message: '请输入Worker数量' }]}
                >
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="worker_cpu_cores"
                  label="每个Worker CPU核心数"
                  rules={[{ required: true, message: '请输入CPU核心数' }]}
                >
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="worker_memory_gb"
                  label="每个Worker 内存(GB)"
                  rules={[{ required: true, message: '请输入内存大小' }]}
                >
                  <InputNumber min={1} step={0.1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div className="form-section">
            <h3>系统预留</h3>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="system_cpu_cores"
                  label="系统预留CPU核心数"
                  rules={[{ required: true, message: '请输入系统预留CPU核心数' }]}
                >
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="system_memory_gb"
                  label="系统预留内存(GB)"
                  rules={[{ required: true, message: '请输入系统预留内存' }]}
                >
                  <InputNumber min={1} step={0.1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="system_network_mbps"
                  label="系统预留网络带宽(Mbps)"
                  rules={[{ required: true, message: '请输入系统预留网络带宽' }]}
                >
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <Form.Item
            name="description"
            label="配置说明"
          >
            <Input.TextArea rows={3} placeholder="请输入配置说明" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LoadGeneratorDetail;
