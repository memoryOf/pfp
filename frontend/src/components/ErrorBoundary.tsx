import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button } from 'antd';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // 更新 state 使下一次渲染能够显示降级后的 UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // 检查是否是浏览器扩展相关的错误
    if (error.message.includes('ethereum') || error.message.includes('Cannot redefine property')) {
      console.warn('Browser extension conflict detected. This is usually caused by Web3 wallet extensions.');
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      const isExtensionError = this.state.error?.message.includes('ethereum') || 
                              this.state.error?.message.includes('Cannot redefine property');

      if (isExtensionError) {
        return (
          <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f1419 0%, #1a1f2e 100%)',
            padding: '20px'
          }}>
            <Result
              status="warning"
              title="浏览器扩展冲突"
              subTitle="检测到浏览器扩展冲突，这通常由Web3钱包扩展（如MetaMask）引起。"
              extra={[
                <Button type="primary" key="reload" onClick={this.handleReload}>
                  重新加载页面
                </Button>,
                <Button key="retry" onClick={this.handleReset}>
                  重试
                </Button>
              ]}
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '12px',
                padding: '40px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(10px)'
              }}
            />
          </div>
        );
      }

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f1419 0%, #1a1f2e 100%)',
          padding: '20px'
        }}>
          <Result
            status="error"
            title="应用错误"
            subTitle="抱歉，应用遇到了一个错误。请尝试重新加载页面。"
            extra={[
              <Button type="primary" key="reload" onClick={this.handleReload}>
                重新加载页面
              </Button>,
              <Button key="retry" onClick={this.handleReset}>
                重试
              </Button>
            ]}
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '12px',
              padding: '40px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(10px)'
            }}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;


