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
  Statistic
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
  ClockCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { testTaskService } from '../services/api';

interface TestTask {
  id: number;
  name: string;
  description?: string;
  status: 'draft' | 'running' | 'completed' | 'failed' | 'cancelled';
  target_host: string;
  user_count: number;
  spawn_rate: number;
  run_time: string;
  test_strategy: 'single' | 'progressive' | 'adaptive';
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
}

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
      render: (_, record: TestTask) => (
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
    <div className="page-container">
      <div className="page-header">
        <h1>测试任务管理</h1>
        <p>管理性能测试任务</p>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={5}>
          <Card>
            <Statistic
              title="总任务数"
              value={stats.total}
              prefix={<ExperimentOutlined />}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card>
            <Statistic
              title="草稿"
              value={stats.draft}
              valueStyle={{ color: '#666' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card>
            <Statistic
              title="运行中"
              value={stats.running}
              valueStyle={{ color: '#1890ff' }}
              prefix={<PlayCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card>
            <Statistic
              title="已完成"
              value={stats.completed}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="失败"
              value={stats.failed}
              valueStyle={{ color: '#cf1322' }}
              prefix={<CloseCircleOutlined />}
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
            创建测试任务
          </Button>
          <Button 
            icon={<ReloadOutlined />}
            onClick={fetchTestTasks}
          >
            刷新
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={testTasks}
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
