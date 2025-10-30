import React, { useState } from 'react';
import { Typography, Card, Form, InputNumber, Row, Col, Button, Space } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';

const { Title } = Typography;

const LoadTestingParameters: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  
  const scenarioData = location.state?.scenarioData || {};
  const scenarioId = location.state?.scenarioId;

  const handleNext = async () => {
    try {
      const values = await form.validateFields();
      navigate('/scenarios/locust/review', {
        state: {
          scenarioData: { ...scenarioData, ...values },
          scenarioId
        }
      });
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handlePrev = () => {
    navigate('/scenarios/locust/script-config', {
      state: { scenarioData, scenarioId }
    });
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
            Load Testing Parameters
          </Title>
          
          <p style={{ 
            color: 'var(--text-secondary)', 
            fontSize: '16px',
            marginBottom: '32px'
          }}>
            Configure your load testing parameters for the Locust scenario.
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
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="user_count"
                    label={<span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>User Count</span>}
                    rules={[{ required: true, message: 'Please input user count!' }]}
                  >
                    <InputNumber 
                      min={1}
                      max={10000}
                      placeholder="Number of users"
                      style={{ 
                        width: '100%',
                        background: '#07070D', 
                        borderColor: 'var(--border)', 
                        color: 'var(--text-primary)' 
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="spawn_rate"
                    label={<span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Spawn Rate</span>}
                    rules={[{ required: true, message: 'Please input spawn rate!' }]}
                  >
                    <InputNumber 
                      min={1}
                      max={1000}
                      placeholder="Users per second"
                      style={{ 
                        width: '100%',
                        background: '#07070D', 
                        borderColor: 'var(--border)', 
                        color: 'var(--text-primary)' 
                      }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="run_time"
                    label={<span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Run Time (seconds)</span>}
                    rules={[{ required: true, message: 'Please input run time!' }]}
                  >
                    <InputNumber 
                      min={1}
                      max={3600}
                      placeholder="Test duration"
                      style={{ 
                        width: '100%',
                        background: '#07070D', 
                        borderColor: 'var(--border)', 
                        color: 'var(--text-primary)' 
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="ramp_up_time"
                    label={<span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Ramp Up Time (seconds)</span>}
                    rules={[{ required: true, message: 'Please input ramp up time!' }]}
                  >
                    <InputNumber 
                      min={1}
                      max={600}
                      placeholder="Warm-up duration"
                      style={{ 
                        width: '100%',
                        background: '#07070D', 
                        borderColor: 'var(--border)', 
                        color: 'var(--text-primary)' 
                      }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>

          {/* Action Buttons */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginTop: '24px'
          }}>
            <Button 
              onClick={handlePrev}
              style={{
                background: '#07070D',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)'
              }}
            >
              Previous
            </Button>
            
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

export default LoadTestingParameters;

