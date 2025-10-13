import React, { useState, useRef, useEffect } from 'react';
import { Editor } from '@monaco-editor/react';
import { Button, Upload, message, Space, Typography, Card, Row, Col } from 'antd';
import { UploadOutlined, SaveOutlined, FileTextOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import * as monaco from 'monaco-editor';

const { Text } = Typography;

interface ScriptEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  onSave?: (content: string, fileName: string) => void;
  fileName?: string;
  readOnly?: boolean;
  height?: string | number;
}

interface SyntaxValidationResult {
  isValid: boolean;
  errors: Array<{
    line: number;
    column: number;
    message: string;
  }>;
}

const ScriptEditor: React.FC<ScriptEditorProps> = ({
  value = '',
  onChange,
  onSave,
  fileName = 'locustfile.py',
  readOnly = false,
  height = '400px'
}) => {
  const [editorValue, setEditorValue] = useState(value);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<SyntaxValidationResult | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  // 立即设置主题，防止白色闪烁
  useEffect(() => {
    monaco.editor.setTheme('vs-dark');
  }, []);

  // 监听编辑器值变化，确保主题始终正确
  useEffect(() => {
    if (editorRef.current) {
      monaco.editor.setTheme('vs-dark');
    }
  }, [editorValue]);

  // 监听外部value变化，同步到编辑器
  useEffect(() => {
    if (value !== editorValue && editorRef.current) {
      setEditorValue(value);
      // 确保编辑器内容正确更新
      editorRef.current.setValue(value);
    }
  }, [value]);

  // 初始化Monaco Editor配置
  useEffect(() => {
    // 首先设置主题，确保编辑器创建时就有正确的主题
    monaco.editor.setTheme('vs-dark');
    
    // 配置Python语言支持
    monaco.languages.register({ id: 'python' });
    
    // 设置Python语法高亮
    monaco.languages.setMonarchTokensProvider('python', {
      tokenizer: {
        root: [
          [/def\s+(\w+)/, 'keyword.function'],
          [/class\s+(\w+)/, 'keyword.class'],
          [/import\s+(\w+)/, 'keyword.import'],
          [/from\s+(\w+)/, 'keyword.import'],
          [/if\s+/, 'keyword'],
          [/else\s*:/, 'keyword'],
          [/elif\s+/, 'keyword'],
          [/for\s+/, 'keyword'],
          [/while\s+/, 'keyword'],
          [/try\s*:/, 'keyword'],
          [/except\s+/, 'keyword'],
          [/finally\s*:/, 'keyword'],
          [/with\s+/, 'keyword'],
          [/as\s+/, 'keyword'],
          [/return\s+/, 'keyword'],
          [/yield\s+/, 'keyword'],
          [/lambda\s+/, 'keyword'],
          [/and\b/, 'keyword'],
          [/or\b/, 'keyword'],
          [/not\b/, 'keyword'],
          [/in\b/, 'keyword'],
          [/is\b/, 'keyword'],
          [/True\b/, 'constant'],
          [/False\b/, 'constant'],
          [/None\b/, 'constant'],
          [/#.*$/, 'comment'],
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/"/, 'string', '@string'],
          [/'([^'\\]|\\.)*$/, 'string.invalid'],
          [/'/, 'string', '@string_single'],
          [/\d*\.\d+([eE][-+]?\d+)?/, 'number.float'],
          [/0[xX][0-9a-fA-F]+/, 'number.hex'],
          [/\d+/, 'number'],
          [/[{}()[\]\\]/, '@brackets'],
          [/[;,.]/, 'delimiter'],
          [/\s+/, 'white'],
          [/[a-zA-Z_$][a-zA-Z0-9_$]*/, 'identifier']
        ],
        string: [
          [/[^\\"]+/, 'string'],
          [/\\./, 'string.escape'],
          [/"/, 'string', '@pop']
        ],
        string_single: [
          [/[^\\']+/, 'string'],
          [/\\./, 'string.escape'],
          [/'/, 'string', '@pop']
        ]
      }
    });

    // 设置编辑器主题
    monaco.editor.defineTheme('pfp-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '569cd6', fontStyle: 'bold' },
        { token: 'keyword.function', foreground: 'dcdcaa', fontStyle: 'bold' },
        { token: 'keyword.class', foreground: '4ec9b0', fontStyle: 'bold' },
        { token: 'keyword.import', foreground: '569cd6', fontStyle: 'bold' },
        { token: 'string', foreground: 'ce9178' },
        { token: 'number', foreground: 'b5cea8' },
        { token: 'number.float', foreground: 'b5cea8' },
        { token: 'number.hex', foreground: 'b5cea8' },
        { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
        { token: 'constant', foreground: '4fc1ff', fontStyle: 'bold' },
        { token: 'identifier', foreground: '9cdcfe' },
        { token: 'delimiter', foreground: 'd4d4d4' },
        { token: 'brackets', foreground: 'd4d4d4' },
        { token: 'operator', foreground: 'd4d4d4' },
        { token: 'type', foreground: '4ec9b0' },
        { token: 'variable', foreground: '9cdcfe' },
        { token: 'parameter', foreground: '9cdcfe' }
      ],
      colors: {
        'editor.background': '#0f0f23',
        'editor.foreground': '#d4d4d4',
        'editorLineNumber.foreground': '#858585',
        'editorLineNumber.activeForeground': '#c6c6c6',
        'editor.selectionBackground': '#264f78',
        'editor.inactiveSelectionBackground': '#3a3d41',
        'editorCursor.foreground': '#ffffff',
        'editorCursor.background': '#0f0f23',
        'editorWhitespace.foreground': '#404040',
        'editor.lineHighlightBackground': '#1a1a2e',
        'editor.lineHighlightBorder': '#1a1a2e',
        'editorIndentGuide.background': '#404040',
        'editorIndentGuide.activeBackground': '#707070',
        'editorBracketMatch.background': '#0e639c50',
        'editorBracketMatch.border': '#888888',
        'editor.findMatchBackground': '#515c6a',
        'editor.findMatchHighlightBackground': '#ea5c0055',
        'editor.hoverHighlightBackground': '#264f7840',
        'editorLink.activeForeground': '#4e94ce',
        'editorWidget.background': '#252526',
        'editorWidget.border': '#454545',
        'editorSuggestWidget.background': '#252526',
        'editorSuggestWidget.border': '#454545',
        'editorSuggestWidget.foreground': '#cccccc',
        'editorSuggestWidget.highlightForeground': '#0097fb',
        'editorSuggestWidget.selectedBackground': '#094771'
      }
    });

    // 立即设置主题
    monaco.editor.setTheme('vs-dark');
  }, []);

  // 处理编辑器值变化
  const handleEditorChange = (newValue: string | undefined) => {
    const content = newValue || '';
    setEditorValue(content);
    setIsDirty(content !== value);
    onChange?.(content);
  };

  // 处理编辑器挂载
  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    
    // 设置编辑器配置
    editor.updateOptions({
      fontSize: 14,
      fontFamily: 'Monaco, "Menlo", "Ubuntu Mono", Consolas, "Courier New", monospace',
      lineNumbers: 'on',
      roundedSelection: false,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      minimap: { enabled: false },
      wordWrap: 'on',
      tabSize: 4,
      insertSpaces: true,
      detectIndentation: false,
      cursorBlinking: 'blink',
      cursorStyle: 'line',
      renderLineHighlight: 'line',
      selectionHighlight: true,
      occurrencesHighlight: 'singleFile',
      bracketPairColorization: { enabled: true }
    });

    // 确保主题正确应用
    monaco.editor.setTheme('vs-dark');
    
    // 强制设置编辑器背景色
    editor.updateOptions({
      theme: 'vs-dark'
    });
    
    // 确保编辑器内容正确设置
    if (editorValue) {
      editor.setValue(editorValue);
    }
    
    // 延迟再次设置主题，确保生效
    setTimeout(() => {
      monaco.editor.setTheme('vs-dark');
      // 再次确保内容正确
      if (editorValue) {
        editor.setValue(editorValue);
      }
    }, 100);
  };

  // Python语法验证
  const validatePythonSyntax = async (code: string): Promise<SyntaxValidationResult> => {
    // 简单的Python语法检查
    const errors: Array<{ line: number; column: number; message: string }> = [];
    
    try {
      // 检查基本的语法错误
      const lines = code.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;
        
        // 检查缩进错误
        if (line.trim() && !line.startsWith(' ') && !line.startsWith('\t') && 
            (line.includes(':') && !line.trim().endsWith(':'))) {
          // 这可能是缩进问题，但需要更复杂的检查
        }
        
        // 检查括号匹配
        const openParens = (line.match(/\(/g) || []).length;
        const closeParens = (line.match(/\)/g) || []).length;
        const openBrackets = (line.match(/\[/g) || []).length;
        const closeBrackets = (line.match(/\]/g) || []).length;
        const openBraces = (line.match(/\{/g) || []).length;
        const closeBraces = (line.match(/\}/g) || []).length;
        
        if (openParens !== closeParens || openBrackets !== closeBrackets || openBraces !== closeBraces) {
          errors.push({
            line: lineNumber,
            column: 0,
            message: '括号不匹配'
          });
        }
        
        // 检查字符串引号匹配
        const singleQuotes = (line.match(/'/g) || []).length;
        const doubleQuotes = (line.match(/"/g) || []).length;
        
        if (singleQuotes % 2 !== 0 && doubleQuotes % 2 !== 0) {
          errors.push({
            line: lineNumber,
            column: 0,
            message: '字符串引号不匹配'
          });
        }
      }
      
      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          line: 1,
          column: 0,
          message: '语法检查失败'
        }]
      };
    }
  };

  // 执行语法验证
  const handleValidate = async () => {
    if (!editorValue.trim()) {
      message.warning('请先输入代码内容');
      return;
    }

    setIsValidating(true);
    try {
      const result = await validatePythonSyntax(editorValue);
      setValidationResult(result);
      
      if (result.isValid) {
        message.success('语法检查通过');
      } else {
        message.error(`发现 ${result.errors.length} 个语法错误`);
      }
    } catch (error) {
      message.error('语法检查失败');
    } finally {
      setIsValidating(false);
    }
  };

  // 保存脚本
  const handleSave = () => {
    if (!editorValue.trim()) {
      message.warning('请先输入代码内容');
      return;
    }
    
    onSave?.(editorValue, fileName);
    setIsDirty(false);
    message.success('脚本保存成功');
  };

  // 处理文件上传
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setEditorValue(content);
      setIsDirty(true);
      onChange?.(content);
      message.success(`文件 ${file.name} 加载成功`);
    };
    reader.readAsText(file);
    return false; // 阻止默认上传行为
  };

  // 上传配置
  const uploadProps = {
    beforeUpload: handleFileUpload,
    accept: '.py',
    showUploadList: false,
    multiple: false
  };

  return (
    <Card 
      title={
        <Space>
          <FileTextOutlined />
          <Text strong>脚本编辑器</Text>
          {isDirty && <Text type="warning">(未保存)</Text>}
        </Space>
      }
      style={{ 
        background: '#0f0f23',
        border: '1px solid #2d3748'
      }}
      bodyStyle={{ padding: '16px' }}
    >
      <Row gutter={[16, 16]}>
        {/* 工具栏 */}
        <Col span={24}>
          <Space wrap>
            <Upload {...uploadProps}>
              <Button 
                icon={<UploadOutlined />}
                style={{
                  background: 'linear-gradient(135deg, #4c63d2 0%, #5a67d8 100%)',
                  border: 'none',
                  color: '#fff'
                }}
              >
                上传脚本
              </Button>
            </Upload>
            
            <Button 
              icon={<CheckCircleOutlined />}
              onClick={handleValidate}
              loading={isValidating}
              style={{
                background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
                border: 'none',
                color: '#fff'
              }}
            >
              语法检查
            </Button>
            
            <Button 
              icon={<SaveOutlined />}
              onClick={handleSave}
              disabled={!isDirty}
              style={{
                background: isDirty 
                  ? 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)'
                  : '#555',
                border: 'none',
                color: '#fff'
              }}
            >
              保存脚本
            </Button>
          </Space>
        </Col>

        {/* 验证结果 */}
        {validationResult && (
          <Col span={24}>
            <Card 
              size="small"
              style={{ 
                background: validationResult.isValid ? '#f6ffed' : '#fff2f0',
                border: `1px solid ${validationResult.isValid ? '#b7eb8f' : '#ffccc7'}`
              }}
            >
              <Space>
                {validationResult.isValid ? (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                ) : (
                  <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                )}
                <Text 
                  style={{ 
                    color: validationResult.isValid ? '#52c41a' : '#ff4d4f' 
                  }}
                >
                  {validationResult.isValid 
                    ? '语法检查通过' 
                    : `发现 ${validationResult.errors.length} 个错误`
                  }
                </Text>
              </Space>
              
              {!validationResult.isValid && (
                <div style={{ marginTop: '8px' }}>
                  {validationResult.errors.map((error, index) => (
                    <div key={index} style={{ fontSize: '12px', color: '#ff4d4f' }}>
                      第 {error.line} 行: {error.message}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </Col>
        )}

        {/* 编辑器 */}
        <Col span={24}>
          <div 
            style={{ 
              border: '1px solid #2d3748',
              borderRadius: '6px',
              overflow: 'hidden',
              backgroundColor: '#1e1e1e' // 添加暗黑背景，防止白色闪烁
            }}
          >
            <Editor
              height={height}
              language="python"
              value={editorValue}
              onChange={handleEditorChange}
              onMount={handleEditorDidMount}
              beforeMount={(monaco) => {
                // 确保主题在编辑器创建前就设置好
                monaco.editor.setTheme('vs-dark');
              }}
              options={{
                readOnly,
                fontSize: 14,
                fontFamily: 'Monaco, "Menlo", "Ubuntu Mono", Consolas, "Courier New", monospace',
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                minimap: { enabled: false },
                wordWrap: 'on',
                tabSize: 4,
                insertSpaces: true,
                detectIndentation: false,
                cursorBlinking: 'blink',
                cursorStyle: 'line',
                renderLineHighlight: 'line',
                selectionHighlight: true,
                occurrencesHighlight: 'singleFile',
                bracketPairColorization: { enabled: true },
                theme: 'vs-dark'
              }}
            />
          </div>
        </Col>

        {/* 文件信息 */}
        <Col span={24}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            当前文件: {fileName} | 字符数: {editorValue.length} | 行数: {editorValue.split('\n').length}
          </Text>
        </Col>
      </Row>
    </Card>
  );
};

export default ScriptEditor;
