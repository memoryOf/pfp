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
  Select,
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
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  ExperimentOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  RocketOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { testTaskService } from '../services/api';
import type { TestTask } from '../types/testTask';

const { Title } = Typography;

const TestTaskList: React.FC = () => {
  const [testTasks, setTestTasks] = useState<TestTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<TestTask | null>(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTestTasks();
  }, []);

  const fetchTestTasks = async () => {
    setLoading(true);
    try {
      const data = await testTaskService.getTestTasks();
      setTestTasks(data);
    } catch (error) {
      message.error('获取测试任务列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingTask(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: TestTask) => {
    setEditingTask(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await testTaskService.deleteTestTask(id);
      message.success('删除成功');
      fetchTestTasks();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleStart = async (id: number) => {
    try {
      await testTaskService.startTestTask(id);
      message.success('任务启动成功');
      fetchTestTasks();
    } catch (error) {
      message.error('任务启动失败');
    }
  };

  const handleStop = async (id: number) => {
    try {
      await testTaskService.stopTestTask(id);
      message.success('任务停止成功');
      fetchTestTasks();
    } catch (error) {
      message.error('任务停止失败');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingTask) {
        await testTaskService.updateTestTask(editingTask.id, values);
        message.success('更新成功');
      } else {
        await testTaskService.createTestTask(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      fetchTestTasks();
    } catch (error) {
      message.error(editingTask ? '更新失败' : '创建失败');
    }
  };

  const getStatusTag = (status: string) => {
    const statusMap = {
      draft: { color: 'default', text: '草稿' },
      running: { color: 'processing', text: '运行中' },
      completed: { color: 'success', text: '已完成' },
      failed: { color: 'error', text: '失败' },
      cancelled: { color: 'warning', text: '已取消' }
    };
    const config = statusMap[status as keyof typeof statusMap] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getStrategyTag = (strategy: string) => {
    const strategyMap = {
      single: { color: 'blue', text: '单次测试' },
      progressive: { color: 'green', text: '渐进测试' },
      adaptive: { color: 'purple', text: '自适应测试' }
    };
    const config = strategyMap[strategy as keyof typeof strategyMap] || { color: 'default', text: strategy };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: TestTask) => (
        <Button 
          type="link" 
          onClick={() => navigate(`/test-tasks/${record.id}`)}
        >
          {text}
        </Button>
      ),
    },
    {
      title: '目标主机',
      dataIndex: 'target_host',
      key: 'target_host',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '测试策略',
      dataIndex: 'test_strategy',
      key: 'test_strategy',
      render: (strategy: string) => getStrategyTag(strategy),
    },
    {
      title: '用户数',
      dataIndex: 'user_count',
      key: 'user_count',
    },
    {
      title: '生成速率',
      dataIndex: 'spawn_rate',
      key: 'spawn_rate',
    },
    {
      title: '运行时间',
      dataIndex: 'run_time',
      key: 'run_time',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: TestTask) => (
        <Space size="small">
          {record.status === 'draft' && (
            <Button 
              type="link" 
              icon={<PlayCircleOutlined />}
              onClick={() => handleStart(record.id)}
            >
              启动
            </Button>
          )}
          {record.status === 'running' && (
            <Button 
              type="link" 
              icon={<PauseCircleOutlined />}
              onClick={() => handleStop(record.id)}
            >
              停止
            </Button>
          )}
          <Button 
            type="link" 
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个测试任务吗？"
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
    total: testTasks.length,
    draft: testTasks.filter(t => t.status === 'draft').length,
    running: testTasks.filter(t => t.status === 'running').length,
    completed: testTasks.filter(t => t.status === 'completed').length,
    failed: testTasks.filter(t => t.status === 'failed').length,
  };

  return (
    <div style={{ background: 'var(--lol-dark)', minHeight: '100vh' }}>
      <div style={{ marginBottom: '32px' }}>
        <Title level={1} className="lol-title" style={{ marginBottom: '8px' }}>
          BOMBARDMENT CENTER
        </Title>
        <p style={{ color: 'var(--lol-text-secondary)', fontSize: '16px', margin: 0, fontFamily: 'Orbitron, sans-serif', letterSpacing: '1px' }}>
          CREATE AND MANAGE YOUR BOMBARDMENT MISSIONS
        </p>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="lol-card" style={{ background: 'var(--lol-gray)', border: '1px solid var(--lol-border)' }}>
            <Statistic
              title={<span style={{ color: 'var(--lol-text-secondary)', fontFamily: 'Orbitron, sans-serif', fontSize: '12px', letterSpacing: '1px' }}>TOTAL</span>}
              value={stats.total}
              prefix={<ExperimentOutlined style={{ color: 'var(--lol-primary)' }} />}
              valueStyle={{ color: 'var(--lol-text)', fontFamily: 'Orbitron, sans-serif', fontWeight: 900 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="lol-card" style={{ background: 'var(--lol-gray)', border: '1px solid var(--lol-border)' }}>
            <Statistic
              title={<span style={{ color: 'var(--lol-text-secondary)', fontFamily: 'Orbitron, sans-serif', fontSize: '12px', letterSpacing: '1px' }}>DRAFT</span>}
              value={stats.draft}
              valueStyle={{ color: 'var(--lol-text-secondary)', fontFamily: 'Orbitron, sans-serif', fontWeight: 900 }}
              prefix={<ClockCircleOutlined style={{ color: 'var(--lol-text-secondary)' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="lol-card" style={{ background: 'var(--lol-gray)', border: '1px solid var(--lol-border)' }}>
            <Statistic
              title={<span style={{ color: 'var(--lol-text-secondary)', fontFamily: 'Orbitron, sans-serif', fontSize: '12px', letterSpacing: '1px' }}>RUNNING</span>}
              value={stats.running}
              valueStyle={{ color: 'var(--lol-primary)', fontFamily: 'Orbitron, sans-serif', fontWeight: 900 }}
              prefix={<PlayCircleOutlined style={{ color: 'var(--lol-primary)' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="lol-card" style={{ background: 'var(--lol-gray)', border: '1px solid var(--lol-border)' }}>
            <Statistic
              title={<span style={{ color: 'var(--lol-text-secondary)', fontFamily: 'Orbitron, sans-serif', fontSize: '12px', letterSpacing: '1px' }}>COMPLETED</span>}
              value={stats.completed}
              valueStyle={{ color: 'var(--lol-accent)', fontFamily: 'Orbitron, sans-serif', fontWeight: 900 }}
              prefix={<CheckCircleOutlined style={{ color: 'var(--lol-accent)' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="lol-card" style={{ background: 'var(--lol-gray)', border: '1px solid var(--lol-border)' }}>
            <Statistic
              title={<span style={{ color: 'var(--lol-text-secondary)', fontFamily: 'Orbitron, sans-serif', fontSize: '12px', letterSpacing: '1px' }}>FAILED</span>}
              value={stats.failed}
              valueStyle={{ color: 'var(--lol-secondary)', fontFamily: 'Orbitron, sans-serif', fontWeight: 900 }}
              prefix={<CloseCircleOutlined style={{ color: 'var(--lol-secondary)' }} />}
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
            CREATE MISSION
          </Button>
          <Button 
            className="lol-button"
            icon={<ReloadOutlined />}
            onClick={fetchTestTasks}
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
            dataSource={testTasks}
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
        title={editingTask ? '编辑测试任务' : '创建测试任务'}
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
                label="任务名称"
                rules={[{ required: true, message: '请输入任务名称' }]}
              >
                <Input placeholder="请输入任务名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="target_host"
                label="目标主机"
                rules={[{ required: true, message: '请输入目标主机' }]}
              >
                <Input placeholder="如: http://example.com" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="任务描述"
          >
            <Input.TextArea rows={3} placeholder="请输入任务描述" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="user_count"
                label="用户数"
                rules={[{ required: true, message: '请输入用户数' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="spawn_rate"
                label="用户生成速率"
                rules={[{ required: true, message: '请输入用户生成速率' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="run_time"
                label="运行时间"
                rules={[{ required: true, message: '请输入运行时间' }]}
              >
                <Input placeholder="如: 5m, 1h" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="test_strategy"
            label="测试策略"
            rules={[{ required: true, message: '请选择测试策略' }]}
          >
            <Select placeholder="请选择测试策略">
              <Select.Option value="single">单次测试</Select.Option>
              <Select.Option value="progressive">渐进测试</Select.Option>
              <Select.Option value="adaptive">自适应测试</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TestTaskList;
