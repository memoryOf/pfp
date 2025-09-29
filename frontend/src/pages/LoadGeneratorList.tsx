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
  Statistic
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  ReloadOutlined,
  CloudServerOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { loadGeneratorService } from '../services/api';
import type { LoadGenerator } from '../types/loadGenerator';

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
      render: (_, record: LoadGenerator) => (
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
    <div className="page-container">
      <div className="page-header">
        <h1>压测机管理</h1>
        <p>管理性能测试的负载生成器</p>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总数量"
              value={stats.total}
              prefix={<CloudServerOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="在线"
              value={stats.online}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="离线"
              value={stats.offline}
              valueStyle={{ color: '#cf1322' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="维护中"
              value={stats.maintenance}
              valueStyle={{ color: '#d48806' }}
            />
          </Card>
        </Col>
      </Row>

      <div className="page-content">
        <div className="action-buttons">
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            添加压测机
          </Button>
          <Button 
            icon={<ReloadOutlined />}
            onClick={fetchLoadGenerators}
          >
            刷新
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={loadGenerators}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
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
