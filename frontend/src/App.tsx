import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { initExtensionConflictHandler } from './utils/extensionConflictHandler';
import './App.css';
import './performance.css';
import './performance-optimized.css';
import './modern-theme.css';
import './antd-theme-override.css';
import './modal-transparent.css';

// 懒加载页面组件以优化首屏加载性能
const HomePage = lazy(() => import('./pages/HomePage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const LoadGeneratorList = lazy(() => import('./pages/LoadGeneratorList'));
const LoadGeneratorDetail = lazy(() => import('./pages/LoadGeneratorDetail'));
const TestTaskDetail = lazy(() => import('./pages/TestTaskDetail'));
const TestTaskManagement = lazy(() => import('./pages/TestTaskManagement'));

const App: React.FC = () => {
  useEffect(() => {
    // 初始化扩展冲突处理
    initExtensionConflictHandler();
  }, []);

  return (
    <ErrorBoundary>
      <ConfigProvider locale={zhCN}>
        <Router>
          <Layout>
            <Suspense fallback={
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                minHeight: '100vh',
                background: 'var(--lol-dark)'
              }}>
                <Spin size="large" tip="Loading..." />
              </div>
            }>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/get-started" element={<HomePage />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/load-generators" element={<LoadGeneratorList />} />
                <Route path="/load-generators/:id" element={<LoadGeneratorDetail />} />
                <Route path="/test-tasks/:id" element={<TestTaskDetail />} />
                <Route path="/test-management" element={<TestTaskManagement />} />
              </Routes>
            </Suspense>
          </Layout>
        </Router>
      </ConfigProvider>
    </ErrorBoundary>
  );
};

export default App;