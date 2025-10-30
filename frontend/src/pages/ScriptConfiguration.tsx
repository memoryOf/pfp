import React, { useCallback, useEffect, useState } from 'react';
import { Typography, Card, Button } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import FileManager from '../components/FileManager';
import { scenarioFileService } from '../services/api';

const { Title } = Typography;

const ScriptConfiguration: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const scenarioId: number | undefined = location.state?.scenarioId;

  const [files, setFiles] = useState<Array<{id: number, name: string, content: string}>>([]);
  const [selectedFile, setSelectedFile] = useState<number | null>(null);
  const [fileContent, setFileContent] = useState<string>('');

  useEffect(() => {
    const loadScenarioFiles = async () => {
      if (!scenarioId) return;
      try {
        const scenarioFiles = await scenarioFileService.getScenarioFiles(scenarioId);
        const filesWithContent = await Promise.all(
          scenarioFiles.map(async (file: any) => {
            const fileData = await scenarioFileService.getScenarioFile(scenarioId, file.id);
            return { id: file.id, name: file.file_name, content: fileData.file_content };
          })
        );
        setFiles(filesWithContent);
        if (filesWithContent.length > 0) {
          setSelectedFile(filesWithContent[0].id);
          setFileContent(filesWithContent[0].content);
        }
      } catch (e) {
        // ignore
      }
    };
    loadScenarioFiles();
  }, [scenarioId]);

  const handleFileUpload = useCallback(async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      const newFile = { id: Date.now(), name: file.name, content };
      setFiles(prev => [...prev, newFile]);
      setSelectedFile(newFile.id);
      setFileContent(content);
    };
    reader.readAsText(file);
    return false;
  }, []);

  const handleFileSelect = useCallback((fileId: number) => {
    const file = files.find(f => f.id === fileId);
    if (file) {
      setSelectedFile(fileId);
      setFileContent(file.content);
    }
  }, [files]);

  const handleFileDelete = useCallback(async (fileId: number) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    if (selectedFile === fileId) {
      setSelectedFile(null);
      setFileContent('');
    }
  }, [selectedFile]);

  const handleFileContentChange = useCallback((content: string) => {
    setFileContent(content);
  }, []);

  const handleSaveFile = useCallback(async () => {
    setFiles(prev => prev.map(f => (f.id === selectedFile ? { ...f, content: fileContent } : f)));
  }, [selectedFile, fileContent]);

  const handleNext = () => {
    navigate('/scenarios/locust/load-testing', {
      state: {
        scenarioData: location.state?.scenarioData,
        scenarioId,
        files
      }
    });
  };

  const handlePrev = () => {
    navigate('/scenarios/locust/basic-info', {
      state: { scenarioData: location.state?.scenarioData, scenarioId }
    });
  };

  return (
    <div style={{ background: '#07070D', height: 'calc(100vh - 48px)', overflow: 'hidden' }}>
      <div style={{ height: '100%', overflow: 'auto', padding: '24px 0' }}>
        <div style={{ maxWidth: '100%', width: '100%' }}>
          <div style={{ padding: '0 24px' }}>
            <Title level={1} style={{ color: 'var(--text-primary)', marginBottom: 8 }}>Script Configuration</Title>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>上传编辑locust脚本或者数据csv文件</p>
          </div>
          <Card style={{ 
            background: '#07070D', 
            border: '1px solid var(--border)', 
            borderRadius: 1,
            height: 'calc(100vh - 200px)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <FileManager
              files={files}
              selectedFile={selectedFile}
              fileContent={fileContent}
              onFileUpload={handleFileUpload}
              onFileSelect={handleFileSelect}
              onFileDelete={handleFileDelete}
              onFileContentChange={handleFileContentChange}
              onSaveFile={handleSaveFile}
            />
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

export default ScriptConfiguration;


