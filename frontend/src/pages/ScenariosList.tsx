import React, { useState, useEffect, useCallback } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  Tag, 
  Modal, 
  Form, 
  Input, 
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
  ReloadOutlined,
  ExperimentOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  RocketOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { scenarioService } from '../services/api';
import type { Scenario } from '../types/scenario';

const { Title } = Typography;
const { Option } = Select;

const ScenariosList: React.FC = () => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const fetchScenarios = useCallback(async () => {
    setLoading(true);
    try {
      const data = await scenarioService.getScenarios();
      setScenarios(data);
    } catch (error) {
      message.error('Failed to fetch scenarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScenarios();
  }, [fetchScenarios]);

  const handleAdd = () => {
    setEditingScenario(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: Scenario) => {
    // 根据scenario类型跳转到对应的编辑页面
    if (record.scenario_type === 'locust') {
      navigate('/scenarios/locust/create', {
        state: {
          scenarioData: {
            name: record.name,
            description: record.description,
            scenario_type: record.scenario_type
          },
          scenarioId: record.id,
          isEdit: true
        }
      });
    } else if (record.scenario_type === 'jmeter') {
      // TODO: 实现JMeter编辑页面
      message.info('JMeter edit page coming soon!');
    } else if (record.scenario_type === 'gatling') {
      // TODO: 实现Gatling编辑页面
      message.info('Gatling edit page coming soon!');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await scenarioService.deleteScenario(id);
      message.success('Scenario deleted successfully');
      fetchScenarios();
    } catch (error) {
      message.error('Failed to delete scenario');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingScenario) {
        await scenarioService.updateScenario(editingScenario.id, values);
        message.success('Scenario updated successfully');
        setModalVisible(false);
        fetchScenarios();
      } else {
        // 先在后端创建scenario记录
        const createdScenario = await scenarioService.createScenario(values);
        message.success('Scenario created successfully');
        setModalVisible(false);
        
        // 根据scenario_type跳转到对应的创建页面
        const scenarioType = values.scenario_type;
        
        if (scenarioType === 'locust') {
          navigate('/scenarios/locust/create', { 
            state: { 
              scenarioData: values,
              scenarioId: createdScenario.id 
            } 
          });
        } else if (scenarioType === 'jmeter') {
          // TODO: 实现JMeter创建页面
          message.info('JMeter creation page coming soon!');
          fetchScenarios(); // 刷新列表显示新创建的记录
        } else if (scenarioType === 'gatling') {
          // TODO: 实现Gatling创建页面
          message.info('Gatling creation page coming soon!');
          fetchScenarios(); // 刷新列表显示新创建的记录
        }
      }
    } catch (error) {
      message.error('Failed to save scenario');
    }
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingScenario(null);
    form.resetFields();
  };

  const getScenarioTypeTag = (type: string) => {
    const typeMap = {
      locust: { color: 'green', text: 'Locust' },
      jmeter: { color: 'blue', text: 'JMeter' },
      gatling: { color: 'purple', text: 'Gatling' }
    };
    const config = typeMap[type as keyof typeof typeMap] || { color: 'default', text: type };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getStatusTag = (isActive: boolean) => {
    return isActive ? (
      <Tag color="green" icon={<CheckCircleOutlined />}>Active</Tag>
    ) : (
      <Tag color="red" icon={<CloseCircleOutlined />}>Inactive</Tag>
    );
  };

  const columns = [
    {
      title: 'Id',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: (a: Scenario, b: Scenario) => a.id - b.id,
    },
    {
      title: 'Scenario name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: Scenario, b: Scenario) => a.name.localeCompare(b.name),
      render: (text: string, record: Scenario) => (
        <span style={{ fontWeight: 500 }}>{text}</span>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: 'Type',
      dataIndex: 'scenario_type',
      key: 'scenario_type',
      width: 120,
      render: (type: string) => getScenarioTypeTag(type),
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean) => getStatusTag(isActive),
    },
    {
      title: 'Created at',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      sorter: (a: Scenario, b: Scenario) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: 'Updated at',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 180,
      sorter: (a: Scenario, b: Scenario) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: 'Actions',
      key: 'action',
      render: (_: any, record: Scenario) => (
        <Space size="small">
          <Button 
            type="link" 
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Delete this scenario?"
            onConfirm={() => handleDelete(record.id)}
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
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 统计数据
  const stats = {
    total: scenarios.length,
    active: scenarios.filter(s => s.is_active).length,
    inactive: scenarios.filter(s => !s.is_active).length,
    locust: scenarios.filter(s => s.scenario_type === 'locust').length,
    jmeter: scenarios.filter(s => s.scenario_type === 'jmeter').length,
    gatling: scenarios.filter(s => s.scenario_type === 'gatling').length,
  };

  return (
    <div style={{ 
      background: '#07070D', 
      height: 'calc(100vh - 48px)',
      overflow: 'auto',
      padding: '0'
    }}>
      <div style={{ marginBottom: '32px' }}>
        <Title level={1} className="modern-title" style={{ 
          marginBottom: '50px',
          color: 'var(--text-primary)',
          fontSize: '38px',
          fontWeight: 700,
          fontFamily: 'Proxima Nova, sans-serif'
        }}>
          Scenarios
        </Title>
        <p style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '18px', 
          margin: 0, 
          fontFamily: 'Proxima Nova, sans-serif',
          fontWeight: 700
        }}>
          Manage Your Test Scenarios For Different Load Testing Tools
        </p>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="modern-card" style={{ background: '#1A192A', border: '1px solid var(--border)' }}>
            <Statistic
              title={<span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>TOTAL</span>}
              value={stats.total}
              prefix={<ExperimentOutlined style={{ color: 'var(--primary)' }} />}
              valueStyle={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '24px' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="modern-card" style={{ background: '#1A192A', border: '1px solid var(--border)' }}>
            <Statistic
              title={<span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>ACTIVE</span>}
              value={stats.active}
              valueStyle={{ color: 'var(--success)', fontWeight: 700, fontSize: '24px' }}
              prefix={<CheckCircleOutlined style={{ color: 'var(--success)' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="modern-card" style={{ background: '#1A192A', border: '1px solid var(--border)' }}>
            <Statistic
              title={<span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>INACTIVE</span>}
              value={stats.inactive}
              valueStyle={{ color: 'var(--error)', fontWeight: 700, fontSize: '24px' }}
              prefix={<CloseCircleOutlined style={{ color: 'var(--error)' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="modern-card" style={{ background: '#1A192A', border: '1px solid var(--border)' }}>
            <Statistic
              title={<span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>TOOLS</span>}
              value={`${stats.locust + stats.jmeter + stats.gatling}`}
              valueStyle={{ color: 'var(--warning)', fontWeight: 700, fontSize: '24px' }}
              prefix={<RocketOutlined style={{ color: 'var(--warning)' }} />}
            />
          </Card>
        </Col>
      </Row>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <Button 
            className="modern-button"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            size="large"
            style={{ background: 'var(--primary)', borderColor: 'var(--primary)', color: 'white' }}
          >
            ADD SCENARIO
          </Button>
          <Button 
            className="modern-button"
            icon={<ReloadOutlined />}
            onClick={fetchScenarios}
            loading={loading}
            size="large"
            style={{ background: '#1A192A', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            REFRESH
          </Button>
        </div>

        <Card 
          className="modern-card"
          style={{ background: '#1A192A', border: '1px solid var(--border)' }}
        >
          <Table
            columns={columns}
            dataSource={scenarios}
            rowKey="id"
            loading={loading}
            className="scenarios-table"
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `TOTAL ${total} RECORDS`,
              pageSizeOptions: ['10', '20', '50', '100'],
              locale: {
                items_per_page: 'items/page',
                jump_to: 'Go to',
                jump_to_confirm: 'confirm',
                page: 'Page',
                prev_page: 'Previous Page',
                next_page: 'Next Page',
                prev_5: 'Previous 5 Pages',
                next_5: 'Next 5 Pages',
                prev_3: 'Previous 3 Pages',
                next_3: 'Next 3 Pages',
              }
            }}
            scroll={{ x: 1200 }}
          />
        </Card>
      </div>

      {/* 添加/编辑场景模态框 */}
      <Modal
        title={null}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        okText="Create"
        cancelText="Cancel"
        okButtonProps={{
          style: {
            background: 'var(--primary)',
            borderColor: 'var(--primary)',
            color: 'white',
            fontWeight: 600
          }
        }}
        cancelButtonProps={{
          style: {
            background: '#1A192A',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
            fontWeight: 500
          }
        }}
        style={{ top: 20 }}
        width={600}
        className="scenario-modal"
      >
        {/* 自定义标题 */}
        <div style={{ 
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--border)'
        }}>
          <h3 style={{ 
            color: 'var(--text-primary)', 
            fontSize: '18px', 
            fontWeight: 600,
            letterSpacing: '0.5px',
            margin: 0
          }}>
            {editingScenario ? 'EDIT SCENARIO' : 'ADD SCENARIO'}
          </h3>
        </div>

        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label={<span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Scenario Name</span>}
            rules={[{ required: true, message: 'Please input scenario name!' }]}
          >
            <Input 
              placeholder="Enter scenario name"
              style={{ 
                background: '#1A192A', 
                borderColor: 'var(--border)', 
                color: 'var(--text-primary)' 
              }}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label={<span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Description</span>}
          >
            <Input.TextArea 
              rows={3}
              placeholder="Enter scenario description"
              style={{ 
                background: '#1A192A', 
                borderColor: 'var(--border)', 
                color: 'var(--text-primary)' 
              }}
            />
          </Form.Item>

          <Form.Item
            name="scenario_type"
            label={<span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Scenario Type</span>}
            rules={[{ required: true, message: 'Please select scenario type!' }]}
          >
            <Select 
              placeholder="Select scenario type"
              className="scenario-select"
              dropdownClassName="scenario-select-dropdown"
            >
              <Option value="locust">Locust</Option>
              <Option value="jmeter">JMeter</Option>
              <Option value="gatling">Gatling</Option>
            </Select>
          </Form.Item>

          {editingScenario && (
            <Form.Item
              name="is_active"
              label={<span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Status</span>}
            >
              <Select 
                placeholder="Select status"
                className="scenario-select"
                dropdownClassName="scenario-select-dropdown"
              >
                <Option value={true}>Active</Option>
                <Option value={false}>Inactive</Option>
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default ScenariosList;
