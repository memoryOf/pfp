import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Typography
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { 
  testTaskService, 
  testStrategyService, 
  testExecutionService
} from '../services/api';
import { 
  TestTask, 
  TestStrategy, 
  TestExecution
} from '../types/testTask';

const { Title } = Typography;

const TestTaskManagement: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<TestTask[]>([]);
  const [strategies, setStrategies] = useState<TestStrategy[]>([]);
  const [executions, setExecutions] = useState<TestExecution[]>([]);
  
  // 模态框状态
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TestTask | null>(null);
  
  // 表单实例
  const [taskForm] = Form.useForm();

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tasksData, strategiesData, executionsData] = await Promise.all([
        testTaskService.getTestTasks(),
        testStrategyService.getTestStrategies(),
        testExecutionService.getTestExecutions()
      ]);
      
      setTasks(tasksData);
      setStrategies(strategiesData);
      setExecutions(executionsData);
    } catch (error) {
      message.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // 创建/更新测试任务
  const handleCreateTask = async (values: any) => {
    try {
      if (selectedTask) {
        // 更新任务
        await testTaskService.updateTestTask(selectedTask.id, values);
        message.success('Test task updated successfully');
      } else {
        // 创建任务
        await testTaskService.createTestTask(values);
        message.success('Test task created successfully');
      }
      setTaskModalVisible(false);
      taskForm.resetFields();
      setSelectedTask(null);
      loadData();
    } catch (error) {
      message.error(selectedTask ? 'Failed to update test task' : 'Failed to create test task');
    }
  };

  // 删除测试任务
  const handleDeleteTask = async (taskId: number) => {
    try {
      await testTaskService.deleteTestTask(taskId);
      message.success('Test task deleted successfully');
      loadData();
    } catch (error) {
      message.error('Failed to delete test task');
    }
  };

  // 表格列定义
  const taskColumns = [
    {
      title: 'Task Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: TestTask) => (
        <Button type="link" onClick={() => navigate(`/test-tasks/${record.id}`)}>
          {text}
        </Button>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => text || '-',
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: 'Actions',
      key: 'action',
      render: (_: any, record: TestTask) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setSelectedTask(record);
              taskForm.setFieldsValue(record);
              setTaskModalVisible(true);
            }}
          >
            Edit
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this test task?"
            onConfirm={() => handleDeleteTask(record.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];


  // 统计数据
  const stats = {
    totalTasks: tasks.length,
    totalStrategies: strategies.length,
    totalExecutions: executions.length,
    runningExecutions: executions.filter(e => e.status === 'running').length,
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Test Management</Title>
      
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Test Tasks"
              value={stats.totalTasks}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Test Strategies"
              value={stats.totalStrategies}
              prefix={<SettingOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Executions"
              value={stats.totalExecutions}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Running"
              value={stats.runningExecutions}
              prefix={<PlayCircleOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 主要内容 */}
      <Card>
        <div style={{ marginBottom: '16px' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setTaskModalVisible(true)}
          >
            Create Test Task
          </Button>
        </div>
        <Table
          columns={taskColumns}
          dataSource={tasks}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 创建/编辑测试任务模态框 */}
      <Modal
        title={selectedTask ? "Edit Test Task" : "Create Test Task"}
        open={taskModalVisible}
        onCancel={() => {
          setTaskModalVisible(false);
          taskForm.resetFields();
          setSelectedTask(null);
        }}
        footer={null}
        width={500}
      >
        <Form
          form={taskForm}
          layout="vertical"
          onFinish={handleCreateTask}
        >
          <Form.Item
            name="name"
            label="Task Name"
            rules={[{ required: true, message: 'Please enter task name' }]}
          >
            <Input placeholder="Enter task name" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="Task Description"
          >
            <Input.TextArea placeholder="Enter task description" rows={4} />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {selectedTask ? "Update" : "Create"}
              </Button>
              <Button onClick={() => {
                setTaskModalVisible(false);
                taskForm.resetFields();
                setSelectedTask(null);
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

    </div>
  );
};

export default TestTaskManagement;
