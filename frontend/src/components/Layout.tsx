import React, { useState } from 'react';
import { Layout as AntLayout, Button } from 'antd';
import { 
  MenuUnfoldOutlined,
  CloudServerOutlined,
  LineChartOutlined,
  LeftOutlined,
  RocketOutlined,
  FolderOutlined,
  AppstoreOutlined,
  ExperimentOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const { Sider, Content } = AntLayout;

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
      icon: <AppstoreOutlined />,
      label: 'Tasks',
    },
    {
      key: '/scenarios',
      icon: <ExperimentOutlined />,
      label: 'Scenarios',
    },
    {
      key: '/file-management',
      icon: <FolderOutlined />,
      label: 'Files',
    },
  ];
    

  const handleMenuClick = (item: any) => {
    navigate(item.key);
  };



  return (
      <AntLayout style={{ height: '100vh', background: '#07070D', overflow: 'hidden' }}>
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
          position: 'relative',
          height: '100vh',
          overflow: 'hidden'
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
            background: 'rgba(255,255,255,0.02)',
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
                src="/logo.svg"
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
                  src="/logo.svg"
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
                fontWeight: 700,
                fontFamily: 'Proxima Nova, sans-serif'
              }}>
                Jinx
              </span>
            </div>
          )}
        </div>


        {/* 主菜单区域 */}
        <div style={{ 
          padding: '16px 0', 
          flex: 1, 
          overflowY: 'auto', 
          overflowX: 'hidden',
          height: 'calc(100vh - 128px)',
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--border) var(--bg-secondary)'
        }}>
          {menuItems.map(item => {
            const isActive = location.pathname === item.key;
            
            return (
              <div key={item.key} style={{ position: 'relative' }}>
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
                    borderLeft: isActive ? '3px solid #8b5cf6' : '3px solid transparent',
                    boxShadow: 'none',
                    cursor: 'pointer',
                    zIndex: 10,
                    position: 'relative'
                  }}
                  onClick={() => handleMenuClick(item)}
                >
                  <div 
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
      <AntLayout style={{ height: '100vh', overflow: 'hidden' }}>
        <Content style={{ 
          margin: 0, 
          height: '100vh',
          background: '#07070D',
          padding: '24px',
          overflow: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--border) var(--bg-secondary)'
        }}>
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;
