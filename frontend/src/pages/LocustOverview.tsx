import React from 'react';
import { Typography, Button, Space, Card } from 'antd';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;

const LocustOverview: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ 
      background: '#07070D', 
      height: 'calc(100vh - 48px)',
      overflow: 'hidden'
    }}>
      <div style={{ 
        height: '100%', 
        overflow: 'auto', 
        padding: '24px' 
      }}>
        <div style={{ maxWidth: '100%', width: '100%' }}>
          <Title level={1} style={{ 
            color: 'var(--text-primary)', 
            marginBottom: '16px',
            fontSize: '32px',
            fontWeight: 700
          }}>
            Hello, Locust World!
          </Title>

          <Paragraph style={{ color: 'var(--text-secondary)', fontSize: 16 }}>
            Welcome and thanks for checking out our Locust load testing platform!
          </Paragraph>
          <Paragraph style={{ color: 'var(--text-secondary)', fontSize: 16 }}>
            In the next 5 minutes, you will set up a Locust scenario and configure your load testing parameters.
          </Paragraph>

          <Card 
            style={{ 
              background: '#07070D', 
              border: '1px solid var(--border)',
              borderRadius: 1,
              marginTop: 16
            }}
          >
            <Space>
              <Button
                type="primary"
                onClick={() => navigate('/scenarios/locust/basic-info')}
                style={{ background: 'var(--primary)', borderColor: 'var(--primary)' }}
              >
                Start Creating Scenario
              </Button>
              <Text style={{ color: 'var(--text-secondary)' }}>
                Begin by entering basic information for your Locust scenario.
              </Text>
            </Space>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LocustOverview;


