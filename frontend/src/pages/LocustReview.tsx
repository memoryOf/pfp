import React, { useState } from 'react';
import { Typography, Card, Row, Col, Button, Space, message } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { scenarioService, scenarioFileService } from '../services/api';

const { Title, Text } = Typography;

const LocustReview: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const scenarioData = location.state?.scenarioData || {};
  const scenarioId = location.state?.scenarioId;
  const files = location.state?.files || [];

  const handleCreate = async () => {
    try {
      setLoading(true);

      if (scenarioId) {
        // 更新已存在的scenario
        await scenarioService.updateScenario(scenarioId, scenarioData);
        message.success('Locust scenario updated successfully!');
      } else {
        // 创建新的scenario
        const createData = {
          name: scenarioData.name || 'Locust Scenario',
          description: scenarioData.description,
          scenario_type: 'locust' as const,
          is_active: true,
        };
        const createdScenario = await scenarioService.createScenario(createData);
        
        // 保存文件到MinIO
        for (const file of files) {
          await scenarioFileService.createScenarioFile(createdScenario.id, {
            file_name: file.name,
            file_content: file.content,
            content_type: 'text/plain'
          });
        }
        
        message.success('Locust scenario created successfully!');
      }

      navigate('/scenarios');
    } catch (error) {
      message.error('Failed to create scenario. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrev = () => {
    navigate('/scenarios/locust/load-testing', {
      state: { scenarioData, scenarioId, files }
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
            Review & Create
          </Title>
          
          <p style={{ 
            color: 'var(--text-secondary)', 
            fontSize: '16px',
            marginBottom: '32px'
          }}>
            Review your configuration and create the Locust scenario.
          </p>

          <Card 
            style={{ 
              background: '#07070D', 
              border: '1px solid var(--border)',
              borderRadius: '1px',
              marginBottom: '24px'
            }}
          >
            <Title level={4} style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>
              Scenario Summary
            </Title>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text strong style={{ color: 'var(--text-secondary)' }}>Name:</Text>
                <br />
                <Text style={{ color: 'var(--text-primary)' }}>{scenarioData.name || 'Not specified'}</Text>
              </Col>
              <Col span={12}>
                <Text strong style={{ color: 'var(--text-secondary)' }}>Description:</Text>
                <br />
                <Text style={{ color: 'var(--text-primary)' }}>{scenarioData.description || 'Not specified'}</Text>
              </Col>
              <Col span={12}>
                <Text strong style={{ color: 'var(--text-secondary)' }}>User Count:</Text>
                <br />
                <Text style={{ color: 'var(--text-primary)' }}>{scenarioData.user_count || 'Not specified'}</Text>
              </Col>
              <Col span={12}>
                <Text strong style={{ color: 'var(--text-secondary)' }}>Spawn Rate:</Text>
                <br />
                <Text style={{ color: 'var(--text-primary)' }}>{scenarioData.spawn_rate || 'Not specified'}</Text>
              </Col>
              <Col span={12}>
                <Text strong style={{ color: 'var(--text-secondary)' }}>Run Time:</Text>
                <br />
                <Text style={{ color: 'var(--text-primary)' }}>{scenarioData.run_time || 'Not specified'} seconds</Text>
              </Col>
              <Col span={12}>
                <Text strong style={{ color: 'var(--text-secondary)' }}>Ramp Up Time:</Text>
                <br />
                <Text style={{ color: 'var(--text-primary)' }}>{scenarioData.ramp_up_time || 'Not specified'} seconds</Text>
              </Col>
              <Col span={24}>
                <Text strong style={{ color: 'var(--text-secondary)' }}>Files:</Text>
                <br />
                <Text style={{ color: 'var(--text-primary)' }}>
                  {files.length > 0 ? files.map((f: any) => f.name).join(', ') : 'No files uploaded'}
                </Text>
              </Col>
            </Row>
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
              onClick={handleCreate}
              loading={loading}
              style={{
                background: 'var(--primary)',
                borderColor: 'var(--primary)',
                color: 'white'
              }}
            >
              {scenarioId ? 'Update Scenario' : 'Create Scenario'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocustReview;
