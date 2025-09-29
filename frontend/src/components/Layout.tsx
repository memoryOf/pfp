import React, { useState } from 'react';
import { Layout as AntLayout, Menu, Button, Avatar, Dropdown, Typography } from 'antd';
import { 
  DashboardOutlined, 
  CloudServerOutlined, 
  ExperimentOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  RocketOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const { Title } = Typography;

const { Header, Sider, Content } = AntLayout;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: 'COMMAND CENTER',
    },
    {
      key: '/load-generators',
      icon: <CloudServerOutlined />,
      label: 'LOAD GENERATORS',
    },
    {
      key: '/test-tasks',
      icon: <ExperimentOutlined />,
      label: 'BOMBARDMENT',
    },
  ];

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      // 处理退出登录
      console.log('退出登录');
    }
  };

  return (
    <AntLayout style={{ minHeight: '100vh', background: 'var(--lol-dark)' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        style={{
          background: 'var(--lol-darker)',
          boxShadow: '2px 0 8px rgba(255, 71, 87, 0.2)',
          borderRight: '1px solid var(--lol-border)',
        }}
      >
        <div style={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          borderBottom: '1px solid var(--lol-border)',
          background: 'linear-gradient(90deg, var(--lol-primary), var(--lol-secondary))'
        }}>
          <Title level={3} style={{ 
            margin: 0, 
            color: 'white',
            fontSize: collapsed ? 16 : 20,
            transition: 'all 0.2s',
            textShadow: '0 0 10px rgba(255,0,64,0.8)',
            fontFamily: 'Orbitron, Exo 2, sans-serif',
            fontWeight: 900,
            letterSpacing: '2px'
          }}>
            {collapsed ? 'J' : 'JINX'}
          </Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ 
            borderRight: 0,
            background: 'var(--lol-darker)',
            color: 'var(--jinx-text)'
          }}
          theme="dark"
        />
      </Sider>
      <AntLayout>
        <Header style={{ 
          padding: '0 24px', 
          background: 'var(--lol-gray)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(255, 71, 87, 0.2)',
          borderBottom: '1px solid var(--lol-border)'
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ color: 'var(--lol-text-secondary)', fontFamily: 'Orbitron, sans-serif', fontSize: '12px', letterSpacing: '1px' }}>BOMBARDMENT v1.0</span>
            <Dropdown
              menu={{ 
                items: userMenuItems,
                onClick: handleUserMenuClick
              }}
              placement="bottomRight"
            >
              <Avatar 
                icon={<RocketOutlined />} 
                style={{ 
                  cursor: 'pointer',
                  background: 'var(--lol-primary)',
                  border: '2px solid var(--lol-secondary)'
                }}
              />
            </Dropdown>
          </div>
        </Header>
        <Content style={{ 
          margin: 0, 
          minHeight: 280,
          background: 'var(--lol-dark)',
          padding: '24px'
        }}>
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;
