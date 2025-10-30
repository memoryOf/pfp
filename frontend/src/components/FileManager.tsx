import React, { useState, useEffect } from 'react';
import { Button, Empty, message, Tooltip, Modal, Table } from 'antd';
import { UploadOutlined, FileOutlined, DeleteOutlined, FolderOutlined, FolderOpenOutlined, DownOutlined, RightOutlined, CopyOutlined, CodeOutlined, EditOutlined, FolderAddOutlined, SaveOutlined } from '@ant-design/icons';
import Editor from '@monaco-editor/react';

interface FileItem {
  id: number;
  name: string;
  content: string;
  folder?: string;
}

interface FileManagementItem {
  id: number;
  original_name: string;
  stored_name: string;
  object_path: string;
  file_size: number;
  content_type?: string;
  description?: string;
  tags: string[];
  upload_path: string;
  creator?: string;
  updater?: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

interface FolderItem {
  name: string;
  expanded: boolean;
  files: FileItem[];
}

interface FileManagerProps {
  files: FileItem[];
  selectedFile: number | null;
  fileContent: string;
  onFileUpload: (file: File) => void;
  onFileSelect: (fileId: number) => void;
  onFileDelete: (fileId: number) => void;
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
  const [isFileListCollapsed, setIsFileListCollapsed] = useState(false);
  const [hoveredFileId, setHoveredFileId] = useState<number | null>(null);
  const [fileLoadModalVisible, setFileLoadModalVisible] = useState(false);
  const [fileManagementFiles, setFileManagementFiles] = useState<FileManagementItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [isFileModified, setIsFileModified] = useState(false);
  const [originalFileContent, setOriginalFileContent] = useState<string>('');
  const [folders, setFolders] = useState<FolderItem[]>([
    {
      name: 'examples',
      expanded: true,
      files: files.filter(file => file.folder === 'examples' || !file.folder)
    }
  ]);

  const toggleFileList = () => {
    setIsFileListCollapsed(!isFileListCollapsed);
  };

  const toggleFolder = (folderName: string) => {
    setFolders(prev => prev.map(folder => 
      folder.name === folderName 
        ? { ...folder, expanded: !folder.expanded }
        : folder
    ));
  };

  // 同步files变化到folders状态
  useEffect(() => {
    setFolders(prev => prev.map(folder => ({
      ...folder,
      files: files.filter(file => file.folder === folder.name || (!file.folder && folder.name === 'examples'))
    })));
  }, [files]);

  // 监听文件内容变化，更新修改状态
  useEffect(() => {
    if (selectedFile) {
      const currentFile = files.find(f => f.id === selectedFile);
      if (currentFile) {
        setOriginalFileContent(currentFile.content);
        setIsFileModified(fileContent !== currentFile.content);
      }
    } else {
      setIsFileModified(false);
      setOriginalFileContent('');
    }
  }, [selectedFile, fileContent, files]);

  // 获取文件管理中的文件列表
  const loadFileManagementFiles = async () => {
    setLoadingFiles(true);
    try {
      const response = await fetch('/api/v1/file-management/files?path=/');
      if (response.ok) {
        const result = await response.json();
        setFileManagementFiles(result.files || []);
      } else {
        message.error('Failed to load files');
      }
    } catch (error) {
      console.error('Error loading files:', error);
      message.error('Failed to load files');
    } finally {
      setLoadingFiles(false);
    }
  };

  // 打开文件加载弹窗
  const handleOpenFileLoadModal = () => {
    setFileLoadModalVisible(true);
    loadFileManagementFiles();
  };

  // 从文件管理加载文件
  const handleLoadFileFromManagement = async (fileItem: FileManagementItem) => {
    try {
      const response = await fetch(`/api/v1/file-management/files/${fileItem.id}/download`);
      if (response.ok) {
        const content = await response.text();
        // 使用props中的函数来更新文件
        onFileUpload(new File([content], fileItem.original_name));
        setFileLoadModalVisible(false);
        message.success(`File "${fileItem.original_name}" loaded successfully`);
      } else {
        message.error('Failed to download file');
      }
    } catch (error) {
      console.error('Error loading file:', error);
      message.error('Failed to load file');
    }
  };

