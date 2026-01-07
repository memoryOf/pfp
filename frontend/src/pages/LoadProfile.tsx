import React, { useState, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Form,
  InputNumber,
  Input,
  Typography,
  Tag
} from 'antd';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import './LoadProfile.css';

const { Title, Text } = Typography;

interface LoadProfileConfig {
  concurrentUsers: number;
  rampUp: number;
  host: string;
  durationSeconds: number; // Use seconds uniformly
}

const LoadProfile: React.FC = () => {
  const [form] = Form.useForm<LoadProfileConfig>();
  
  // Default values
  const [config, setConfig] = useState<LoadProfileConfig>({
    concurrentUsers: 5,
    rampUp: 5,
    host: 'http://localhost',
    durationSeconds: 10,
  });

  // Listen to form changes
  const handleFormChange = () => {
    const values = form.getFieldsValue();
    setConfig(values);
  };

  // Calculate total duration (seconds)
  const totalDuration = useMemo(() => {
    return config.durationSeconds;
  }, [config.durationSeconds]);

  // Generate load profile preview chart data
  const chartData = useMemo(() => {
    const data: Array<[number, number]> = [];
    
    const rampUpTime = config.rampUp;
    const totalTime = totalDuration;
    const maxUsers = config.concurrentUsers;
    
    // Starting point
    data.push([0, 0]);
    
    // Ramp-up phase: from 0 to rampUpTime, users from 0 to maxUsers
    if (rampUpTime > 0 && maxUsers > 0) {
      const rampUpSteps = Math.max(10, Math.floor(rampUpTime));
      for (let i = 1; i <= rampUpSteps; i++) {
        const time = (rampUpTime / rampUpSteps) * i;
        const users = (maxUsers / rampUpSteps) * i;
        data.push([time, users]);
      }
    } else {
      // If no ramp-up, jump directly to max users
      data.push([0, maxUsers]);
    }
    
    // Steady phase: from rampUpTime to totalTime, maintain maxUsers
    if (totalTime > rampUpTime) {
      data.push([rampUpTime, maxUsers]);
      data.push([totalTime, maxUsers]);
    }
    
    return data;
  }, [config, totalDuration]);

  // ECharts configuration
  const chartOption: EChartsOption = useMemo(() => {
    const [times, users] = chartData.reduce(
      (acc, [time, user]) => {
        acc[0].push(time);
        acc[1].push(user);
        return acc;
      },
      [[], []] as [number[], number[]]
    );

    const maxTime = Math.max(...times, 10);
    const maxUsers = Math.max(...users, config.concurrentUsers, 5);

    return {
      backgroundColor: 'transparent',
      grid: {
        left: '60px',
        right: '20px',
        top: '40px',
        bottom: '50px',
        containLabel: false
      },
      xAxis: {
        type: 'value',
        name: 'Time (seconds)',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: {
          color: '#8B8B9C',
          fontSize: 12
        },
        min: 0,
        max: maxTime,
        splitLine: {
          show: true,
          lineStyle: {
            color: '#1E1E2E',
            type: 'dashed'
          }
        },
        axisLine: {
          lineStyle: {
            color: '#2D2D3A'
          }
        },
        axisLabel: {
          color: '#8B8B9C',
          fontSize: 11
        }
      },
      yAxis: {
        type: 'value',
        name: 'Concurrent Users',
        nameLocation: 'middle',
        nameGap: 50,
        nameTextStyle: {
          color: '#8B8B9C',
          fontSize: 12
        },
        min: 0,
        max: maxUsers,
        splitLine: {
          show: true,
          lineStyle: {
            color: '#1E1E2E',
            type: 'dashed'
          }
        },
        axisLine: {
          lineStyle: {
            color: '#2D2D3A'
          }
        },
        axisLabel: {
          color: '#8B8B9C',
          fontSize: 11
        }
      },
      series: [
        {
          type: 'line',
          data: chartData,
          smooth: false,
          lineStyle: {
            color: '#6366F1',
            width: 2
          },
          itemStyle: {
            color: '#6366F1'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color: 'rgba(99, 102, 241, 0.3)'
                },
                {
                  offset: 1,
                  color: 'rgba(99, 102, 241, 0.05)'
                }
              ]
            }
          },
          symbol: 'circle',
          symbolSize: 4
        }
      ],
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: '#2D2D3A',
        textStyle: {
          color: '#FFFFFF'
        },
        formatter: (params: any) => {
          const param = params[0];
          return `Time: ${param.value[0]}s<br/>Concurrent Users: ${param.value[1]}`;
        }
      }
    };
  }, [chartData, config.concurrentUsers]);

  // Format duration display
  const formatDuration = () => {
    return `${config.durationSeconds}s`;
  };

  return (
    <div style={{
      background: 'transparent',
      height: '100%',
      padding: '0'
    }}>
      <Row gutter={24} style={{ height: '100%' }}>
        {/* Left side configuration panel */}
        <Col span={10}>
          <Card
            style={{
              background: '#0F0F15',
              border: '1px solid #1E1E2E',
              borderRadius: '8px',
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
            bodyStyle={{ padding: '24px', flex: 1, overflowY: 'auto' }}
          >
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Title level={4} style={{ color: '#FFFFFF', margin: 0 }}>
                Concurrent Registration
              </Title>
              <Tag
                style={{
                  background: 'rgba(99, 102, 241, 0.1)',
                  borderColor: '#6366F1',
                  color: '#6366F1',
                  fontSize: '12px',
                  padding: '4px 12px'
                }}
              >
                Concurrent Users: {config.concurrentUsers}, Duration: {formatDuration()}
              </Tag>
            </div>

            <Form
              form={form}
              layout="vertical"
              initialValues={config}
              onValuesChange={handleFormChange}
            >
              {/* Concurrent Users */}
              <Form.Item
                name="concurrentUsers"
                label={<Text style={{ color: '#8B8B9C', fontSize: '13px' }}>Number of users (peak concurrency)</Text>}
              >
                <InputNumber
                  min={1}
                  max={10000}
                  controls={{
                    upIcon: <span style={{ color: '#8B8B9C' }}>▲</span>,
                    downIcon: <span style={{ color: '#8B8B9C' }}>▼</span>
                  }}
                  style={{
                    width: '100%',
                    background: '#0A0A0F',
                    borderColor: '#1E1E2E',
                    color: '#FFFFFF'
                  }}
                />
              </Form.Item>

              {/* Ramp-Up */}
              <Form.Item
                name="rampUp"
                label={<Text style={{ color: '#8B8B9C', fontSize: '13px' }}>Ramp up (users started/second)</Text>}
              >
                <InputNumber
                  min={0}
                  max={3600}
                  controls={{
                    upIcon: <span style={{ color: '#8B8B9C' }}>▲</span>,
                    downIcon: <span style={{ color: '#8B8B9C' }}>▼</span>
                  }}
                  style={{
                    width: '100%',
                    background: '#0A0A0F',
                    borderColor: '#1E1E2E',
                    color: '#FFFFFF'
                  }}
                />
              </Form.Item>

              {/* Host */}
              <Form.Item
                name="host"
                label={<Text style={{ color: '#8B8B9C', fontSize: '13px' }}>Host</Text>}
              >
                <Input
                  placeholder="http://localhost"
                  style={{
                    width: '100%',
                    background: '#0A0A0F',
                    borderColor: '#1E1E2E',
                    color: '#FFFFFF'
                  }}
                />
              </Form.Item>

              {/* Test Duration */}
              <Form.Item
                name="durationSeconds"
                label={<Text style={{ color: '#8B8B9C', fontSize: '13px' }}>Run Time (seconds)</Text>}
              >
                <InputNumber
                  min={1}
                  max={86400}
                  placeholder="Enter duration in seconds"
                  controls={{
                    upIcon: <span style={{ color: '#8B8B9C' }}>▲</span>,
                    downIcon: <span style={{ color: '#8B8B9C' }}>▼</span>
                  }}
                  style={{
                    width: '100%',
                    background: '#0A0A0F',
                    borderColor: '#1E1E2E',
                    color: '#FFFFFF'
                  }}
                />
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* Right side load profile preview chart */}
        <Col span={14}>
          <Card
            style={{
              background: '#0F0F15',
              border: '1px solid #1E1E2E',
              borderRadius: '8px',
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
            bodyStyle={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            <Title level={4} style={{ color: '#FFFFFF', marginBottom: '24px', flexShrink: 0 }}>
              Load Profile Preview
            </Title>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ReactECharts
                option={chartOption}
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'canvas' }}
              />
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default LoadProfile;

