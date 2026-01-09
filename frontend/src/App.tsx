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
import './table-headers.css';

// 懒加载页面组件以优化首屏加载性能
const HomePage = lazy(() => import('./pages/HomePage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const LoadGeneratorList = lazy(() => import('./pages/LoadGeneratorList'));
const LoadGeneratorDetail = lazy(() => import('./pages/LoadGeneratorDetail'));
const TestTaskDetail = lazy(() => import('./pages/TestTaskDetail'));
const TestTaskManagement = lazy(() => import('./pages/TestTaskManagement'));
const ScenariosList = lazy(() => import('./pages/ScenariosList'));
const LocustCreation = lazy(() => import('./pages/LocustCreation'));
const KarateCreation = lazy(() => import('./pages/KarateCreation'));
const FileManagement = lazy(() => import('./pages/FileManagement'));
const LoadProfile = lazy(() => import('./pages/LoadProfile'));

// Locust 独立步骤页面

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
                height: '100vh',
                background: 'var(--bg-primary)'
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
                <Route path="/scenarios" element={<ScenariosList />} />
                <Route path="/file-management" element={<FileManagement />} />
                
                {/* Locust 创建页面 */}
                <Route path="/scenarios/locust/create" element={<LocustCreation />} />
                
                {/* Karate 创建页面 */}
                <Route path="/scenarios/karate/create" element={<KarateCreation />} />
                
                {/* Load Profile 页面 */}
                <Route path="/load-profile" element={<LoadProfile />} />
              </Routes>
            </Suspense>
          </Layout>
        </Router>
      </ConfigProvider>
    </ErrorBoundary>
  );
};

export default App;