  // 处理文件上传
  const handleUploadFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '*/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('path', '/'); // 上传到根目录
          
          const response = await fetch('/api/v1/file-management/upload', {
            method: 'POST',
            body: formData,
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (response.ok) {
            message.success(`File "${file.name}" uploaded successfully`);
            // 刷新文件列表
            loadFileManagementFiles();
          } else {
            message.error('Failed to upload file');
          }
        } catch (error) {
          console.error('Error uploading file:', error);
          message.error('Failed to upload file');
        }
      }
    };
    input.click();
  };

  // 处理保存文件
  const handleSaveFile = async () => {
    if (!selectedFile || !isFileModified) return;
    
    try {
      await onSaveFile();
      setIsFileModified(false);
      setOriginalFileContent(fileContent);
      message.success('File saved successfully');
    } catch (error) {
      console.error('Error saving file:', error);
      message.error('Failed to save file');
    }
  };

  // 根据文件名确定编程语言
  const getLanguageFromFileName = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'py':
        return 'python';
      case 'js':
        return 'javascript';
      case 'ts':
        return 'typescript';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'json':
        return 'json';
      case 'xml':
        return 'xml';
      case 'yaml':
      case 'yml':
        return 'yaml';
      case 'md':
        return 'markdown';
      case 'sql':
        return 'sql';
      case 'sh':
        return 'shell';
      case 'csv':
        return 'csv';
      default:
        return 'plaintext';
    }
  };

  return (
    <>
      <style>
        {`
          .ant-tooltip-inner {
            padding: 4px 8px !important;
            line-height: 1 !important;
            font-size: 12px !important;
            margin: 0 !important;
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
          }
          .ant-tooltip-arrow {
            display: none !important;
          }
        `}
      </style>
      <div style={{ 
        height: 'calc(100vh - 200px)',
              background: '#07070D',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>

      {/* 主体内容区域 */}
      <div style={{ 
        flex: 1, 
        display: 'flex',
        overflow: 'hidden'
      }}>
        {/* 左侧代码编辑面板 */}
        <div style={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* 编辑区域内容 */}
          <div style={{
            flex: 1,
            padding: '12px 12px 12px 0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* 代码区域横条 */}
            <div style={{
              background: '#1E1E1E',
            borderBottom: '1px solid var(--border)',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: 'var(--text-primary)',
              fontSize: '14px',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontWeight: 500 }}>
                  {selectedFile ? (files.find(f => f.id === selectedFile)?.name || 'Unknown File') : 'Code Editor'}
                </span>
                {selectedFile && (
                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                    {fileContent.split('\n').length} lines
                  </span>
                )}
          </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {selectedFile && (
                  <>
                    <Tooltip 
                      title={isFileModified ? "Save changes" : "No changes to save"}
                      overlayStyle={{
                        maxWidth: 'none'
                      }}
                      overlayInnerStyle={{
                        padding: '4px 8px',
                        lineHeight: '1',
                        fontSize: '12px',
                        margin: '0',
                        height: 'auto',
                        minHeight: 'auto'
                      }}
                    >
                      <Button
                        type="text"
                        size="small"
                        icon={<SaveOutlined />}
                        onClick={handleSaveFile}
                        disabled={!isFileModified}
                        style={{
                          color: isFileModified ? 'var(--primary)' : 'var(--text-disabled)',
                          background: 'transparent',
                          border: 'none',
                          padding: '4px 8px',
                          minWidth: 'auto'
                        }}
                      />
                    </Tooltip>
                    <Tooltip 
                      title="Copy"
                      overlayStyle={{
                        maxWidth: 'none'
                      }}
                      overlayInnerStyle={{
                        padding: '4px 8px',
                        lineHeight: '1',
                        fontSize: '12px',
                        margin: '0',
                        height: 'auto',
                        minHeight: 'auto'
                      }}
                    >
                      <Button
                        type="text"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => {
                          navigator.clipboard.writeText(fileContent);
                          message.success('Code copied to clipboard');
                        }}
                        style={{
                          color: 'var(--text-primary)',
                          background: 'transparent',
                          border: 'none',
                          padding: '4px 8px',
                          minWidth: 'auto'
                        }}
                      />
                    </Tooltip>
                  </>
                )}
                <Tooltip 
                  title={isFileListCollapsed ? "Open files panel" : "Close files panel"}
                  overlayStyle={{
                    maxWidth: 'none'
                  }}
                  overlayInnerStyle={{
                    padding: '4px 8px',
                    lineHeight: '1',
                    fontSize: '12px',
                    margin: '0',
                    height: 'auto',
                    minHeight: 'auto'
                  }}
                >
                  <Button
                    type="text"
                    size="small"
                    icon={<CodeOutlined />}
                    onClick={() => {
                      toggleFileList();
                    }}
                    style={{
                      color: 'var(--text-primary)',
                      background: 'transparent',
                      border: 'none',
                      padding: '4px 8px',
                      minWidth: 'auto'
                    }}
                  />
                </Tooltip>
              </div>
            </div>
            
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
              <Editor
                height="100%"
              value={fileContent}
                onChange={(value) => {
                  onFileContentChange(value || '');
                }}
                language={getLanguageFromFileName(files.find(f => f.id === selectedFile)?.name || '')}
                theme="vs-dark"
                options={{
                  fontSize: 14,
                  fontFamily: '"Fira Code", "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", "Consolas", "Courier New", monospace',
                  fontWeight: '400',
                  fontLigatures: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  wordWrap: 'on',
                  lineNumbers: 'on',
                  folding: true,
                  lineDecorationsWidth: 0,
                  lineNumbersMinChars: 0,
                  renderLineHighlight: 'line',
                  cursorStyle: 'line',
                  cursorBlinking: 'blink',
                  selectOnLineNumbers: true,
                  roundedSelection: false,
                  readOnly: false,
                  contextmenu: true,
                  mouseWheelZoom: true,
                  smoothScrolling: true,
                  padding: { top: 8, bottom: 8 },
                  scrollbar: {
                    vertical: 'auto',
                    horizontal: 'auto',
                    useShadows: false,
                    verticalHasArrows: false,
                    horizontalHasArrows: false,
                    verticalScrollbarSize: 8,
                    horizontalScrollbarSize: 8
                  }
                }}
              />
            )}
          </div>
        </div>

        {/* 竖线分割 */}
        {!isFileListCollapsed && (
          <div style={{
            width: '1px',
            background: 'var(--border)',
            flexShrink: 0
          }} />
        )}

        {/* 右侧文件列表面板 */}
        <div style={{ 
          width: isFileListCollapsed ? '0px' : '20%',
          transition: 'width 0.3s ease',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* 文件列表内容 */}
          <div style={{
            flex: 1,
            padding: '12px 0 12px 12px',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}>

            {/* 文件列表 */}
            {folders.length === 0 ? (
              <Empty
                description="No files uploaded"
                style={{
                  color: 'var(--text-secondary)',
                  marginTop: '40px'
                }}
              />
            ) : (
              <div style={{ 
                background: '#1E1E1E',
                borderRadius: '4px',
                overflow: 'hidden',
                flex: 1
              }}>
                {folders.map((folder) => (
                  <div key={folder.name}>
                    {/* 文件夹头部 */}
                    <div
              style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        background: 'transparent',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div 
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}
                        onClick={() => toggleFolder(folder.name)}
                      >
                        {folder.expanded ? (
                          <DownOutlined style={{ 
                            color: 'var(--text-secondary)',
                            fontSize: '12px'
                          }} />
                        ) : (
                          <RightOutlined style={{ 
                            color: 'var(--text-secondary)',
                            fontSize: '12px'
                          }} />
                        )}
                        {folder.expanded ? (
                          <FolderOpenOutlined style={{ 
                            color: 'var(--text-secondary)',
                            fontSize: '12px'
                          }} />
                        ) : (
                          <FolderOutlined style={{ 
                            color: 'var(--text-secondary)',
                            fontSize: '12px'
                          }} />
                        )}
                        <span style={{
                          fontSize: '14px',
                  color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '150px'
                        }}>
                          {folder.name}
                        </span>
                      </div>
                      
                      {/* 文件加载按钮 - 只在examples目录显示 */}
                      {folder.name === 'examples' && (
                        <Tooltip title="Load files from file management">
                          <Button
                            type="text"
                            size="small"
                            icon={<FolderAddOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenFileLoadModal();
                            }}
                            style={{
                              color: 'var(--text-secondary)',
                              fontSize: '12px',
                              padding: '2px 4px',
                              minWidth: 'auto',
                              height: 'auto'
                            }}
                          />
                        </Tooltip>
                      )}
                    </div>

                    {/* 文件夹内容 */}
                    {folder.expanded && folder.files.map((file) => (
                      <div
                        key={file.id}
                        style={{
                          padding: '8px 12px 8px 32px', // 增加左边距表示缩进
                          cursor: 'pointer',
                          background: selectedFile === file.id ? '#1D242A' : 'transparent',
                          color: selectedFile === file.id ? 'white' : 'var(--text-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => onFileSelect(file.id)}
                        onMouseEnter={(e) => {
                          setHoveredFileId(file.id);
                          if (selectedFile !== file.id) {
                            e.currentTarget.style.background = '#1D242A';
                          }
                        }}
                        onMouseLeave={(e) => {
                          setHoveredFileId(null);
                          if (selectedFile !== file.id) {
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FileOutlined style={{ 
                            color: selectedFile === file.id ? 'white' : 'var(--text-secondary)',
                            fontSize: '12px'
                          }} />
                          <span style={{
                fontSize: '12px',
                            color: selectedFile === file.id ? 'white' : 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '120px'
                          }}>
                            {file.name}
                          </span>
                        </div>
                        {/* 悬浮时显示的操作按钮 */}
                        {hoveredFileId === file.id && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Tooltip title="重命名">
                              <Button
                                type="text"
                                size="small"
                                icon={<EditOutlined />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // TODO: 实现重命名功能
                                  message.info('重命名功能待实现');
                                }}
                                style={{
                                  color: selectedFile === file.id ? 'white' : 'var(--text-secondary)',
                                  background: 'transparent',
                                  border: 'none',
                                  padding: '2px 4px',
                                  minWidth: 'auto',
                                  fontSize: '12px'
                                }}
                              />
                            </Tooltip>
                            <Tooltip title="删除">
                              <Button
                                type="text"
                                size="small"
                                icon={<DeleteOutlined />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onFileDelete(file.id);
                                }}
                                style={{
                                  color: selectedFile === file.id ? 'white' : 'var(--text-secondary)',
                                  background: 'transparent',
                                  border: 'none',
                                  padding: '2px 4px',
                                  minWidth: 'auto',
                                  fontSize: '12px'
                                }}
                              />
                            </Tooltip>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 文件加载弹窗 */}
      <Modal
        title="Exist Files"
        open={fileLoadModalVisible}
        onCancel={() => setFileLoadModalVisible(false)}
        footer={null}
        width={800}
        style={{
          top: 20
        }}
      >
        {/* Upload File 按钮 */}
        <div style={{ marginBottom: '16px' }}>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={handleUploadFile}
            style={{
              background: 'var(--primary)',
              borderColor: 'var(--primary)'
            }}
          >
            Upload File
          </Button>
        </div>
        <Table
          dataSource={fileManagementFiles}
          loading={loadingFiles}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} files`
          }}
          columns={[
            {
              title: 'File Name',
              dataIndex: 'original_name',
              key: 'original_name',
              render: (text, record) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileOutlined style={{ color: 'var(--text-secondary)' }} />
                  <span>{text}</span>
                </div>
              )
            },
            {
              title: 'Size',
              dataIndex: 'file_size',
              key: 'file_size',
              render: (size) => `${(size / 1024 / 1024).toFixed(2)}MB`,
              width: 100
            },
            {
              title: 'Modified',
              dataIndex: 'updated_at',
              key: 'updated_at',
              render: (date) => new Date(date).toLocaleString(),
              width: 180,
              sorter: (a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
              defaultSortOrder: 'descend'
            },
            {
              title: 'Actions',
              key: 'actions',
              width: 100,
              render: (_, record) => (
                <Button
                  type="primary"
                  size="small"
                  onClick={() => handleLoadFileFromManagement(record)}
                >
                  Load
                </Button>
              )
            }
          ]}
          scroll={{ y: 400 }}
        />
      </Modal>
    </div>
    </>
  );
};

export default FileManager;