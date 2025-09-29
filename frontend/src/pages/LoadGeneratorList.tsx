import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  Tag, 
  Modal, 
  Form, 
  Input, 
  InputNumber, 
  message,
  Popconfirm,
  Card,
  Row,
  Col,
  Statistic,
  Typography
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  ReloadOutlined,
  CloudServerOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  RocketOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { loadGeneratorService } from '../services/api';
import type { LoadGenerator } from '../types/loadGenerator';

const { Title } = Typography;

const LoadGeneratorList: React.FC = () => {
  const [loadGenerators, setLoadGenerators] = useState<LoadGenerator[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGenerator, setEditingGenerator] = useState<LoadGenerator | null>(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    fetchLoadGenerators();
  }, []);

  const fetchLoadGenerators = async () => {
    setLoading(true);
    try {
      const data = await loadGeneratorService.getLoadGenerators();
      setLoadGenerators(data);
    } catch (error) {
      message.error('获取压测机列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingGenerator(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: LoadGenerator) => {
    setEditingGenerator(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await loadGeneratorService.deleteLoadGenerator(id);
      message.success('删除成功');
      fetchLoadGenerators();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleTestConnection = async (id: number) => {
    try {
      const result = await loadGeneratorService.testConnection(id);
      if (result.success) {
        message.success('连接测试成功');
        fetchLoadGenerators();
      } else {
        message.error(result.message);
      }
    } catch (error) {
      message.error('连接测试失败');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingGenerator) {
        await loadGeneratorService.updateLoadGenerator(editingGenerator.id, values);
        message.success('更新成功');
      } else {
        await loadGeneratorService.createLoadGenerator(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      fetchLoadGenerators();
    } catch (error) {
      message.error(editingGenerator ? '更新失败' : '创建失败');
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

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: LoadGenerator) => (
        <Button 
          type="link" 
          onClick={() => navigate(`/load-generators/${record.id}`)}
        >
          {text}
        </Button>
      ),
    },
    {
      title: '主机地址',
      dataIndex: 'host',
      key: 'host',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'CPU核心',
      dataIndex: 'cpu_cores',
      key: 'cpu_cores',
    },
    {
      title: '内存(GB)',
      dataIndex: 'memory_gb',
      key: 'memory_gb',
    },
    {
      title: 'CPU使用率',
      dataIndex: 'cpu_usage',
      key: 'cpu_usage',
      render: (usage: number) => `${usage.toFixed(1)}%`,
    },
    {
      title: '内存使用率',
      dataIndex: 'memory_usage',
      key: 'memory_usage',
      render: (usage: number) => `${usage.toFixed(1)}%`,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: LoadGenerator) => (
        <Space size="small">
          <Button 
            type="link" 
            icon={<ReloadOutlined />}
            onClick={() => handleTestConnection(record.id)}
          >
            测试连接
          </Button>
          <Button 
            type="link" 
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个压测机吗？"
            onConfirm={() => handleDelete(record.id)}
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

  // 统计数据
  const stats = {
    total: loadGenerators.length,
    online: loadGenerators.filter(g => g.status === 'online').length,
    offline: loadGenerators.filter(g => g.status === 'offline').length,
    maintenance: loadGenerators.filter(g => g.status === 'maintenance').length,
  };

  return (
    <div style={{ background: 'var(--lol-dark)', minHeight: '100vh' }}>
      <div style={{ marginBottom: '32px' }}>
        <Title level={1} className="lol-title" style={{ marginBottom: '8px' }}>
          LOAD GENERATORS
        </Title>
        <p style={{ color: 'var(--lol-text-secondary)', fontSize: '16px', margin: 0, fontFamily: 'Orbitron, sans-serif', letterSpacing: '1px' }}>
          CONFIGURE YOUR LOAD GENERATOR ARMY FOR BOMBARDMENT
        </p>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="lol-card" style={{ background: 'var(--lol-gray)', border: '1px solid var(--lol-border)' }}>
            <Statistic
              title={<span style={{ color: 'var(--lol-text-secondary)', fontFamily: 'Orbitron, sans-serif', fontSize: '12px', letterSpacing: '1px' }}>TOTAL</span>}
              value={stats.total}
              prefix={<CloudServerOutlined style={{ color: 'var(--lol-primary)' }} />}
              valueStyle={{ color: 'var(--lol-text)', fontFamily: 'Orbitron, sans-serif', fontWeight: 900 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="lol-card" style={{ background: 'var(--lol-gray)', border: '1px solid var(--lol-border)' }}>
            <Statistic
              title={<span style={{ color: 'var(--lol-text-secondary)', fontFamily: 'Orbitron, sans-serif', fontSize: '12px', letterSpacing: '1px' }}>ONLINE</span>}
              value={stats.online}
              valueStyle={{ color: 'var(--lol-primary)', fontFamily: 'Orbitron, sans-serif', fontWeight: 900 }}
              prefix={<CheckCircleOutlined style={{ color: 'var(--lol-primary)' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="lol-card" style={{ background: 'var(--lol-gray)', border: '1px solid var(--lol-border)' }}>
            <Statistic
              title={<span style={{ color: 'var(--lol-text-secondary)', fontFamily: 'Orbitron, sans-serif', fontSize: '12px', letterSpacing: '1px' }}>OFFLINE</span>}
              value={stats.offline}
              valueStyle={{ color: 'var(--lol-secondary)', fontFamily: 'Orbitron, sans-serif', fontWeight: 900 }}
              prefix={<CloseCircleOutlined style={{ color: 'var(--lol-secondary)' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="lol-card" style={{ background: 'var(--lol-gray)', border: '1px solid var(--lol-border)' }}>
            <Statistic
              title={<span style={{ color: 'var(--lol-text-secondary)', fontFamily: 'Orbitron, sans-serif', fontSize: '12px', letterSpacing: '1px' }}>MAINTENANCE</span>}
              value={stats.maintenance}
              valueStyle={{ color: 'var(--lol-accent)', fontFamily: 'Orbitron, sans-serif', fontWeight: 900 }}
              prefix={<RocketOutlined style={{ color: 'var(--lol-accent)' }} />}
            />
          </Card>
        </Col>
      </Row>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <Button 
            className="lol-button"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            size="large"
          >
            ADD UNIT
          </Button>
          <Button 
            className="lol-button"
            icon={<ReloadOutlined />}
            onClick={fetchLoadGenerators}
            size="large"
          >
            REFRESH
          </Button>
        </div>

        <Card 
          className="lol-card"
          style={{ background: 'var(--lol-gray)', border: '1px solid var(--lol-border)' }}
        >
          <Table
            columns={columns}
            dataSource={loadGenerators}
            rowKey="id"
            loading={loading}
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `TOTAL ${total} RECORDS`,
            }}
            style={{ 
              background: 'var(--lol-gray)',
              color: 'var(--lol-text)'
            }}
            className="lol-table"
          />
        </Card>
      </div>

      {/* 添加/编辑模态框 */}
      <Modal
        title={editingGenerator ? '编辑压测机' : '添加压测机'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="压测机名称"
                rules={[{ required: true, message: '请输入压测机名称' }]}
              >
                <Input placeholder="请输入压测机名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="host"
                label="主机地址"
                rules={[{ required: true, message: '请输入主机地址' }]}
              >
                <Input placeholder="请输入主机地址" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="port"
                label="SSH端口"
                rules={[{ required: true, message: '请输入SSH端口' }]}
              >
                <InputNumber min={1} max={65535} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="username"
                label="用户名"
                rules={[{ required: true, message: '请输入用户名' }]}
              >
                <Input placeholder="请输入用户名" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="password"
                label="密码"
              >
                <Input.Password placeholder="请输入密码" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="cpu_cores"
                label="CPU核心数"
                rules={[{ required: true, message: '请输入CPU核心数' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="memory_gb"
                label="内存大小(GB)"
                rules={[{ required: true, message: '请输入内存大小' }]}
              >
                <InputNumber min={1} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="network_bandwidth"
                label="网络带宽"
              >
                <Input placeholder="如: 1Gbps" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="备注说明"
          >
            <Input.TextArea rows={3} placeholder="请输入备注说明" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LoadGeneratorList;
