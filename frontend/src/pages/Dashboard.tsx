import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Button } from 'antd';
import { 
  CloudServerOutlined, 
  ExperimentOutlined, 
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { loadGeneratorService } from '../services/api';
import type { LoadGenerator } from '../types/loadGenerator';

const Dashboard: React.FC = () => {
  const [loadGenerators, setLoadGenerators] = useState<LoadGenerator[]>([]);
  const [loading, setLoading] = useState(false);
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
      console.error('获取压测机列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 统计数据
  const stats = {
    total: loadGenerators.length,
    online: loadGenerators.filter(g => g.status === 'online').length,
    offline: loadGenerators.filter(g => g.status === 'offline').length,
    maintenance: loadGenerators.filter(g => g.status === 'maintenance').length,
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

  const recentGenerators = loadGenerators.slice(0, 5);

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
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
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
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>仪表盘</h1>
        <p>性能测试平台总览</p>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="压测机总数"
              value={stats.total}
              prefix={<CloudServerOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="在线压测机"
              value={stats.online}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="离线压测机"
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

      <Row gutter={16}>
        {/* 最近压测机 */}
        <Col span={16}>
          <Card 
            title="最近压测机" 
            extra={
              <Button type="link" onClick={() => navigate('/load-generators')}>
                查看全部
              </Button>
            }
          >
            <Table
              columns={columns}
              dataSource={recentGenerators}
              rowKey="id"
              loading={loading}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        {/* 快速操作 */}
        <Col span={8}>
          <Card title="快速操作">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Button 
                type="primary" 
                icon={<CloudServerOutlined />}
                onClick={() => navigate('/load-generators')}
                block
              >
                管理压测机
              </Button>
              <Button 
                icon={<ExperimentOutlined />}
                onClick={() => navigate('/test-tasks')}
                block
              >
                创建测试任务
              </Button>
              <Button 
                icon={<PlayCircleOutlined />}
                onClick={() => navigate('/test-tasks')}
                block
              >
                查看测试历史
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
