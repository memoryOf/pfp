import React from 'react';
import { Card, Row, Col, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';

const { Title } = Typography;

interface LanguageCardProps {
  name: string;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
}

const LanguageCard: React.FC<LanguageCardProps> = ({ 
  name, 
  icon, 
  color,
  onClick
}) => (
  <Card
    className="modern-card language-card"
    onClick={onClick}
    style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      height: '150px',
      width: '150px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'center',
      textAlign: 'center',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.3s ease'
    }}
    bodyStyle={{
      padding: '16px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}
  >
    {/* 标题 */}
    <Title
      level={4}
      style={{
        color: 'var(--text-primary)',
        margin: 0,
        fontSize: '14px',
        fontWeight: 700,
        letterSpacing: '0.5px',
        fontFamily: 'Proxima Nova, sans-serif',
        textAlign: 'center'
      }}
    >
      {name}
    </Title>
    
    {/* 图标 */}
    <div
      style={{
        fontSize: '72px',
        color: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1
      }}
      className="card-icon"
    >
      {icon}
    </div>
  </Card>
);

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const languages = [
    {
      name: 'Gatling',
      icon: <img src="/gatling.svg" alt="Gatling" style={{ width: '60px', height: '60px' }} />,
      color: '#dbdbdb',
      path: null // 暂时没有Gatling创建页面
    },
    {
      name: 'Locust',
      icon: <img src="/fi-rr-locust.svg" alt="Locust" style={{ width: '60px', height: '60px' }} />,
      color: '#68a063',
      path: '/scenarios/locust/create'
    },
    {
      name: 'JMeter',
      icon: <img src="/jmeter.svg" alt="JMeter" style={{ width: '70px', height: '70px' }} />,
      color: '#00add8',
      path: null // 暂时没有JMeter创建页面
    },
    {
      name: 'Karate',
      icon: <img src="/karate.svg" alt="Karate" style={{ width: '60px', height: '60px' }} />,
      color: '#ff6b35',
      path: '/scenarios/karate/create'
    }
  ];

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
          Get Started
        </Title>
        <p style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '18px',
          margin: 0, 
          fontFamily: 'Proxima Nova, sans-serif',
          fontWeight: 700
        }}>
          Choose the load testing tool you favor
        </p>
      </div>

      <div style={{ marginBottom: '24px' }}>
        {/* 负载测试tools */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-start' }}>
          {languages.map((language, index) => (
            <div key={index} style={{ flex: '0 0 auto' }}>
              <LanguageCard
                name={language.name}
                icon={language.icon}
                color={language.color}
                onClick={language.path ? () => navigate(language.path!) : undefined}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
