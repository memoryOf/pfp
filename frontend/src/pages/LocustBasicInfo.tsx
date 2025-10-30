import React from 'react';
import { Typography, Card, Form, Input, Button } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';

const { Title } = Typography;
const { TextArea } = Input;

const LocustBasicInfo: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  
  const scenarioData = location.state?.scenarioData || {};
  const scenarioId = location.state?.scenarioId;

  const handleNext = async () => {
    try {
      const values = await form.validateFields();
      navigate('/scenarios/locust/script-config', {
        state: {
          scenarioData: { ...scenarioData, ...values },
          scenarioId
        }
      });
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

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
            Basic Information
          </Title>
          
          <p style={{ 
            color: 'var(--text-secondary)', 
            fontSize: '16px',
            marginBottom: '32px'
          }}>
            Enter the basic information for your Locust scenario.
          </p>

          <Card 
            style={{ 
              background: '#07070D', 
              border: '1px solid var(--border)',
              borderRadius: '1px',
              marginBottom: '24px'
            }}
          >
            <Form
              form={form}
              layout="vertical"
              initialValues={scenarioData}
            >
              <Form.Item
                name="name"
                label={<span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Scenario Name</span>}
                rules={[{ required: true, message: 'Please input scenario name!' }]}
              >
                <Input 
                  placeholder="Enter scenario name"
                  style={{ 
                    background: '#07070D', 
                    borderColor: 'var(--border)', 
                    color: 'var(--text-primary)' 
                  }}
                />
              </Form.Item>

              <Form.Item
                name="description"
                label={<span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Description</span>}
              >
                <TextArea 
                  rows={4}
                  placeholder="Enter scenario description"
                  style={{ 
                    background: '#07070D', 
                    borderColor: 'var(--border)', 
                    color: 'var(--text-primary)' 
                  }}
                />
              </Form.Item>

              <Form.Item
                name="scenario_type"
                label={<span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Type</span>}
              >
                <Input 
                  value="locust"
                  readOnly
                  style={{ 
                    background: '#07070D', 
                    borderColor: 'var(--border)', 
                    color: 'var(--text-secondary)',
                    cursor: 'not-allowed'
                  }}
                />
              </Form.Item>
            </Form>
          </Card>

          {/* Action Buttons */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end',
            marginTop: '24px'
          }}>
            <Button 
              type="primary"
              onClick={handleNext}
              style={{
                background: 'var(--primary)',
                borderColor: 'var(--primary)',
                color: 'white'
              }}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocustBasicInfo;

