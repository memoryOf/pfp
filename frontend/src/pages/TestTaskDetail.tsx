import React, { useState, useEffect } from 'react';
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
  Progress
} from 'antd';
import { 
  ArrowLeftOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  ExperimentOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
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

interface TestExecution {
  id: number;
  task_id: number;
  execution_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  user_count: number;
  spawn_rate: number;
  run_time: string;
  total_requests: number;
  total_failures: number;
  avg_response_time: number;
  max_response_time: number;
  min_response_time: number;
  requests_per_second: number;
  error_rate: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

const TestTaskDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [testTask, setTestTask] = useState<TestTask | null>(null);
  const [executions, setExecutions] = useState<TestExecution[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTestTask();
      fetchExecutions();
    }
  }, [id]);

  const fetchTestTask = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await testTaskService.getTestTask(parseInt(id));
      setTestTask(data);
    } catch (error) {
      message.error('获取测试任务详情失败');
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
      message.error('获取执行记录失败');
    }
  };

  const handleStart = async () => {
    if (!id) return;
    try {
      await testTaskService.startTestTask(parseInt(id));
      message.success('任务启动成功');
      fetchTestTask();
    } catch (error) {
      message.error('任务启动失败');
    }
  };

  const handleStop = async () => {
    if (!id) return;
    try {
      await testTaskService.stopTestTask(parseInt(id));
      message.success('任务停止成功');
      fetchTestTask();
    } catch (error) {
      message.error('任务停止失败');
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

  const executionColumns = [
    {
      title: '执行名称',
      dataIndex: 'execution_name',
      key: 'execution_name',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '用户数',
      dataIndex: 'user_count',
      key: 'user_count',
    },
    {
      title: '总请求数',
      dataIndex: 'total_requests',
      key: 'total_requests',
    },
    {
      title: '失败数',
      dataIndex: 'total_failures',
      key: 'total_failures',
    },
    {
      title: '平均响应时间(ms)',
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
      title: '错误率',
      dataIndex: 'error_rate',
      key: 'error_rate',
      render: (rate: number) => `${(rate * 100).toFixed(2)}%`,
    },
    {
      title: '开始时间',
      dataIndex: 'started_at',
      key: 'started_at',
      render: (date: string) => date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: '完成时间',
      dataIndex: 'completed_at',
      key: 'completed_at',
      render: (date: string) => date ? new Date(date).toLocaleString() : '-',
    },
  ];

  if (!testTask) {
    return <div>加载中...</div>;
  }

  const latestExecution = executions[0];
  const successRate = latestExecution ? 
    ((latestExecution.total_requests - latestExecution.total_failures) / latestExecution.total_requests * 100) : 0;

  const tabItems = [
    {
      key: 'overview',
      label: '概览',
      children: (
        <Row gutter={16}>
          <Col span={8}>
            <Card title="基本信息">
              <div style={{ marginBottom: 16 }}>
                <strong>任务名称:</strong> {testTask.name}
              </div>
              <div style={{ marginBottom: 16 }}>
                <strong>目标主机:</strong> {testTask.target_host}
              </div>
              <div style={{ marginBottom: 16 }}>
                <strong>状态:</strong> {getStatusTag(testTask.status)}
              </div>
              <div style={{ marginBottom: 16 }}>
                <strong>测试策略:</strong> {getStrategyTag(testTask.test_strategy)}
              </div>
              {testTask.description && (
                <div>
                  <strong>描述:</strong> {testTask.description}
                </div>
              )}
            </Card>
          </Col>
          <Col span={8}>
            <Card title="测试配置">
              <div style={{ marginBottom: 16 }}>
                <strong>用户数:</strong> {testTask.user_count}
              </div>
              <div style={{ marginBottom: 16 }}>
                <strong>生成速率:</strong> {testTask.spawn_rate}/秒
              </div>
              <div style={{ marginBottom: 16 }}>
                <strong>运行时间:</strong> {testTask.run_time}
              </div>
              <div>
                <strong>创建时间:</strong> {new Date(testTask.created_at).toLocaleString()}
              </div>
            </Card>
          </Col>
          <Col span={8}>
            <Card title="最新执行结果">
              {latestExecution ? (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <strong>总请求数:</strong> {latestExecution.total_requests}
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <strong>失败数:</strong> {latestExecution.total_failures}
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <strong>平均响应时间:</strong> {latestExecution.avg_response_time.toFixed(2)}ms
                  </div>
                  <div>
                    <strong>RPS:</strong> {latestExecution.requests_per_second.toFixed(2)}
                  </div>
                </>
              ) : (
                <div>暂无执行记录</div>
              )}
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'metrics',
      label: '性能指标',
      children: latestExecution ? (
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总请求数"
                value={latestExecution.total_requests}
                prefix={<ExperimentOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="成功率"
                value={successRate}
                suffix="%"
                valueStyle={{ color: successRate > 95 ? '#3f8600' : '#cf1322' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="平均响应时间"
                value={latestExecution.avg_response_time}
                suffix="ms"
                valueStyle={{ color: latestExecution.avg_response_time < 1000 ? '#3f8600' : '#cf1322' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="RPS"
                value={latestExecution.requests_per_second}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
        </Row>
      ) : (
        <div>暂无性能指标数据</div>
      ),
    },
    {
      key: 'executions',
      label: '执行记录',
      children: (
        <div>
          <div className="action-buttons">
            <Button 
              icon={<ReloadOutlined />}
              onClick={fetchExecutions}
            >
              刷新
            </Button>
          </div>
          <Table
            columns={executionColumns}
            dataSource={executions}
            rowKey="id"
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
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
            onClick={() => navigate('/test-tasks')}
          >
            返回
          </Button>
          <h1>{testTask.name}</h1>
          {getStatusTag(testTask.status)}
        </Space>
        <div style={{ marginTop: 16 }}>
          <Space>
            {testTask.status === 'draft' && (
              <Button 
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={handleStart}
              >
                启动任务
              </Button>
            )}
            {testTask.status === 'running' && (
              <Button 
                type="primary"
                danger
                icon={<PauseCircleOutlined />}
                onClick={handleStop}
              >
                停止任务
              </Button>
            )}
            <Button 
              icon={<ReloadOutlined />}
              onClick={fetchTestTask}
            >
              刷新
            </Button>
          </Space>
        </div>
      </div>

      <div className="page-content">
        <Tabs items={tabItems} />
      </div>
    </div>
  );
};

export default TestTaskDetail;
