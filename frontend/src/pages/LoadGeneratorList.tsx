import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  ConsoleSqlOutlined,
  RocketOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { loadGeneratorService, heartbeatService } from '../services/api';
import type { LoadGenerator } from '../types/loadGenerator';

const { Title } = Typography;

const LoadGeneratorList: React.FC = () => {
  const [loadGenerators, setLoadGenerators] = useState<LoadGenerator[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGenerator, setEditingGenerator] = useState<LoadGenerator | null>(null);
  const [form] = Form.useForm();
  const [terminalModalVisible, setTerminalModalVisible] = useState(false);
  const [currentConnection, setCurrentConnection] = useState<{host: string, port: number, username: string} | null>(null);

  const navigate = useNavigate();

  const fetchLoadGenerators = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadGeneratorService.getLoadGenerators();
      setLoadGenerators(data);
    } catch (error) {
      message.error('Failed to fetch load generators');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLoadGenerators();
  }, [fetchLoadGenerators]);

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
      message.success('Delete successful');
      fetchLoadGenerators();
    } catch (error) {
      message.error('Delete failed');
    }
  };

  const handleTestConnection = async (id: number) => {
    try {
      const result = await loadGeneratorService.testConnection(id);
      if (result.success) {
        message.success('Connection test successful');
        fetchLoadGenerators();
      } else {
        message.error(result.message);
      }
    } catch (error) {
      message.error('Connection test failed');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingGenerator) {
        await loadGeneratorService.updateLoadGenerator(editingGenerator.id, values);
        message.success('Update successful');
      } else {
        await loadGeneratorService.createLoadGenerator(values);
        message.success('Create successful');
      }
      setModalVisible(false);
      fetchLoadGenerators();
    } catch (error) {
      message.error(editingGenerator ? 'Update failed' : 'Create failed');
    }
  };

  // 心跳检测处理函数
  const handleHeartbeatCheck = async () => {
    try {
      const result = await heartbeatService.checkAllHeartbeats();
      message.success(`Heartbeat check completed: ${result.successful} online, ${result.failed} offline`);
      // 刷新列表以显示最新状态
      fetchLoadGenerators();
    } catch (error) {
      message.error('Heartbeat check failed');
    }
  };

  // 打开Shell终端
  const handleOpenShell = async (record: LoadGenerator) => {
    try {
      // 构建SSH连接命令
      const sshCommand = `ssh ${record.username}@${record.host} -p ${record.port}`;
      
      // 检测操作系统
      const userAgent = navigator.userAgent.toLowerCase();
      
      // 检查是否支持Web Share API
      if (navigator.share) {
        try {
          await navigator.share({
            title: `SSH Connection to ${record.host}`,
            text: `Connect to ${record.host} via SSH`,
            url: `ssh://${record.username}@${record.host}:${record.port}`
          });
          message.success('SSH connection shared successfully!');
          return;
        } catch (shareError) {
          // Web Share失败，继续使用其他方法
          console.log('Web Share failed, using fallback method');
        }
      }
      
      if (userAgent.includes('mac')) {
        // macOS - 显示连接选项Modal
        setCurrentConnection({
          host: record.host,
          port: record.port,
          username: record.username
        });
        setTerminalModalVisible(true);
      } else if (userAgent.includes('win')) {
        // Windows - 创建批处理文件
        const batchContent = `@echo off
title SSH Connection to ${record.host}
echo.
echo ========================================
echo   SSH Connection to ${record.host}
echo ========================================
echo.
echo Host: ${record.host}
echo Port: ${record.port}
echo Username: ${record.username}
echo.
echo Command: ${sshCommand}
echo.
echo Press any key to connect...
pause >nul
echo.
echo Connecting...
start cmd /k "ssh ${record.username}@${record.host} -p ${record.port}"
`;
        
        const blob = new Blob([batchContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ssh_${record.host}.bat`;
        link.click();
        URL.revokeObjectURL(url);
        
        message.success('Batch file downloaded. Please run it to open SSH connection.');
      } else if (userAgent.includes('linux')) {
        // Linux - 创建shell脚本
        const shellScript = `#!/bin/bash

echo "========================================"
echo "  SSH Connection to ${record.host}"
echo "========================================"
echo ""
echo "Host: ${record.host}"
echo "Port: ${record.port}"
echo "Username: ${record.username}"
echo ""
echo "Command: ${sshCommand}"
echo ""

# Try different terminal emulators
if command -v gnome-terminal &> /dev/null; then
    echo "Opening with gnome-terminal..."
    gnome-terminal -- bash -c "echo 'Connecting to ${record.host}...'; ssh ${record.username}@${record.host} -p ${record.port}; exec bash"
elif command -v xterm &> /dev/null; then
    echo "Opening with xterm..."
    xterm -e "echo 'Connecting to ${record.host}...'; ssh ${record.username}@${record.host} -p ${record.port}; bash"
elif command -v konsole &> /dev/null; then
    echo "Opening with konsole..."
    konsole -e "echo 'Connecting to ${record.host}...'; ssh ${record.username}@${record.host} -p ${record.port}; bash"
elif command -v xfce4-terminal &> /dev/null; then
    echo "Opening with xfce4-terminal..."
    xfce4-terminal -e "echo 'Connecting to ${record.host}...'; ssh ${record.username}@${record.host} -p ${record.port}; bash"
else
    echo "No supported terminal emulator found."
    echo "Please install one of: gnome-terminal, xterm, konsole, xfce4-terminal"
    echo ""
    echo "Or manually run: ${sshCommand}"
    read -p "Press Enter to exit..."
fi
`;
        
        const blob = new Blob([shellScript], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ssh_${record.host}.sh`;
        link.click();
        URL.revokeObjectURL(url);
        
        message.success('Shell script downloaded. Please run it to open SSH connection.');
      } else {
        // 其他系统 - 显示连接信息并提供复制功能
        const copyToClipboard = async () => {
          try {
            await navigator.clipboard.writeText(sshCommand);
            message.success('SSH command copied to clipboard!');
          } catch (err) {
            message.error('Failed to copy to clipboard');
          }
        };
        
        message.info({
          content: (
            <div style={{ maxWidth: '500px' }}>
              <h4>SSH Connection Details</h4>
              <div style={{ 
                background: 'var(--bg-card)', 
                padding: '12px', 
                borderRadius: '6px',
                margin: '8px 0',
                border: '1px solid var(--border)'
              }}>
                <p><strong>Host:</strong> {record.host}</p>
                <p><strong>Port:</strong> {record.port}</p>
                <p><strong>Username:</strong> {record.username}</p>
                <p><strong>Command:</strong></p>
                <div style={{ position: 'relative' }}>
                  <code style={{ 
                    background: 'var(--bg-primary)', 
                    padding: '8px', 
                    borderRadius: '4px',
                    display: 'block',
                    margin: '8px 0',
                    wordBreak: 'break-all',
                    color: 'var(--text-primary)',
                    paddingRight: '60px'
                  }}>
                    {sshCommand}
                  </code>
                  <button
                    onClick={copyToClipboard}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'var(--primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>
              <p>Click "Copy" button or manually copy the command above and run it in your terminal.</p>
            </div>
          ),
          duration: 15
        });
      }
    } catch (error) {
      message.error('Failed to open terminal');
    }
  };

  // 使用 useCallback 优化渲染函数
  const getStatusTag = useCallback((status: string) => {
    const statusMap = {
      online: { 
        backgroundColor: '#52c41a', 
        color: 'white', 
        text: 'ONLINE' 
      },
      offline: { 
        backgroundColor: '#ff4d4f', 
        color: 'white', 
        text: 'OFFLINE' 
      },
      maintenance: { 
        backgroundColor: '#faad14', 
        color: 'white', 
        text: 'MAINTENANCE' 
      }
    };
    const config = statusMap[status as keyof typeof statusMap] || { 
      backgroundColor: '#d9d9d9', 
      color: 'white', 
      text: status 
    };
    
    return (
      <span style={{
        display: 'inline-block',
        padding: '4px 8px',
        borderRadius: '4px',
        backgroundColor: config.backgroundColor,
        color: config.color,
        fontSize: '12px',
        fontWeight: 500,
        textAlign: 'center',
        minWidth: '60px'
      }}>
        {config.text}
      </span>
    );
  }, []);

  const columns = [
    {
      title: 'NAME',
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
      title: 'HOST ADDRESS',
      dataIndex: 'host',
      key: 'host',
    },
    {
      title: 'STATUS',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'CPU CORES',
      dataIndex: 'cpu_cores',
      key: 'cpu_cores',
    },
    {
      title: 'MEMORY (GB)',
      dataIndex: 'memory_gb',
      key: 'memory_gb',
    },
    {
      title: 'ACTIONS',
      key: 'action',
      render: (_: any, record: LoadGenerator) => (
        <Space size="small">
          <Button 
            type="link" 
            icon={<ReloadOutlined />}
            onClick={() => handleTestConnection(record.id)}
          >
            TEST
          </Button>
          <Button 
            type="link" 
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            EDIT
          </Button>
          <Button 
            type="link" 
            icon={<ConsoleSqlOutlined />}
            onClick={() => handleOpenShell(record)}
            disabled={record.status !== 'online'}
          >
            OPENSHELL
          </Button>
          <Popconfirm
            title="Delete this load generator?"
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
              // 黄色圆形感叹号SVG，底部与文字底部对齐
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                style={{ 
                  display: 'inline-block', 
                  verticalAlign: 'baseline',
                  marginBottom: '2px' // 微调使图标底部与文字底部对齐
                }}
              >
                <circle cx="12" cy="12" r="10" fill="#faad14" />
                <rect x="11" y="6" width="2" height="8" rx="1" fill="#1a1a1a" />
                <circle cx="12" cy="17" r="1.5" fill="#1a1a1a" />
              </svg>
            }
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              DELETE
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
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <div style={{ marginBottom: '32px' }}>
        <Title level={1} className="modern-title" style={{ 
          marginBottom: '8px',
          color: 'var(--text-primary)',
          fontSize: '32px',
          fontWeight: 700
        }}>
          LOAD GENERATORS
        </Title>
        <p style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '16px', 
          margin: 0, 
          fontFamily: 'inherit',
          fontWeight: 500
        }}>
          CONFIGURE YOUR LOAD GENERATOR ARMY FOR BOMBARDMENT
        </p>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="modern-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <Statistic
              title={<span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>TOTAL</span>}
              value={stats.total}
              prefix={<CloudServerOutlined style={{ color: 'var(--primary)' }} />}
              valueStyle={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '24px' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="modern-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <Statistic
              title={<span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>ONLINE</span>}
              value={stats.online}
              valueStyle={{ color: 'var(--success)', fontWeight: 700, fontSize: '24px' }}
              prefix={<CheckCircleOutlined style={{ color: 'var(--success)' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="modern-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <Statistic
              title={<span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>OFFLINE</span>}
              value={stats.offline}
              valueStyle={{ color: 'var(--error)', fontWeight: 700, fontSize: '24px' }}
              prefix={<CloseCircleOutlined style={{ color: 'var(--error)' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="modern-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <Statistic
              title={<span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>MAINTENANCE</span>}
              value={stats.maintenance}
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
            ADD UNIT
          </Button>
          <Button 
            className="modern-button"
            icon={<CheckCircleOutlined />}
            onClick={handleHeartbeatCheck}
            size="large"
            style={{ background: 'var(--success)', borderColor: 'var(--success)', color: 'white' }}
          >
            CHECK HEARTBEAT
          </Button>
          <Button 
            className="modern-button"
            icon={<ReloadOutlined />}
            onClick={fetchLoadGenerators}
            size="large"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            REFRESH
          </Button>
        </div>

        <Card 
          className="modern-card"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
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
            style={{ 
              background: 'var(--bg-card)',
              color: 'var(--text-primary)'
            }}
            className="modern-table"
          />
        </Card>
      </div>

      {/* 添加/编辑模态框 - 自定义实现 */}
      {modalVisible && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(2px)'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '2px solid var(--primary)',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
            width: '600px',
            maxWidth: '90vw',
            maxHeight: '86vh',
            overflow: 'visible'
          }}>
            {/* 模态框头部 */}
            <div style={{
              padding: '16px 20px 12px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              borderRadius: '16px 16px 0 0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{
                margin: 0,
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: '18px'
              }}>
                {editingGenerator ? 'EDIT UNIT' : 'ADD UNIT'}
              </h3>
              <button
                onClick={() => setModalVisible(false)}
                style={{
                  background: 'var(--bg-hover)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontSize: '16px'
                }}
              >
                ×
              </button>
            </div>

            {/* 模态框内容 */}
            <div style={{ padding: '20px' }}>
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                size="small"
              >
                <Form.Item
                  name="name"
                  label={<span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>UNIT NAME</span>}
                  rules={[{ required: true, message: 'Please enter unit name' }]}
                >
                  <Input 
                    placeholder="Enter unit name" 
                      style={{ 
                        width: '100%',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        height: '36px'
                      }}
                  />
                </Form.Item>

                <Form.Item
                  name="host"
                  label={<span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>HOST ADDRESS</span>}
                  rules={[{ required: true, message: 'Please enter host address' }]}
                >
                  <Input 
                    placeholder="Enter host address" 
                      style={{ 
                        width: '100%',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        height: '36px'
                      }}
                  />
                </Form.Item>

                <Form.Item
                  name="port"
                  label={<span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>SSH PORT</span>}
                  rules={[{ required: true, message: 'Please enter SSH port' }]}
                >
                  <Input 
                    placeholder="22" 
                    defaultValue="22"
                      style={{ 
                        width: '100%',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        height: '36px'
                      }}
                  />
                </Form.Item>

                <Form.Item
                  name="username"
                  label={<span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>USERNAME</span>}
                  rules={[{ required: true, message: 'Please enter username' }]}
                >
                  <Input 
                    placeholder="Enter username" 
                      style={{ 
                        width: '100%',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        height: '36px'
                      }}
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  label={<span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>PASSWORD</span>}
                >
                  <Input.Password 
                    placeholder="Enter password" 
                    style={{ 
                      width: '100%', 
                      display: 'flex',
                      alignItems: 'center',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      borderRadius: '8px',
                      position: 'relative',
                      padding: '8px 12px',
                      height: '36px'
                    }}
                    styles={{
                      input: {
                        background: 'var(--bg-tertiary)',
                        border: 'none',
                        color: 'var(--text-primary)',
                        boxShadow: 'none',
                        outline: 'none',
                        flex: 1,
                        paddingRight: '40px'
                      },
                      suffix: {
                        color: 'var(--text-primary)',
                        background: 'transparent',
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 10
                      }
                    }}
                  />
                </Form.Item>

                <Form.Item
                  name="description"
                  label={<span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>DESCRIPTION</span>}
                >
                  <Input.TextArea 
                    rows={3} 
                    placeholder="Enter description" 
                    style={{ 
                      width: '100%',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      minHeight: '80px'
                    }} 
                  />
                </Form.Item>
              </Form>
            </div>

            {/* 模态框底部 */}
            <div style={{
              padding: '16px 20px 20px',
              borderTop: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              borderRadius: '0 0 16px 16px',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <Button 
                onClick={() => setModalVisible(false)} 
                style={{ 
                  background: 'var(--bg-card)', 
                  borderColor: 'var(--border)', 
                  color: 'var(--text-primary)' 
                }}
              >
                CANCEL
              </Button>
              <Button 
                type="primary" 
                loading={loading} 
                onClick={() => form.submit()} 
                style={{ 
                  background: 'var(--primary)', 
                  borderColor: 'var(--primary)', 
                  color: 'white' 
                }}
              >
                SAVE
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Terminal连接Modal */}
      {terminalModalVisible && currentConnection && (
        <Modal
          title={
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              color: 'var(--text-primary)',
              fontSize: '18px',
              fontWeight: 600
            }}>
              <ConsoleSqlOutlined style={{ color: 'var(--primary)' }} />
              macOS Terminal Connection
            </div>
          }
          open={terminalModalVisible}
          onCancel={() => setTerminalModalVisible(false)}
          footer={null}
          width={600}
          style={{ top: 50 }}
          styles={{
            body: {
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              padding: '24px'
            },
            header: {
              background: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border)',
              padding: '16px 24px'
            },
            mask: {
              backgroundColor: 'rgba(0, 0, 0, 0.6)'
            }
          }}
        >
          <div style={{ 
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)'
          }}>
            <p style={{ 
              margin: '0 0 20px 0', 
              fontSize: '14px',
              color: 'var(--text-secondary)',
              fontWeight: 500
            }}>
              Select connection method:
            </p>
            
            {/* 方法1: 直接SSH命令 */}
            <div style={{ 
              background: 'var(--bg-card)', 
              padding: '16px', 
              borderRadius: '12px',
              margin: '16px 0',
              border: '1px solid var(--border)'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                marginBottom: '12px'
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  1
                </div>
                <span style={{ 
                  fontSize: '14px', 
                  fontWeight: 600,
                  color: 'var(--text-primary)'
                }}>
                  Direct SSH Command
                </span>
              </div>
              
              <div style={{ position: 'relative' }}>
                <Input
                  value={`ssh ${currentConnection.username}@${currentConnection.host} -p ${currentConnection.port}`}
                  readOnly
                  style={{ 
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    borderRadius: '8px',
                    paddingRight: '80px',
                    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                    fontSize: '13px'
                  }}
                />
                <Button
                  type="primary"
                  size="small"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(`ssh ${currentConnection.username}@${currentConnection.host} -p ${currentConnection.port}`);
                      message.success('✅ SSH command copied to clipboard!');
                    } catch (err) {
                      message.error('❌ Copy failed');
                    }
                  }}
                  style={{
                    position: 'absolute',
                    right: '4px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'var(--primary)',
                    borderColor: 'var(--primary)',
                    fontSize: '12px',
                    height: '28px',
                    padding: '0 12px'
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>
            
            {/* 方法2: 自动启动Terminal */}
            <div style={{ 
              background: 'var(--bg-card)', 
              padding: '16px', 
              borderRadius: '12px',
              margin: '16px 0',
              border: '1px solid var(--border)'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                marginBottom: '12px'
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  2
                </div>
                <span style={{ 
                  fontSize: '14px', 
                  fontWeight: 600,
                  color: 'var(--text-primary)'
                }}>
                  Auto Launch Terminal
                </span>
              </div>
              
              <div style={{ position: 'relative' }}>
                <Input.TextArea
                  value={`osascript -e 'tell application "Terminal" to activate' -e 'tell application "Terminal" to do script "ssh ${currentConnection.username}@${currentConnection.host} -p ${currentConnection.port}"'`}
                  readOnly
                  rows={2}
                  style={{ 
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    borderRadius: '8px',
                    paddingRight: '80px',
                    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                    fontSize: '12px',
                    resize: 'none'
                  }}
                />
                <Button
                  type="primary"
                  size="small"
                  onClick={async () => {
                    try {
                      const command = `osascript -e 'tell application "Terminal" to activate' -e 'tell application "Terminal" to do script "ssh ${currentConnection.username}@${currentConnection.host} -p ${currentConnection.port}"'`;
                      await navigator.clipboard.writeText(command);
                      message.success('✅ AppleScript command copied to clipboard!');
                    } catch (err) {
                      message.error('❌ Copy failed');
                    }
                  }}
                  style={{
                    position: 'absolute',
                    right: '4px',
                    top: '8px',
                    background: 'var(--primary)',
                    borderColor: 'var(--primary)',
                    fontSize: '12px',
                    height: '28px',
                    padding: '0 12px'
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>
            
            {/* 方法3: 下载AppleScript文件 */}
            <div style={{ 
              background: 'var(--bg-card)', 
              padding: '16px', 
              borderRadius: '12px',
              margin: '16px 0',
              border: '1px solid var(--border)'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                marginBottom: '12px'
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  3
                </div>
                <span style={{ 
                  fontSize: '14px', 
                  fontWeight: 600,
                  color: 'var(--text-primary)'
                }}>
                  Download AppleScript File
                </span>
              </div>
              
              <Button
                type="primary"
                block
                onClick={() => {
                  const appleScript = `tell application "Terminal"
  activate
  do script "ssh ${currentConnection.username}@${currentConnection.host} -p ${currentConnection.port}"
end tell`;
                  
                  const blob = new Blob([appleScript], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `ssh_${currentConnection.host}.scpt`;
                  link.click();
                  URL.revokeObjectURL(url);
                  message.success('✅ AppleScript file downloaded!');
                }}
                style={{
                  background: 'var(--primary)',
                  borderColor: 'var(--primary)',
                  height: '40px',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                Download & Run
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// 使用 React.memo 优化组件性能，避免不必要的重渲染
export default React.memo(LoadGeneratorList);
