import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Input, 
  message, 
  Space, 
  Tag, 
  Tooltip,
  Modal,
  Form,
  Select,
  Tree,
  Row,
  Col
} from 'antd';
import { 
  UploadOutlined, 
  SearchOutlined, 
  EyeOutlined, 
  DownloadOutlined, 
  DeleteOutlined,
  FolderOutlined,
  FileOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  PlusOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { DataNode } from 'antd/es/tree';
import { fileManagementService, FileItem } from '../services/fileManagementService';

const { Search } = Input;
const { Option } = Select;

interface ModuleItem {
  key: string;
  title: string;
  children?: ModuleItem[];
  count?: number;
}

const FileManagement: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedModule, setSelectedModule] = useState<string>('all-files');
  const [addFolderModalVisible, setAddFolderModalVisible] = useState(false);
  const [addFolderForm] = Form.useForm();
  const [subFolders, setSubFolders] = useState<DataNode[]>(() => {
    // 从localStorage加载保存的目录结构
    const saved = localStorage.getItem('fileManagementFolders');
    return saved ? JSON.parse(saved) : [];
  });

  // 根据选中的模块动态获取文件列表
  const getFilesForModule = async (moduleKey: string): Promise<FileItem[]> => {
    try {
      const path = moduleKey === 'all-files' ? '/' : `/${moduleKey}/`;
      const recursive = moduleKey !== 'all-files'; // 对于子目录，使用递归查询
      console.log('Fetching files for path:', path, 'recursive:', recursive);
      
      const result = await fileManagementService.getFiles(path, recursive);
      console.log('API Response:', result);
      return result.files || [];
    } catch (error) {
      console.error('Error fetching files:', error);
      // 如果API失败，返回空数组而不是抛出错误
      return [];
    }
  };

  // Module tree data
  const moduleTreeData: DataNode[] = [
    {
      title: '',
      key: 'all-files',
      children: subFolders
    }
  ];

  useEffect(() => {
    const loadFiles = async () => {
      setLoading(true);
      try {
        const files = await getFilesForModule(selectedModule);
        setFiles(files);
      } catch (error) {
        console.error('Error loading files:', error);
        setFiles([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadFiles();
  }, [selectedModule]);

  const handleSearch = (value: string) => {
    setSearchText(value);
    // Add search logic here
  };

  const handleAddFolder = async (values: any) => {
    try {
      const newFolder: DataNode = {
        title: values.folderName,
        key: `folder-${Date.now()}`,
        children: []
      };
      
      const updatedFolders = [...subFolders, newFolder];
      setSubFolders(updatedFolders);
      
      // 保存到localStorage
      localStorage.setItem('fileManagementFolders', JSON.stringify(updatedFolders));
      
      message.success('Subdirectory created successfully');
      setAddFolderModalVisible(false);
      addFolderForm.resetFields();
    } catch (error) {
      message.error('Failed to create subdirectory');
    }
  };

  const handleAddSubFolder = async (values: any, parentKey: string) => {
    try {
      const newSubFolder: DataNode = {
        title: values.folderName,
        key: `subfolder-${Date.now()}`,
        children: []
      };
      
      const updateFolders = (folders: DataNode[]): DataNode[] => {
        return folders.map(folder => {
          if (folder.key === parentKey) {
            return {
              ...folder,
              children: [...(folder.children || []), newSubFolder]
            };
          }
          return folder;
        });
      };
      
      const updatedFolders = updateFolders(subFolders);
      setSubFolders(updatedFolders);
      
      // 保存到localStorage
      localStorage.setItem('fileManagementFolders', JSON.stringify(updatedFolders));
      
      message.success('Subdirectory created successfully');
      setAddFolderModalVisible(false);
      addFolderForm.resetFields();
    } catch (error) {
      message.error('Failed to create subdirectory');
    }
  };

  const handleUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // 确定上传目录
      const uploadPath = selectedModule === 'all-files' ? '/' : `/${selectedModule}/`;
      formData.append('path', uploadPath);
      
      // 使用新的文件管理服务上传
      const result = await fileManagementService.uploadFile(formData);
      console.log('Upload result:', result);
      
      message.success(`File "${file.name}" uploaded successfully to ${uploadPath}`);
      
      // 刷新文件列表
      const updatedFiles = await getFilesForModule(selectedModule);
      setFiles(updatedFiles);
    } catch (error) {
      message.error('File upload failed');
      console.error('Upload error:', error);
    }
  };

  const handleFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = false;
    input.accept = '*/*';
    
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        handleUpload(file);
      }
    };
    
    input.click();
  };

  const handleView = (record: FileItem) => {
    message.info(`View file: ${record.original_name}`);
  };

  const handleDownload = (record: FileItem) => {
    message.info(`Download file: ${record.original_name}`);
  };

  const handleDelete = (record: FileItem) => {
    Modal.confirm({
      title: 'Confirm Delete',
      content: `Are you sure you want to delete file "${record.original_name}"?`,
      onOk: async () => {
        try {
          await fileManagementService.deleteFile(record.id);
          message.success('File deleted successfully');
          
          // 刷新文件列表
          const updatedFiles = await getFilesForModule(selectedModule);
          setFiles(updatedFiles);
        } catch (error) {
          message.error('File delete failed');
          console.error('Delete error:', error);
        }
      }
    });
  };

  const getFileTypeColor = (type: string) => {
    const colorMap: { [key: string]: string } = {
      'JAR': 'blue',
      'JMX': 'green',
      'JS': 'orange',
      'ZIP': 'purple',
      'JAVA': 'red',
      'TXT': 'default'
    };
    return colorMap[type] || 'default';
  };

  const columns: ColumnsType<FileItem> = [
    {
      title: 'File Name',
      dataIndex: 'original_name',
      key: 'original_name',
      sorter: (a, b) => a.original_name.localeCompare(b.original_name),
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
      sorter: (a, b) => a.file_size - b.file_size,
      render: (size) => `${(size / 1024 / 1024).toFixed(2)}MB`
    },
    {
      title: 'Type',
      dataIndex: 'file_type',
      key: 'file_type',
      render: (_, record) => {
        const fileType = record.original_name.split('.').pop()?.toUpperCase() || 'UNKNOWN';
        return (
          <Tag color={getFileTypeColor(fileType)}>
            {fileType}
          </Tag>
        );
      }
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (text) => text || '-'
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Updated',
      dataIndex: 'updated_at',
      key: 'updated_at',
      sorter: (a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Actions',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Download">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              onClick={() => handleDownload(record)}
              style={{ color: '#10b981' }}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              type="text"
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
              style={{ color: '#ef4444' }}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div style={{ 
      padding: '24px',
      background: 'var(--bg-primary)',
      minHeight: '100vh'
    }}>
      <style>
        {`
          .dark-tree .ant-tree {
            background: #07070D !important;
            color: #ffffff !important;
          }
          .dark-tree .ant-tree-list {
            background: #07070D !important;
          }
          .dark-tree .ant-tree-treenode {
            background: #07070D !important;
          }
          .dark-tree .ant-tree .ant-tree-node-content-wrapper {
            background: transparent !important;
            color: #ffffff !important;
          }
          .dark-tree .ant-tree .ant-tree-node-content-wrapper:hover {
            background: #2D3748 !important;
          }
          .dark-tree .ant-tree .ant-tree-node-content-wrapper.ant-tree-node-selected {
            background: #2D3748 !important;
            color: #ffffff !important;
          }
          .dark-tree .ant-tree .ant-tree-node-content-wrapper.ant-tree-node-selected .ant-tree-title {
            color: #ffffff !important;
          }
          .dark-tree .ant-tree .ant-tree-node-content-wrapper.ant-tree-node-selected .ant-tree-iconEle {
            color: #a0aec0 !important;
          }
          .dark-tree .ant-tree .ant-tree-title {
            color: #ffffff !important;
          }
          .dark-tree .ant-tree .ant-tree-switcher .ant-tree-switcher-icon {
            color: #a0aec0 !important;
          }
          .dark-tree .ant-tree .ant-tree-treenode {
            padding-left: 0 !important;
            margin-left: 0 !important;
          }
          .dark-tree .ant-tree .ant-tree-node-content-wrapper {
            padding-left: 0 !important;
            margin-left: 0 !important;
          }
          .dark-tree .ant-tree .ant-tree-switcher {
            display: block !important;
            width: 12px !important;
            margin-right: 2px !important;
            padding: 0 !important;
          }
          .dark-tree .ant-tree .ant-tree-child-tree {
            padding-left: 0 !important;
          }
          .dark-tree .ant-tree .ant-tree-indent {
            display: none !important;
          }
          .ant-table-thead > tr > th .ant-table-column-title {
            text-transform: none !important;
          }
          .dark-tree .ant-tree .ant-tree-node-content-wrapper.ant-tree-node-selected:hover {
            background: #2D3748 !important;
            color: #ffffff !important;
          }
          .dark-tree .ant-tree .ant-tree-node-content-wrapper.ant-tree-node-selected:hover .ant-tree-title {
            color: #ffffff !important;
          }
          .dark-tree .ant-tree .ant-tree-node-content-wrapper.ant-tree-node-selected:hover .ant-tree-iconEle {
            color: #a0aec0 !important;
          }
          .dark-tree .ant-tree .ant-tree-node-content-wrapper.ant-tree-node-selected {
            background: #1A192E !important;
            color: #ffffff !important;
          }
          .dark-tree .ant-tree .ant-tree-node-content-wrapper.ant-tree-node-selected * {
            color: #ffffff !important;
          }
          .dark-tree .ant-tree .ant-tree-node-content-wrapper.ant-tree-node-selected .ant-tree-iconEle {
            color: #a0aec0 !important;
          }
          .dark-tree .ant-tree .ant-tree-treenode.ant-tree-treenode-selected .ant-tree-node-content-wrapper {
            background: #1A192E !important;
          }
          .dark-tree .ant-tree .ant-tree-treenode.ant-tree-treenode-selected .ant-tree-node-content-wrapper * {
            color: #ffffff !important;
          }
          .dark-tree .ant-tree .ant-tree-treenode.ant-tree-treenode-selected .ant-tree-node-content-wrapper .ant-tree-iconEle {
            color: #a0aec0 !important;
          }
          .dark-tree .ant-tree .ant-tree-treenode-selected .ant-tree-node-content-wrapper {
            background: #1A192E !important;
          }
          .dark-tree .ant-tree .ant-tree-treenode-selected .ant-tree-node-content-wrapper * {
            color: #ffffff !important;
          }
          .dark-tree .ant-tree .ant-tree-treenode-selected .ant-tree-node-content-wrapper .ant-tree-iconEle {
            color: #a0aec0 !important;
          }
          .dark-tree .ant-tree .ant-tree-treenode-selected .ant-tree-title {
            color: #ffffff !important;
          }
          .dark-tree .ant-tree .ant-tree-node-content-wrapper[aria-selected="true"] {
            background: #1A192E !important;
          }
          .dark-tree .ant-tree .ant-tree-node-content-wrapper[aria-selected="true"] * {
            color: #ffffff !important;
          }
          .dark-tree .ant-tree .ant-tree-node-content-wrapper[aria-selected="true"] .ant-tree-iconEle {
            color: #a0aec0 !important;
          }
          .dark-tree .ant-tree .ant-tree-node-content-wrapper.ant-tree-node-selected {
            background: #1A192E !important;
            border-radius: 4px !important;
          }
          .dark-tree .ant-tree .ant-tree-node-content-wrapper.ant-tree-node-selected:hover {
            background: #1A192E !important;
          }
          .dark-tree .ant-tree .ant-tree-node-content-wrapper.ant-tree-node-selected:focus {
            background: #1A192E !important;
          }
          .dark-tree .ant-tree .ant-tree-node-content-wrapper[style*="background"] {
            background: #1A192E !important;
          }
          .dark-tree .ant-tree .ant-tree-node-content-wrapper[style*="E7F4FF"] {
            background: #1A192E !important;
          }
          .dark-tree .ant-tree .ant-tree-treenode[data-key="all-files"] .ant-tree-node-content-wrapper .ant-tree-title {
            display: none !important;
          }
          .dark-tree .ant-tree .ant-tree-treenode[data-key="all-files"] .ant-tree-node-content-wrapper .ant-tree-iconEle {
            display: none !important;
          }
          .dark-tree .ant-tree .ant-tree-treenode[data-key="all-files"] .ant-tree-node-content-wrapper {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
          }
          .dark-tree .ant-tree .ant-tree-treenode[data-key="all-files"] .ant-tree-node-content-wrapper::before {
            display: none !important;
          }
          .dark-tree .ant-tree .ant-tree-treenode[data-key="all-files"] .ant-tree-node-content-wrapper::after {
            display: none !important;
          }
          .dark-tree .ant-tree .ant-tree-treenode:not([data-key="all-files"]) .ant-tree-node-content-wrapper {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
          }
          .dark-tree .ant-tree .ant-tree-treenode:not([data-key="all-files"]) .ant-tree-node-content-wrapper.ant-tree-node-selected {
            background: transparent !important;
          }
          .dark-tree .ant-tree .ant-tree-treenode:not([data-key="all-files"]) .ant-tree-node-content-wrapper .ant-tree-title {
            display: none !important;
          }
          .dark-tree .ant-tree .ant-tree-treenode:not([data-key="all-files"]) .ant-tree-node-content-wrapper .ant-tree-iconEle {
            display: none !important;
          }
          .dark-tree .ant-tree .ant-tree-treenode .ant-tree-node-content-wrapper.ant-tree-node-selected {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
          }
          .dark-tree .ant-tree .ant-tree-treenode .ant-tree-node-content-wrapper[aria-selected="true"] {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
          }
          .dark-tree .ant-tree .ant-tree-treenode .ant-tree-node-content-wrapper[style*="background"] {
            background: transparent !important;
          }
          .dark-tree .ant-tree .ant-tree-treenode .ant-tree-node-content-wrapper[style*="E7F4FF"] {
            background: transparent !important;
          }
        `}
      </style>
      <Row gutter={24}>
        {/* Left Module Tree */}
        <Col span={4}>
          <div 
            style={{ 
              height: 'calc(100vh - 120px)',
              background: '#07070D',
              border: '1px solid #333333',
              borderRadius: '8px',
              padding: '12px',
              color: '#ffffff'
            }}
          >
            <Tree
              showIcon
              defaultExpandAll
              treeData={moduleTreeData}
              onSelect={(selectedKeys) => {
                if (selectedKeys.length > 0) {
                  setSelectedModule(selectedKeys[0] as string);
                }
              }}
              className="dark-tree"
              style={{
                background: 'transparent',
                color: '#ffffff',
                paddingLeft: '0px'
              }}
              selectedKeys={selectedModule ? [selectedModule] : []}
              blockNode={false}
              titleRender={(nodeData) => {
                if (nodeData.key === 'all-files') {
                  return (
                    <div 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        width: '100%',
                        position: 'relative',
                        marginLeft: '0px',
                        paddingLeft: '0px'
                      }}
                      onMouseEnter={(e) => {
                        const button = e.currentTarget.querySelector('.add-folder-btn');
                        if (button) {
                          (button as HTMLElement).style.display = 'flex';
                        }
                      }}
                      onMouseLeave={(e) => {
                        const button = e.currentTarget.querySelector('.add-folder-btn');
                        if (button) {
                          (button as HTMLElement).style.display = 'none';
                        }
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        marginLeft: '0px',
                        paddingLeft: '0px',
                        background: selectedModule === 'all-files' ? '#1A192E' : 'transparent',
                        borderRadius: '4px',
                        padding: '4px 8px'
                      }}>
                        <FolderOutlined style={{ color: '#ffffff', fontSize: '16px' }} />
                        <span style={{ 
                          color: '#ffffff', 
                          fontSize: '14px',
                          fontWeight: '500',
                          whiteSpace: 'nowrap'
                        }}>All Files</span>
                      </div>
                      <Button
                        className="add-folder-btn"
                        type="text"
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setAddFolderModalVisible(true);
                        }}
                        style={{
                          width: '20px',
                          height: '20px',
                          minWidth: '20px',
                          padding: '0',
                          borderRadius: '50%',
                          display: 'none',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#2D3748',
                          border: '1px solid #4A5568',
                          color: '#a0aec0'
                        }}
                      />
                    </div>
                  );
                }
                // 处理子模块的选中状态
                const isSelected = selectedModule === nodeData.key;
                const isFirstLevel = !String(nodeData.key).startsWith('subfolder-');
                const canAddSubFolder = isFirstLevel && (!nodeData.children || nodeData.children.length === 0);
                
                return (
                  <div 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      const button = e.currentTarget.querySelector('.add-subfolder-btn');
                      if (button && canAddSubFolder) {
                        (button as HTMLElement).style.display = 'flex';
                      }
                    }}
                    onMouseLeave={(e) => {
                      const button = e.currentTarget.querySelector('.add-subfolder-btn');
                      if (button) {
                        (button as HTMLElement).style.display = 'none';
                      }
                    }}
                  >
                    <div style={{
                      background: isSelected ? '#1A192E' : 'transparent',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <FolderOutlined style={{ color: '#a0aec0', fontSize: '14px' }} />
                      <span style={{ color: '#ffffff', fontSize: '14px' }}>{String(nodeData.title)}</span>
                    </div>
                    {canAddSubFolder && (
                      <Button
                        className="add-subfolder-btn"
                        type="text"
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedModule(nodeData.key as string);
                          setAddFolderModalVisible(true);
                        }}
                        style={{
                          width: '20px',
                          height: '20px',
                          minWidth: '20px',
                          padding: '0',
                          borderRadius: '50%',
                          display: 'none',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#2D3748',
                          border: '1px solid #4A5568',
                          color: '#a0aec0'
                        }}
                      />
                    )}
                  </div>
                );
              }}
            />
          </div>
        </Col>

        {/* Right File List */}
        <Col span={20}>
          <Card 
            style={{ 
              height: 'calc(100vh - 120px)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)'
            }}
            bodyStyle={{ padding: '16px' }}
          >
            {/* Toolbar */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <Button 
                  type="primary" 
                  icon={<UploadOutlined />}
                  onClick={handleFileSelect}
                >
                  Upload
                </Button>
                <Search
                  placeholder="Search by name"
                  style={{ width: 200 }}
                  onSearch={handleSearch}
                />
              </div>
            </div>

            {/* File Table */}
            <Table
              columns={columns}
              dataSource={files}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} of ${total} items`
              }}
              scroll={{ y: 'calc(100vh - 300px)' }}
              style={{
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)'
              }}
            />
          </Card>
        </Col>
      </Row>


      {/* Create Subdirectory Modal */}
      <Modal
        title="Create Subdirectory"
        open={addFolderModalVisible}
        onCancel={() => setAddFolderModalVisible(false)}
        footer={null}
        width={400}
      >
        <Form
          form={addFolderForm}
          layout="vertical"
          onFinish={(values) => {
            if (selectedModule === 'all-files') {
              handleAddFolder(values);
            } else {
              handleAddSubFolder(values, selectedModule);
            }
          }}
        >
          <Form.Item
            name="folderName"
            label="Directory Name"
            rules={[{ required: true, message: 'Please enter directory name' }]}
          >
            <Input placeholder="Please enter directory name" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setAddFolderModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Create
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default FileManagement;
