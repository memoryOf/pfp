import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Layout from './components/Layout';
import LoadGeneratorList from './pages/LoadGeneratorList';
import LoadGeneratorDetail from './pages/LoadGeneratorDetail';
import TestTaskList from './pages/TestTaskList';
import TestTaskDetail from './pages/TestTaskDetail';
import Dashboard from './pages/Dashboard';
import './App.css';

const App: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/load-generators" element={<LoadGeneratorList />} />
            <Route path="/load-generators/:id" element={<LoadGeneratorDetail />} />
            <Route path="/test-tasks" element={<TestTaskList />} />
            <Route path="/test-tasks/:id" element={<TestTaskDetail />} />
          </Routes>
        </Layout>
      </Router>
    </ConfigProvider>
  );
};

export default App;
