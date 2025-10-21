import React, { useState, useCallback } from 'react';
import { Card, Row, Col, Button, Upload, List, Empty, message } from 'antd';
import { UploadOutlined, FileOutlined, DeleteOutlined } from '@ant-design/icons';

interface FileItem {
  id: string;
  name: string;
  content: string;
}

interface FileManagerProps {
  files: FileItem[];
  selectedFile: string | null;
  fileContent: string;
  onFileUpload: (file: File) => void;
  onFileSelect: (fileId: string) => void;
  onFileDelete: (fileId: string) => void;
  onFileContentChange: (content: string) => void;
  onSaveFile: () => void;
}

const FileManager: React.FC<FileManagerProps> = ({
  files,
  selectedFile,
  fileContent,
  onFileUpload,
  onFileSelect,
  onFileDelete,
  onFileContentChange,
  onSaveFile
}) => {
  return (
    <Row gutter={16} style={{ height: '500px' }}>
      {/* 左侧文件列表 */}
      <Col span={8}>
        <Card
          title="Files"
          size="small"
          style={{
            background: '#07070D',
            border: '1px solid var(--border)',
            borderRadius: '1px',
            height: '100%'
          }}
          headStyle={{
            background: '#07070D',
            borderBottom: '1px solid var(--border)',
            color: 'var(--text-primary)'
          }}
          bodyStyle={{
            padding: '12px',
            height: 'calc(100% - 57px)',
            overflow: 'auto'
          }}
        >
          {/* 文件上传区域 */}
          <div style={{ marginBottom: '16px' }}>
            <Upload
              beforeUpload={onFileUpload}
              accept=".py,.txt,.js,.ts"
              showUploadList={false}
            >
              <Button
                icon={<UploadOutlined />}
                style={{
                  width: '100%',
                  background: '#07070D',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)'
                }}
              >
                Upload File
              </Button>
            </Upload>
          </div>

          {/* 文件列表 */}
          {files.length === 0 ? (
            <Empty
              description="No files uploaded"
              style={{
                color: 'var(--text-secondary)',
                marginTop: '40px'
              }}
            />
          ) : (
            <List
              dataSource={files}
              renderItem={(file) => (
                <List.Item
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderRadius: '1px',
                    background: selectedFile === file.id ? 'var(--primary)' : 'transparent',
                    color: selectedFile === file.id ? 'white' : 'var(--text-primary)',
                    marginBottom: '4px'
                  }}
                  onClick={() => onFileSelect(file.id)}
                  actions={[
                    <Button
                      key="delete"
                      type="text"
                      icon={<DeleteOutlined />}
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFileDelete(file.id);
                      }}
                      style={{
                        color: selectedFile === file.id ? 'white' : 'var(--text-secondary)'
                      }}
                    />
                  ]}
                >
                  <List.Item.Meta
                    avatar={<FileOutlined />}
                    title={
                      <span style={{
                        fontSize: '14px',
                        color: selectedFile === file.id ? 'white' : 'var(--text-primary)'
                      }}>
                        {file.name}
                      </span>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      </Col>

      {/* 右侧编辑区域 */}
      <Col span={16}>
        <Card
          title={selectedFile ? files.find(f => f.id === selectedFile)?.name : 'Editor'}
          size="small"
          style={{
            background: '#07070D',
            border: '1px solid var(--border)',
            borderRadius: '1px',
            height: '100%'
          }}
          headStyle={{
            background: '#07070D',
            borderBottom: '1px solid var(--border)',
            color: 'var(--text-primary)'
          }}
          bodyStyle={{
            padding: '12px',
            height: 'calc(100% - 57px)',
            display: 'flex',
            flexDirection: 'column'
          }}
          extra={
            selectedFile && (
              <Button
                type="primary"
                size="small"
                onClick={onSaveFile}
                style={{
                  background: 'var(--primary)',
                  borderColor: 'var(--primary)'
                }}
              >
                Save
              </Button>
            )
          }
        >
          {!selectedFile ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              flexDirection: 'column'
            }}>
              <Empty
                description="Please upload a file or select from the file list"
                style={{
                  color: 'var(--text-secondary)'
                }}
              />
            </div>
          ) : (
            <textarea
              value={fileContent}
              onChange={(e) => {
                onFileContentChange(e.target.value);
              }}
              placeholder="File content will appear here..."
              style={{
                flex: 1,
                background: '#07070D',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
                fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                fontSize: '14px',
                resize: 'none',
                border: '1px solid var(--border)',
                borderRadius: '1px',
                padding: '8px'
              }}
            />
          )}
        </Card>
      </Col>
    </Row>
  );
};

export default FileManager;
