import React, { useState } from 'react';
import { Layout as AntLayout, Button, Avatar, Dropdown } from 'antd';
import { 
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CloudServerOutlined,
  LineChartOutlined,
  LeftOutlined,
  RocketOutlined
} from '@ant-design/icons';
import TaskManagementIcon from './icons/TaskManagementIcon';
import { useNavigate, useLocation } from 'react-router-dom';

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
      icon: <RocketOutlined />,
      label: 'Get Started',
    },
    {
      key: '/dashboard',
      icon: <LineChartOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/load-generators',
      icon: <CloudServerOutlined />,
      label: 'Load Generators',
    },
    {
      key: '/test-management',
      icon: <TaskManagementIcon style={{ fontSize: '16px' }} />,
      label: 'Test Management',
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

  const handleMenuClick = (item: any) => {
    navigate(item.key);
  };

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      // 处理退出登录
      console.log('退出登录');
    }
  };

  return (
    <AntLayout style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        style={{
          background: '#0f0f23',
          borderRight: 'none',
          display: 'flex',
          flexDirection: 'column',
          width: collapsed ? 80 : 240,
          minWidth: collapsed ? 80 : 240,
          maxWidth: collapsed ? 80 : 240,
          position: 'relative'
        }}
      >
        {/* Logo区域 */}
        <div 
          style={{ 
            height: 64, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '0' : '0 20px',
            borderBottom: '1px solid #2d3748',
            background: 'linear-gradient(135deg, #4c63d2 0%, #5a67d8 100%)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onClick={() => navigate('/')}
        >
          {collapsed ? (
            <div style={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img 
                src="/favicon.ico" 
                alt="Platform Logo" 
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img 
                  src="/favicon.ico" 
                  alt="Platform Logo" 
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                />
              </div>
              <span style={{
                color: '#fff',
                fontSize: '18px',
                fontWeight: 600,
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}>
                pfp™
              </span>
            </div>
          )}
        </div>

        {/* 用户信息区域 */}
        <div style={{
          padding: collapsed ? '16px 8px' : '16px 20px',
          borderBottom: '1px solid #2d3748'
        }}>
          {collapsed ? (
            <div style={{
              width: 40,
              height: 40,
              background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 'bold',
              margin: '0 auto'
            }}>
              微
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              background: 'transparent',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}>
              <div style={{
                width: 40,
                height: 40,
                background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '16px',
                fontWeight: 'bold'
              }}>
                微
              </div>
              <div>
                <div style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>admin</div>
                <div style={{ color: '#a0aec0', fontSize: '12px' }}>pfp</div>
              </div>
            </div>
          )}
        </div>

        {/* 主菜单区域 */}
        <div style={{ padding: '16px 0', flex: 1, overflowY: 'auto' }}>
          {menuItems.map(item => {
            const isActive = location.pathname === item.key;
            
            return (
              <div key={item.key}>
                {/* 主菜单项 */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: collapsed ? '12px 20px' : '12px 20px',
                    color: isActive ? '#fff' : '#a0aec0',
                    transition: 'all 0.2s ease',
                    background: isActive ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 'transparent',
                    margin: '2px 0',
                    borderRadius: '0 8px 8px 0',
                    marginRight: '8px',
                    borderLeft: isActive ? '3px solid #8b5cf6' : '3px solid transparent'
                  }}
                >
                  <div 
                    onClick={() => handleMenuClick(item)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      flex: 1,
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontSize: '16px', minWidth: '20px' }}>{item.icon}</span>
                    {!collapsed && <span style={{ marginLeft: '12px', fontSize: '14px', fontWeight: 500 }}>{item.label}</span>}
                  </div>
                </div>

              </div>
            );
          })}
        </div>

        {/* 展开/收缩按钮 - 固定在Sider绝对最底部 */}
        <div style={{ 
          padding: '16px 0',
          borderTop: '1px solid #2d3748',
          display: 'flex',
          justifyContent: 'center',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#0f0f23',
          zIndex: 10
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <LeftOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ 
              fontSize: '14px', 
              width: 32, 
              height: 32,
              color: '#a0aec0',
              background: 'transparent',
              border: '1px solid #374151',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          />
        </div>
      </Sider>
      <AntLayout>
        <Content style={{ 
          margin: 0, 
          minHeight: 280,
          background: '#0f0f23',
          padding: '24px'
        }}>
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;
