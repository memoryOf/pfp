import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Button, Typography } from 'antd';
import { 
  CloudServerOutlined, 
  ExperimentOutlined, 
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  RocketOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { loadGeneratorService } from '../services/api';
import type { LoadGenerator } from '../types/loadGenerator';

const { Title } = Typography;

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
    <div style={{ background: 'var(--lol-dark)', minHeight: '100vh' }}>
      <div style={{ marginBottom: '32px' }}>
        <Title level={1} className="lol-title" style={{ marginBottom: '8px' }}>
          COMMAND CENTER
        </Title>
        <p style={{ color: 'var(--lol-text-secondary)', fontSize: '16px', margin: 0, fontFamily: 'Cinzel, sans-serif', letterSpacing: '1px' }}>
          SYSTEM STATUS: READY FOR BOMBARDMENT
        </p>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="lol-card" style={{ background: 'var(--lol-gray)', border: '1px solid var(--lol-border)' }}>
            <Statistic
              title={<span style={{ color: 'var(--lol-text-secondary)', fontFamily: 'Orbitron, sans-serif', fontSize: '12px', letterSpacing: '1px' }}>TOTAL UNITS</span>}
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
              prefix={<ThunderboltOutlined style={{ color: 'var(--lol-accent)' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* 最近压测机 */}
        <Col xs={24} lg={16}>
          <Card 
            className="lol-card"
            style={{ background: 'var(--lol-gray)', border: '1px solid var(--lol-border)' }}
            title={<span style={{ color: 'var(--lol-text)', fontFamily: 'Orbitron, sans-serif', letterSpacing: '1px' }}>LOAD GENERATORS</span>}
            extra={
              <Button 
                type="link" 
                onClick={() => navigate('/load-generators')}
                style={{ color: 'var(--lol-primary)' }}
              >
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
        <Col xs={24} lg={8}>
          <Card 
            className="lol-card"
            style={{ background: 'var(--lol-gray)', border: '1px solid var(--lol-border)' }}
            title={<span style={{ color: 'var(--lol-text)', fontFamily: 'Orbitron, sans-serif', letterSpacing: '1px' }}>QUICK ACTIONS</span>}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Button 
                className="lol-button"
                icon={<CloudServerOutlined />}
                onClick={() => navigate('/load-generators')}
                block
                size="large"
              >
                MANAGE UNITS
              </Button>
              <Button 
                className="lol-button"
                icon={<ExperimentOutlined />}
                onClick={() => navigate('/test-tasks')}
                block
                size="large"
              >
                CREATE MISSION
              </Button>
              <Button 
                className="lol-button"
                icon={<RocketOutlined />}
                onClick={() => navigate('/test-tasks')}
                block
                size="large"
              >
                START BOMBARDMENT
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
