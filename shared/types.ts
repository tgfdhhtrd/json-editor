/**
 * 共享类型定义文件
 * 定义前后端共用的接口类型
 */

// 文件信息接口
export interface FileInfo {
  name: string;
  path: string;
  size: number;
  lastModified: string;
  type: 'file' | 'directory';
}

// JSON节点类型
export type JsonValueType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';

// JSON节点接口
export interface JsonNode {
  key: string;
  value: any;
  type: JsonValueType;
  depth: number;
  expanded: boolean;
  parent?: string;
  children?: { [key: string]: JsonNode } | JsonNode[]; // 对象类型用对象，数组类型用数组
  path: string[]; // 节点在JSON中的路径
  // 父层级显示配置
  parentDisplayConfig?: {
    selectedChildren: Array<{
      containerIndex: number; // 容器索引 (0-4)
      childPath: string[]; // 子层级路径
      childKey: string; // 子层级键名
      childValue: any; // 子层级值
      displayText: string; // 显示文本
    }>;
  };
}

// 编辑历史接口
export interface EditHistory {
  id: string;
  before: any;
  after: any;
  timestamp: string;
  operation: 'add' | 'edit' | 'delete' | 'move';
  path: string[];
}

// API响应基础接口
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 文件列表响应接口
export interface FilesResponse {
  files: FileInfo[];
  success: boolean;
}

// JSON文件内容响应接口
export interface JsonFileResponse {
  content: any;
  metadata: {
    name: string;
    size: number;
    lastModified: string;
    encoding: string;
  };
}

// 文件保存请求接口
export interface SaveFileRequest {
  content: any;
  preserveFormat?: boolean;
}

// 文件导入响应接口
export interface ImportResponse {
  content: any;
  filename: string;
  success: boolean;
}

// 文件导出请求接口
export interface ExportRequest {
  content: any;
  format?: 'pretty' | 'compact' | 'original';
  filename: string;
}

// 导出格式选项
export interface ExportOptions {
  format: 'pretty' | 'compact' | 'original';
  indent?: number;
  preserveOrder?: boolean;
}

// 编辑器状态接口
export interface EditorState {
  currentFile: string | null;
  jsonContent: any;
  jsonData: JsonNode | null; // 计算属性：将jsonContent转换为JsonNode格式
  editHistory: EditHistory[];
  currentHistoryIndex: number;
  isModified: boolean;
}

// 树节点展开状态
export interface TreeNodeState {
  [path: string]: boolean;
}