/**
 * 编辑器状态管理
 * 使用zustand管理JSON编辑器的全局状态
 */

import { create } from 'zustand';
import type {
  FileInfo,
  JsonNode,
  EditorState,
  TreeNodeState,
  JsonValueType
} from '../../shared/types';
import { PresetConfig, PresetManager } from '../types/preset';
import { presetManager } from '../utils/presetManager';
import { fileApi } from '../services/api';



interface EditorStore extends EditorState {
  // 文件相关状态
  files: FileInfo[];
  loading: boolean;
  error: string | null;
  
  // UI状态
  isFileManagerVisible: boolean;
  
  // 树状结构状态
  expandedNodes: TreeNodeState;
  selectedNodePath: string[];
  
  // 编辑相关状态
  isEditing: boolean;
  editingPath: string[];
  editingValue: any;
  
  // JSON数据状态
  jsonData: JsonNode | null;
  
  // 双数据结构：原始JSON和显示JSON副本
  originalJsonContent: any; // 原始JSON数据，不会被拖拽修改
  displayJsonContent: any;  // 显示用的JSON副本，会被拖拽修改
  displayJsonData: JsonNode | null; // 显示用的JSON树状数据
  
  // 父层级显示
  selectedNodesForParent: Array<{
    key: string;
    value: any;
    path: string[];
    type: string;
  }>;
  
  // 右键菜单状态
  contextMenu: {
    show: boolean;
    x: number;
    y: number;
    type: string;
    data: any;
  };
  
  // 层级结构视图状态
  hierarchyViewNodes: Array<{
    path: string[];
    key: string;
    value: any;
    type: string;
    fullPath: string;
  }>;
  
  // Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // UI操作
  toggleFileManager: () => void;
  setFileManagerVisible: (visible: boolean) => void;
  
  // 文件操作
  loadFiles: () => Promise<void>;
  loadFile: (filename: string) => Promise<void>;
  saveCurrentFile: () => Promise<void>;
  createNewFile: (filename: string, content?: any) => Promise<void>;
  deleteFile: (filename: string) => Promise<void>;
  
  // JSON内容操作
  setJsonContent: (content: any) => void;
  updateJsonValue: (path: string[], value: any) => void;
  addJsonProperty: (path: string[], key: string, value: any) => void;
  deleteJsonProperty: (path: string[]) => void;
  
  // 双数据结构操作
  updateDisplayJsonContent: (content: any) => void; // 更新显示用的JSON副本
  resetDisplayToOriginal: () => void; // 重置显示JSON为原始状态
  updateDisplayJsonData: () => void; // 更新显示用的JSON树状数据
  
  // 树状结构操作
  toggleNodeExpansion: (path: string) => void;
  expandAllNodes: () => void;
  collapseAllNodes: () => void;
  selectNode: (path: string[]) => void;
  
  // 编辑操作
  startEditing: (path: string[], value: any) => void;
  stopEditing: () => void;
  confirmEdit: () => void;
  cancelEdit: () => void;
  
  // 父层级显示操作
  setSelectedNodeForParent: (nodeData: { key: string; value: any; path: string[]; type: string; }) => void;
  removeSelectedNodeForParent: (nodeData: { key: string; value: any; path: string[]; type: string; }) => void;
  clearSelectedNodesForParent: () => void;
  
  // 全局同步容器选择状态
  globalSelectedContainerType: { containerIndex: number; childKey: string; childType: string } | null;
  setGlobalSelectedContainerType: (containerType: { containerIndex: number; childKey: string; childType: string } | null) => void;
  
  // 获取值的显示文本辅助函数
  getValueDisplay: (value: any, type: string) => string;
  
  // JSON数据更新
  updateJsonData: () => void;
  
  // 父层级容器配置操作
  setParentDisplayConfig: (parentPath: string[], containerIndex: number, childData: {
    childPath: string[];
    childKey: string;
    childValue: any;
    displayText: string;
  }) => void;
  removeParentDisplayConfig: (parentPath: string[], containerIndex: number) => void;
  getParentDisplayConfig: (parentPath: string[]) => any;
  
  // 右键菜单操作
  showContextMenu: (x: number, y: number, type: string, data: any) => void;
  hideContextMenu: () => void;
  
  // 层级结构视图操作
  addToHierarchyView: (path: string[]) => void;
  removeFromHierarchyView: (path: string[]) => void;
  clearHierarchyView: () => void;
  moveHierarchyNode: (fromIndex: number, toIndex: number) => void;
  updateHierarchyViewNodes: () => void;
  
  // 插件顺序更新操作
  updatePluginsOrder: (newOrder: string[]) => void;
  
  // 预设管理
  presetManager: PresetManager;
  presets: PresetConfig[];
  isPresetDialogOpen: boolean;
  isPresetManagementDialogOpen: boolean;
  
  // 预设操作
  loadPresets: () => Promise<void>;
  savePreset: (name: string, description?: string) => Promise<void>;
  applyPreset: (presetId: string) => Promise<void>;
  deletePreset: (presetId: string) => Promise<void>;
  setPresetDialogOpen: (open: boolean) => void;
  setPresetManagementDialogOpen: (open: boolean) => void;
  
  // 历史操作
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // 重置状态
  reset: () => void;
}



/**
 * 将JSON内容转换为树状节点结构
 */
function createJsonNode(obj: any, key: string, path: string[]): JsonNode {
  const type = getJsonValueType(obj);
  let children: any = undefined;
  
  if (type === 'object' && obj !== null) {
    children = {};
    Object.entries(obj).forEach(([childKey, childValue]) => {
      children[childKey] = createJsonNode(childValue, childKey, [...path, childKey]);
    });
  } else if (type === 'array') {
    children = obj.map((item: any, index: number) => 
      createJsonNode(item, index.toString(), [...path, index.toString()])
    );
  }
  
  return {
    key,
    value: obj,
    type,
    depth: path.length,
    expanded: false,
    path,
    children,

  };
}

/**
 * 获取JSON值的类型
 */
function getJsonValueType(value: any): JsonValueType {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'string';
}

/**
 * 根据路径获取JSON对象中的值
 */
function getValueByPath(obj: any, path: string[]): any {
  let current = obj;
  for (const key of path) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[key];
  }
  return current;
}

/**
 * 根据路径设置JSON对象中的值
 */
function setValueByPath(obj: any, path: string[], value: any): any {
  if (path.length === 0) {
    return value;
  }
  
  const newObj = JSON.parse(JSON.stringify(obj));
  let current = newObj;
  
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (current[key] === undefined) {
      current[key] = {};
    }
    current = current[key];
  }
  
  const lastKey = path[path.length - 1];
  current[lastKey] = value;
  
  return newObj;
}

/**
 * 根据路径删除JSON对象中的属性
 */
function deleteValueByPath(obj: any, path: string[]): any {
  if (path.length === 0) {
    return obj;
  }
  
  const newObj = JSON.parse(JSON.stringify(obj));
  let current = newObj;
  
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (current[key] === undefined) {
      return newObj;
    }
    current = current[key];
  }
  
  const lastKey = path[path.length - 1];
  if (Array.isArray(current)) {
    current.splice(parseInt(lastKey), 1);
  } else {
    delete current[lastKey];
  }
  
  return newObj;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  // 初始状态
  currentFile: null,
  jsonContent: null,
  editHistory: [],
  currentHistoryIndex: -1,
  isModified: false,
  files: [],
  loading: false,
  error: null,
  isFileManagerVisible: true,
  expandedNodes: {},
  selectedNodePath: [],
  isEditing: false,
  editingPath: [],
  editingValue: null,
  jsonData: null,
  selectedNodesForParent: [],
  
  // 右键菜单初始状态
  contextMenu: {
    show: false,
    x: 0,
    y: 0,
    type: '',
    data: null
  },
  
  // 双数据结构初始状态
  originalJsonContent: null,
  displayJsonContent: null,
  displayJsonData: null,
  
  // 层级结构视图初始状态
  hierarchyViewNodes: [],
  
  // 全局同步容器选择状态
  globalSelectedContainerType: null,
  
  // 预设相关状态
  presetManager: presetManager,
  presets: [],
  isPresetDialogOpen: false,
  isPresetManagementDialogOpen: false,

  // 基础操作
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  
  // UI操作
  toggleFileManager: () => {
    const { isFileManagerVisible } = get();
    set({ isFileManagerVisible: !isFileManagerVisible });
  },
  
  setFileManagerVisible: (visible) => {
    set({ isFileManagerVisible: visible });
  },

  // 文件操作
  loadFiles: async () => {
    console.log('🔄 [loadFiles] 开始加载文件列表...');
    const { files: currentFiles } = get();
    console.log('📋 [loadFiles] 当前文件列表:', currentFiles.map(f => f.name));
    
    set({ loading: true, error: null });
    try {
      console.log('📤 [loadFiles] 调用 fileApi.getFiles()...');
      const files = await fileApi.getFiles();
      console.log('✅ [loadFiles] API返回文件列表:', files.map(f => f.name));
      
      set({ files, loading: false });
      console.log('✅ [loadFiles] 状态更新完成，新文件列表已设置');
      
      // 验证状态是否真的更新了
      const { files: updatedFiles } = get();
      console.log('🔍 [loadFiles] 验证状态更新:', updatedFiles.map(f => f.name));
    } catch (error) {
      console.error('❌ [loadFiles] 文件列表加载失败:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load files',
        loading: false 
      });
    }
  },

  loadFile: async (filename) => {
    console.log('🔄 开始加载文件:', filename);
    set({ loading: true, error: null });
    try {
      const fileData = await fileApi.readFile(filename);
      console.log('✅ 文件数据接收:', {
        filename,
        dataType: typeof fileData,
        isNull: fileData === null,
        isUndefined: fileData === undefined,
        hasContent: fileData && typeof fileData === 'object' && 'content' in fileData
      });
      
      // 检查数据有效性
      let content;
      if (fileData && typeof fileData === 'object' && 'content' in fileData) {
        content = fileData.content;
      } else {
        // 如果直接返回的就是内容数据
        content = fileData;
      }
      
      if (content === undefined || content === null) {
        throw new Error('文件内容为空或格式不正确');
      }
      
      console.log('✅ 文件内容解析:', {
        contentType: typeof content,
        contentLength: content ? JSON.stringify(content).length : 0
      });
      
      // 创建深拷贝用于双数据结构
      const originalContent = content;
      const displayContent = JSON.parse(JSON.stringify(originalContent));
      
      set({
        currentFile: filename,
        jsonContent: originalContent,
        originalJsonContent: originalContent,
        displayJsonContent: displayContent,
        isModified: false,
        editHistory: [],
        currentHistoryIndex: -1,
        expandedNodes: {},
        selectedNodePath: [],
        loading: false
      });
      
      // 更新JSON数据
      get().updateJsonData();
      get().updateDisplayJsonData();
      console.log('✅ JSON数据更新完成');
    } catch (error) {
      console.error('❌ 文件加载失败:', {
        filename,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      let errorMessage = 'Failed to load file';
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // 提供更友好的错误信息
        if (errorMessage.includes('Internal Server Error')) {
          errorMessage = '服务器内部错误，请稍后重试或检查文件是否损坏';
        } else if (errorMessage.includes('Failed to read file')) {
          errorMessage = '文件读取失败，请检查文件是否存在且可访问';
        } else if (errorMessage.includes('Network Error') || errorMessage.includes('fetch')) {
          errorMessage = '网络连接错误，请检查网络连接后重试';
        } else if (errorMessage.includes('JSON解析错误')) {
          errorMessage = errorMessage;
        } else if (errorMessage.includes('Unexpected token')) {
          errorMessage = `JSON格式错误: ${errorMessage}`;
        } else if (errorMessage.includes('Unexpected end')) {
          errorMessage = 'JSON文件不完整或格式错误';
        } else if (errorMessage.includes('position')) {
          errorMessage = `JSON语法错误: ${errorMessage}`;
        } else if (errorMessage.includes('文件内容为空')) {
          errorMessage = '文件内容为空或格式不正确，请检查文件内容';
        } else if (errorMessage.includes('所有重试都失败')) {
          errorMessage = '多次尝试读取文件失败，请检查网络连接和服务器状态';
        }
      }
      
      set({ 
        error: errorMessage,
        loading: false,
        jsonData: null,
        displayJsonData: null,
        currentFile: null,
        jsonContent: null,
        originalJsonContent: null,
        displayJsonContent: null
      });
    }
  },

  saveCurrentFile: async () => {
    const { currentFile, jsonContent } = get();
    if (!currentFile || !jsonContent) {
      throw new Error('No file to save');
    }

    set({ loading: true, error: null });
    try {
      await fileApi.saveFile(currentFile, jsonContent);
      set({ isModified: false, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to save file',
        loading: false 
      });
      throw error;
    }
  },

  createNewFile: async (filename, content = {}) => {
    set({ loading: true, error: null });
    try {
      await fileApi.createFile(filename, content);
      await get().loadFiles();
      set({ loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create file',
        loading: false 
      });
      throw error;
    }
  },

  deleteFile: async (filename) => {
    set({ loading: true, error: null });
    try {
      await fileApi.deleteFile(filename);
      const { currentFile } = get();
      if (currentFile === filename) {
        set({ currentFile: null, jsonContent: null });
      }
      await get().loadFiles();
      set({ loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete file',
        loading: false 
      });
      throw error;
    }
  },

  // JSON数据转换
  updateJsonData: () => {
    const { jsonContent } = get();
    
    console.log('🔄 更新JSON数据:', {
      hasContent: !!jsonContent,
      contentType: typeof jsonContent,
      isNull: jsonContent === null,
      isUndefined: jsonContent === undefined
    });
    
    if (jsonContent === null || jsonContent === undefined) {
      console.log('📝 内容为空，清空数据');
      set({ jsonData: null, error: null });
      return;
    }
    
    try {
      // 验证jsonContent是否为有效的JSON数据
      if (typeof jsonContent === 'string') {
        // 如果是字符串，尝试解析
        if (jsonContent.trim() === '') {
          throw new Error('JSON内容为空字符串');
        }
        JSON.parse(jsonContent);
      }
      
      // 将jsonContent转换为JsonNode格式
      const node = createJsonNode(jsonContent, 'root', []);
      node.expanded = false; // 根节点默认折叠
      
      console.log('✅ JSON数据转换成功');
      // 设置转换后的数据并清除错误
      set({ jsonData: node, error: null });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'JSON解析失败';
      console.error('❌ JSON数据转换失败:', errorMessage);
      
      // 设置错误信息并清空jsonData
      set({ 
        jsonData: null, 
        error: `JSON解析错误: ${errorMessage}` 
      });
    }
  },

  // 双数据结构操作方法
  updateDisplayJsonContent: (content: any) => {
    set({
      displayJsonContent: content,
      jsonContent: content // 同步到编辑器显示
    });
    get().updateDisplayJsonData();
  },
  
  resetDisplayToOriginal: () => {
    const { originalJsonContent } = get();
    if (originalJsonContent) {
      const copy = JSON.parse(JSON.stringify(originalJsonContent));
      set({
        displayJsonContent: copy,
        jsonContent: copy
      });
      get().updateDisplayJsonData();
    }
  },
  
  updateDisplayJsonData: () => {
    const { displayJsonContent } = get();
    if (!displayJsonContent) {
      set({ displayJsonData: null });
      return;
    }
    
    try {
      const node = createJsonNode(displayJsonContent, 'root', []);
      set({ displayJsonData: node });
    } catch (error) {
      console.error('Error creating display JSON data:', error);
      set({ displayJsonData: null });
    }
  },

  // JSON内容操作
  setJsonContent: (content) => {
    set({ 
      jsonContent: content, 
      originalJsonContent: content,
      displayJsonContent: content ? JSON.parse(JSON.stringify(content)) : null,
      isModified: true 
    });
    get().updateJsonData();
    get().updateDisplayJsonData();
  },

  updateJsonValue: (path, value) => {
    const { jsonContent } = get();
    if (!jsonContent) return;

    const newContent = setValueByPath(jsonContent, path, value);
    set({ jsonContent: newContent, isModified: true });
    get().updateJsonData();
    get().updateHierarchyViewNodes();
  },

  addJsonProperty: (path, key, value) => {
    const { jsonContent } = get();
    if (!jsonContent) return;

    const newPath = [...path, key];
    const newContent = setValueByPath(jsonContent, newPath, value);
    set({ jsonContent: newContent, isModified: true });
    get().updateJsonData();
    get().updateHierarchyViewNodes();
  },



  deleteJsonProperty: (path) => {
    const { jsonContent } = get();
    if (!jsonContent) return;

    const newContent = deleteValueByPath(jsonContent, path);
    set({ jsonContent: newContent, isModified: true });
    get().updateJsonData();
    get().updateHierarchyViewNodes();
  },

  // 树状结构操作
  toggleNodeExpansion: (path) => {
    const { expandedNodes } = get();
    set({
      expandedNodes: {
        ...expandedNodes,
        [path]: !expandedNodes[path]
      }
    });
  },

  expandAllNodes: () => {
    const { jsonContent } = get();
    if (!jsonContent) return;

    const expandedNodes: TreeNodeState = {};
    const expandRecursively = (obj: any, path: string[] = []) => {
      const pathStr = path.join('.');
      expandedNodes[pathStr] = true;

      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          if (typeof item === 'object' && item !== null) {
            expandRecursively(item, [...path, index.toString()]);
          }
        });
      } else if (typeof obj === 'object' && obj !== null) {
        Object.entries(obj).forEach(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            expandRecursively(value, [...path, key]);
          }
        });
      }
    };

    expandRecursively(jsonContent);
    set({ expandedNodes });
  },

  collapseAllNodes: () => {
    set({ expandedNodes: {} });
  },

  selectNode: (path) => {
    set({ selectedNodePath: path });
  },

  // 编辑操作
  startEditing: (path, value) => {
    set({
      isEditing: true,
      editingPath: path,
      editingValue: value
    });
  },

  stopEditing: () => {
    set({
      isEditing: false,
      editingPath: [],
      editingValue: null
    });
  },

  confirmEdit: () => {
    const { editingPath, editingValue } = get();
    if (editingPath.length > 0) {
      get().updateJsonValue(editingPath, editingValue);
    }
    get().stopEditing();
  },

  cancelEdit: () => {
    get().stopEditing();
  },

  // 父层级显示操作
  setSelectedNodeForParent: (nodeData) => {
    set((state) => {
      const exists = state.selectedNodesForParent.some(
        node => JSON.stringify(node.path) === JSON.stringify(nodeData.path)
      );
      
      if (!exists) {
        return {
          selectedNodesForParent: [...state.selectedNodesForParent, nodeData]
        };
      }
      
      return state;
    });
  },

  removeSelectedNodeForParent: (nodeData) => {
    set((state) => ({
      selectedNodesForParent: state.selectedNodesForParent.filter(
        node => JSON.stringify(node.path) !== JSON.stringify(nodeData.path)
      )
    }));
  },

  clearSelectedNodesForParent: () => {
    set({ selectedNodesForParent: [] });
  },

  // 父层级容器配置操作
  setParentDisplayConfig: (parentPath, containerIndex, childData) => {
    const { jsonData, displayJsonData } = get();
    if (!jsonData) return;

    // 检查是否是plugins目录下的路径
    const isPluginsPath = parentPath.length > 0 && parentPath[0] === 'plugins';
    
    // 如果是plugins路径，设置全局选中的容器类型
    if (isPluginsPath && childData.childPath) {
      const childKey = Array.isArray(childData.childPath) 
        ? childData.childPath[childData.childPath.length - 1] 
        : (typeof childData.childPath === 'string' ? (childData.childPath as string).split('.').pop() : '') || '';
      get().setGlobalSelectedContainerType({
        containerIndex,
        childKey,
        childType: 'string'
      });
    }

    // 更新JsonNode中的parentDisplayConfig
    const updateNodeConfig = (node: JsonNode, targetPath: string[]): JsonNode => {
      if (JSON.stringify(node.path) === JSON.stringify(targetPath)) {
        const config = node.parentDisplayConfig || { selectedChildren: [] };
        const existingIndex = config.selectedChildren.findIndex(
          item => item.containerIndex === containerIndex
        );
        
        if (existingIndex >= 0) {
          config.selectedChildren[existingIndex] = {
            containerIndex,
            ...childData
          };
        } else {
          config.selectedChildren.push({
            containerIndex,
            ...childData
          });
        }
        
        return { ...node, parentDisplayConfig: config };
      }
      
      // 递归更新子节点
      if (node.children) {
        if (Array.isArray(node.children)) {
          const updatedChildren = node.children.map(child => updateNodeConfig(child, targetPath));
          return { ...node, children: updatedChildren };
        } else {
          const updatedChildren: { [key: string]: JsonNode } = {};
          Object.entries(node.children).forEach(([key, child]) => {
            updatedChildren[key] = updateNodeConfig(child, targetPath);
          });
          return { ...node, children: updatedChildren };
        }
      }
      
      return node;
    };

    // 如果是plugins路径，仅对displayJsonData进行同步更新（上方JSON结构视图）
    // jsonData（下方插件层级结构）保持独立，不受同步影响
    if (isPluginsPath && displayJsonData) {
      const syncAllPluginsLevels = (node: JsonNode): JsonNode => {
        // 如果当前节点是plugins下的某个层级，且路径深度与目标路径相同
        if (node.path.length > 0 && 
            node.path[0] === 'plugins' && 
            node.path.length === parentPath.length &&
            JSON.stringify(node.path) !== JSON.stringify(parentPath)) {
          
          // 查找对应的子项路径
          const targetChildPath: string[] | string = childData.childPath || [];
          let targetChildKeys: string[] = [];
          
          // 处理不同格式的childPath
          if (Array.isArray(targetChildPath)) {
            targetChildKeys = targetChildPath;
          } else if (typeof targetChildPath === 'string') {
            targetChildKeys = (targetChildPath as string).split('.');
          }
          
          // 递归查找对应的子项
          const findChildByPath = (currentNode: JsonNode, pathKeys: string[]): JsonNode | null => {
            if (pathKeys.length === 0) return currentNode;
            
            const [currentKey, ...remainingKeys] = pathKeys;
            if (currentNode.children && typeof currentNode.children === 'object' && !Array.isArray(currentNode.children) && currentKey in currentNode.children) {
              const childNode = (currentNode.children as { [key: string]: JsonNode })[currentKey];
              if (remainingKeys.length === 0) {
                return childNode;
              } else {
                return findChildByPath(childNode, remainingKeys);
              }
            }
            return null;
          };
          
          // 尝试查找对应的子项
          let correspondingChild = findChildByPath(node, targetChildKeys);
          let actualChildPath = targetChildKeys;
          
          // 如果没有找到，尝试多种查找策略
          if (!correspondingChild && targetChildKeys.length > 0) {
            const targetKey = targetChildKeys[targetChildKeys.length - 1];
            
            // 策略1: 检查当前节点是否有opts子项
            if (node.children && typeof node.children === 'object' && !Array.isArray(node.children) && 'opts' in node.children) {
              const optsNode = (node.children as { [key: string]: JsonNode })['opts'];
              if (optsNode.children && typeof optsNode.children === 'object' && !Array.isArray(optsNode.children) && targetKey in optsNode.children) {
                correspondingChild = (optsNode.children as { [key: string]: JsonNode })[targetKey];
                actualChildPath = ['opts', targetKey];
              }
            }
            
            // 策略2: 如果还没找到，直接在当前节点的子项中查找同名键
            if (!correspondingChild && node.children && typeof node.children === 'object' && !Array.isArray(node.children)) {
              if (targetKey in node.children) {
                correspondingChild = (node.children as { [key: string]: JsonNode })[targetKey];
                actualChildPath = [targetKey];
              }
            }
            
            // 策略3: 如果原始路径是多层的，尝试只使用最后一层键名
            if (!correspondingChild && targetChildKeys.length > 1) {
              if (node.children && typeof node.children === 'object' && !Array.isArray(node.children) && targetKey in node.children) {
                correspondingChild = (node.children as { [key: string]: JsonNode })[targetKey];
                actualChildPath = [targetKey];
              }
            }
          }
          
          if (correspondingChild) {
            // 更新这个层级的容器配置
            const config = node.parentDisplayConfig || { selectedChildren: [] };
            const existingIndex = config.selectedChildren.findIndex(
              item => item.containerIndex === containerIndex
            );
            
            const syncChildData = {
              childPath: actualChildPath,
              childKey: actualChildPath[actualChildPath.length - 1],
              childValue: correspondingChild.value,
              displayText: `"${actualChildPath[actualChildPath.length - 1]}": ${JSON.stringify(correspondingChild.value)}`
            };
            
            if (existingIndex >= 0) {
              config.selectedChildren[existingIndex] = {
                containerIndex,
                ...syncChildData
              };
            } else {
              config.selectedChildren.push({
                containerIndex,
                ...syncChildData
              });
            }
            
            node = { ...node, parentDisplayConfig: config };
          }
        }
        
        // 递归处理子节点
        if (node.children) {
          if (Array.isArray(node.children)) {
            const updatedChildren = node.children.map(child => syncAllPluginsLevels(child));
            return { ...node, children: updatedChildren };
          } else {
            const updatedChildren: { [key: string]: JsonNode } = {};
            Object.entries(node.children).forEach(([key, child]) => {
              updatedChildren[key] = syncAllPluginsLevels(child);
            });
            return { ...node, children: updatedChildren };
          }
        }
        
        return node;
      };
      
      // 仅更新目标节点在jsonData中（不进行同步）
      const updatedJsonData = updateNodeConfig(jsonData, parentPath);
      
      // 对displayJsonData进行同步更新（上方JSON结构视图）
      let updatedDisplayJsonData = updateNodeConfig(displayJsonData, parentPath);
      updatedDisplayJsonData = syncAllPluginsLevels(updatedDisplayJsonData);
      
      set({ 
        jsonData: updatedJsonData,
        displayJsonData: updatedDisplayJsonData,
        isModified: true
      });
    } else {
      // 非plugins路径，使用原有逻辑
      const updatedJsonData = updateNodeConfig(jsonData, parentPath);
      const updatedDisplayJsonData = displayJsonData ? updateNodeConfig(displayJsonData, parentPath) : null;
      
      set({ 
        jsonData: updatedJsonData,
        displayJsonData: updatedDisplayJsonData,
        isModified: true
      });
    }
  },

  removeParentDisplayConfig: (parentPath, containerIndex) => {
    const { jsonData } = get();
    if (!jsonData) return;

    const updateNodeConfig = (node: JsonNode, targetPath: string[]): JsonNode => {
      if (JSON.stringify(node.path) === JSON.stringify(targetPath)) {
        const config = node.parentDisplayConfig;
        if (config) {
          const filteredChildren = config.selectedChildren.filter(
            item => item.containerIndex !== containerIndex
          );
          return { 
            ...node, 
            parentDisplayConfig: { selectedChildren: filteredChildren }
          };
        }
      }
      
      // 递归更新子节点
      if (node.children) {
        if (Array.isArray(node.children)) {
          const updatedChildren = node.children.map(child => updateNodeConfig(child, targetPath));
          return { ...node, children: updatedChildren };
        } else {
          const updatedChildren: { [key: string]: JsonNode } = {};
          Object.entries(node.children).forEach(([key, child]) => {
            updatedChildren[key] = updateNodeConfig(child, targetPath);
          });
          return { ...node, children: updatedChildren };
        }
      }
      
      return node;
    };

    const updatedJsonData = updateNodeConfig(jsonData, parentPath);
    set({ jsonData: updatedJsonData });
  },

  getParentDisplayConfig: (parentPath) => {
    const { jsonData } = get();
    if (!jsonData) return null;

    const findNodeConfig = (node: JsonNode, targetPath: string[]): any => {
      if (JSON.stringify(node.path) === JSON.stringify(targetPath)) {
        return node.parentDisplayConfig || { selectedChildren: [] };
      }
      
      // 递归查找子节点
      if (node.children) {
        if (Array.isArray(node.children)) {
          for (const child of node.children) {
            const result = findNodeConfig(child, targetPath);
            if (result) return result;
          }
        } else {
          for (const child of Object.values(node.children)) {
            const result = findNodeConfig(child, targetPath);
            if (result) return result;
          }
        }
      }
      
      return null;
    };

    return findNodeConfig(jsonData, parentPath);
  },

  // 右键菜单操作
  showContextMenu: (x, y, type, data) => {
    set({
      contextMenu: {
        show: true,
        x,
        y,
        type,
        data
      }
    });
  },

  hideContextMenu: () => {
    set({
      contextMenu: {
        show: false,
        x: 0,
        y: 0,
        type: '',
        data: null
      },
      hierarchyViewNodes: []
    });
  },

  // 层级结构视图操作
  addToHierarchyView: (path) => {
    const { hierarchyViewNodes, jsonContent } = get();
    
    if (!jsonContent) return;
    
    // 检查是否已存在相同路径的节点
    const existingIndex = hierarchyViewNodes.findIndex(
      node => JSON.stringify(node.path) === JSON.stringify(path)
    );
    
    if (existingIndex >= 0) return; // 已存在，不重复添加
    
    // 获取节点值和类型
    const value = getValueByPath(jsonContent, path);
    const type = getJsonValueType(value);
    const key = path.length > 0 ? path[path.length - 1] : 'root';
    const fullPath = path.join(' > ') || 'root';
    
    const newNode = {
      path,
      key,
      value,
      type,
      fullPath
    };
    
    set({
      hierarchyViewNodes: [...hierarchyViewNodes, newNode]
    });
  },

  removeFromHierarchyView: (path) => {
    const { hierarchyViewNodes } = get();
    
    const filteredNodes = hierarchyViewNodes.filter(
      node => JSON.stringify(node.path) !== JSON.stringify(path)
    );
    
    set({
      hierarchyViewNodes: filteredNodes
    });
  },

  clearHierarchyView: () => {
    set({
      hierarchyViewNodes: []
    });
  },

  moveHierarchyNode: (fromIndex, toIndex) => {
    const { hierarchyViewNodes } = get();
    
    if (fromIndex < 0 || fromIndex >= hierarchyViewNodes.length ||
        toIndex < 0 || toIndex >= hierarchyViewNodes.length) {
      return;
    }
    
    const newNodes = [...hierarchyViewNodes];
    const [movedNode] = newNodes.splice(fromIndex, 1);
    newNodes.splice(toIndex, 0, movedNode);
    
    set({
      hierarchyViewNodes: newNodes
    });
  },

  // 更新层级视图中的节点数据
  updateHierarchyViewNodes: () => {
    const { hierarchyViewNodes, jsonContent } = get();
    
    if (!jsonContent || hierarchyViewNodes.length === 0) return;
    
    const updatedNodes = hierarchyViewNodes.map(node => {
      const value = getValueByPath(jsonContent, node.path);
      const type = getJsonValueType(value);
      
      return {
        ...node,
        value,
        type
      };
    }).filter(node => node.value !== undefined); // 过滤掉已删除的节点
    
    set({
      hierarchyViewNodes: updatedNodes
    });
  },

  // 更新插件顺序
  updatePluginsOrder: (newOrder) => {
    const { jsonContent, originalJsonContent, displayJsonContent, jsonData, displayJsonData } = get();
    
    if (!jsonContent || !jsonContent.plugins) return;
    
    // 创建新的插件对象，按照新顺序排列
    const oldPlugins = jsonContent.plugins;
    const newPlugins: any = {};
    
    // 按新顺序重新组织插件
    newOrder.forEach(pluginName => {
      if (oldPlugins[pluginName]) {
        newPlugins[pluginName] = oldPlugins[pluginName];
      }
    });
    
    // 更新所有相关的JSON数据
    const updatedJsonContent = {
      ...jsonContent,
      plugins: newPlugins
    };
    
    const updatedOriginalContent = {
      ...originalJsonContent,
      plugins: newPlugins
    };
    
    const updatedDisplayContent = {
      ...displayJsonContent,
      plugins: newPlugins
    };
    
    set({
      jsonContent: updatedJsonContent,
      originalJsonContent: updatedOriginalContent,
      displayJsonContent: updatedDisplayContent,
      isModified: true
    });
    
    // 保留现有的parentDisplayConfig，避免重新构建时丢失选中状态
    const preserveParentDisplayConfig = (oldNode: JsonNode | null, newNode: JsonNode): JsonNode => {
      if (!oldNode) return newNode;
      
      // 如果路径匹配，保留parentDisplayConfig
      if (JSON.stringify(oldNode.path) === JSON.stringify(newNode.path) && oldNode.parentDisplayConfig) {
        newNode = { ...newNode, parentDisplayConfig: oldNode.parentDisplayConfig };
      }
      
      // 递归处理子节点
      if (newNode.children && oldNode.children) {
        if (Array.isArray(newNode.children) && Array.isArray(oldNode.children)) {
          newNode.children = newNode.children.map((child, index) => {
            const oldChild = oldNode.children && Array.isArray(oldNode.children) ? oldNode.children[index] : null;
            return preserveParentDisplayConfig(oldChild, child);
          });
        } else if (typeof newNode.children === 'object' && typeof oldNode.children === 'object' && 
                   !Array.isArray(newNode.children) && !Array.isArray(oldNode.children)) {
          const updatedChildren: { [key: string]: JsonNode } = {};
          Object.entries(newNode.children).forEach(([key, child]) => {
            const oldChild = (oldNode.children as { [key: string]: JsonNode })[key] || null;
            updatedChildren[key] = preserveParentDisplayConfig(oldChild, child);
          });
          newNode.children = updatedChildren;
        }
      }
      
      return newNode;
    };
    
    // 更新JSON数据结构，但保留parentDisplayConfig
    try {
      const newJsonNode = createJsonNode(updatedJsonContent, 'root', []);
      const preservedJsonData = preserveParentDisplayConfig(jsonData, newJsonNode);
      
      const newDisplayJsonNode = createJsonNode(updatedDisplayContent, 'root', []);
      const preservedDisplayJsonData = preserveParentDisplayConfig(displayJsonData, newDisplayJsonNode);
      
      set({
        jsonData: preservedJsonData,
        displayJsonData: preservedDisplayJsonData
      });
    } catch (error) {
      console.error('Error updating plugins order:', error);
      // 如果出错，回退到原有的更新方式
      get().updateJsonData();
      get().updateDisplayJsonData();
    }
  },

  // 历史操作（简化版本）
  undo: () => {
    // TODO: 实现撤销功能
  },

  redo: () => {
    // TODO: 实现重做功能
  },

  canUndo: () => {
    const { currentHistoryIndex } = get();
    return currentHistoryIndex > 0;
  },

  canRedo: () => {
    const { editHistory, currentHistoryIndex } = get();
    return currentHistoryIndex < editHistory.length - 1;
  },

  // 全局同步容器选择操作
  setGlobalSelectedContainerType: (containerType) => {
    set({ globalSelectedContainerType: containerType });
  },
  
  // 获取值的显示文本辅助函数
  getValueDisplay: (value, type) => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (type === 'string') return `"${value}"`;
    if (type === 'object' || type === 'array') {
      return JSON.stringify(value);
    }
    return String(value);
  },

  // 预设管理方法
  loadPresets: async () => {
    const { presetManager } = get();
    try {
      const allPresets = await presetManager.getAllPresets();
      set({ presets: allPresets });
    } catch (error) {
      console.error('Failed to load presets:', error);
      set({ error: 'Failed to load presets' });
    }
  },

  savePreset: async (name, description) => {
    const { presetManager, jsonContent, currentFile, expandedNodes, jsonData } = get();
    
    if (!jsonContent || !jsonContent.plugins) {
      throw new Error('No plugins data to save');
    }
    
    try {
      const pluginOrder = Object.keys(jsonContent.plugins);
      
      // 收集所有节点的parentDisplayConfig
      const parentDisplayConfigs: Record<string, {
        selectedChildren: Array<{
          containerIndex: number;
          childPath: string | string[];
          childKey: string;
          childValue: any;
          displayText: string;
        }>;
      }> = {};
      
      // 递归收集parentDisplayConfig
      const collectParentDisplayConfigs = (node: JsonNode) => {
        if (node.parentDisplayConfig && node.parentDisplayConfig.selectedChildren.length > 0) {
          const pathKey = JSON.stringify(node.path);
          parentDisplayConfigs[pathKey] = {
            selectedChildren: node.parentDisplayConfig.selectedChildren.map(child => ({
              containerIndex: child.containerIndex,
              childPath: child.childPath,
              childKey: child.childKey,
              childValue: child.childValue,
              displayText: child.displayText
            }))
          };
        }
        
        // 递归处理子节点
        if (node.children) {
          if (Array.isArray(node.children)) {
            node.children.forEach(child => collectParentDisplayConfigs(child));
          } else if (typeof node.children === 'object') {
            Object.values(node.children).forEach(child => collectParentDisplayConfigs(child));
          }
        }
      };
      
      if (jsonData) {
        collectParentDisplayConfigs(jsonData);
      }
      
      const result = await presetManager.savePreset(
        name,
        description || '',
        pluginOrder,
        currentFile || 'unknown',
        expandedNodes,
        parentDisplayConfigs
      );
      
      if (result.success) {
        // 重新加载预设列表
        await get().loadPresets();
        set({ isPresetDialogOpen: false });
      } else {
        throw new Error(result.message || 'Failed to save preset');
      }
    } catch (error) {
      console.error('Failed to save preset:', error);
      throw error;
    }
  },

  applyPreset: async (presetId) => {
    const { presetManager } = get();
    
    try {
      const result = await presetManager.loadPreset(presetId);
      if (result.success && result.data) {
        const preset = result.data;
        // 应用预设的插件顺序
        get().updatePluginsOrder(preset.pluginOrder);
        
        // 恢复展开状态
        if (preset.expandedNodes) {
          set({ expandedNodes: { ...preset.expandedNodes } });
        }
        
        // 恢复父层级容器配置
        if (preset.parentDisplayConfigs) {
          const { jsonData } = get();
          if (jsonData) {
            // 递归恢复parentDisplayConfig
            const restoreParentDisplayConfigs = (node: JsonNode): JsonNode => {
              const pathKey = JSON.stringify(node.path);
              const savedConfig = preset.parentDisplayConfigs?.[pathKey];
              
              if (savedConfig) {
                node = {
                  ...node,
                  parentDisplayConfig: {
                    selectedChildren: savedConfig.selectedChildren.map(child => ({
                      containerIndex: child.containerIndex,
                      childPath: child.childPath,
                      childKey: child.childKey,
                      childValue: child.childValue,
                      displayText: child.displayText
                    }))
                  }
                };
              }
              
              // 递归处理子节点
              if (node.children) {
                if (Array.isArray(node.children)) {
                  node.children = node.children.map(child => restoreParentDisplayConfigs(child));
                } else if (typeof node.children === 'object') {
                  const updatedChildren: { [key: string]: JsonNode } = {};
                  Object.entries(node.children).forEach(([key, child]) => {
                    updatedChildren[key] = restoreParentDisplayConfigs(child);
                  });
                  node.children = updatedChildren;
                }
              }
              
              return node;
            };
            
            const restoredJsonData = restoreParentDisplayConfigs(jsonData);
            set({ jsonData: restoredJsonData });
            
            // 同时更新displayJsonData
            const { displayJsonData } = get();
            if (displayJsonData) {
              let restoredDisplayJsonData = restoreParentDisplayConfigs(displayJsonData);
              
              // 对于plugins路径下的配置，执行同步逻辑
              const syncAllPluginsLevels = (node: JsonNode): JsonNode => {
                // 检查是否有plugins路径下的配置需要同步
                const hasPluginsConfig = Object.keys(preset.parentDisplayConfigs || {}).some(pathKey => {
                  const path = JSON.parse(pathKey);
                  return Array.isArray(path) && path.length > 0 && path[0] === 'plugins';
                });
                
                if (!hasPluginsConfig) return node;
                
                // 遍历所有plugins路径下的配置
                Object.entries(preset.parentDisplayConfigs || {}).forEach(([pathKey, config]) => {
                  const sourcePath = JSON.parse(pathKey);
                  if (Array.isArray(sourcePath) && sourcePath.length > 0 && sourcePath[0] === 'plugins') {
                    // 对每个容器配置进行同步
                    config.selectedChildren.forEach(childConfig => {
                      const { containerIndex, childPath, childKey, childValue } = childConfig;
                      
                      // 同步到其他plugins层级
                      const syncToPluginsLevel = (currentNode: JsonNode): JsonNode => {
                        // 如果当前节点是plugins下的某个层级，且路径深度与源路径相同
                        if (currentNode.path.length > 0 && 
                            currentNode.path[0] === 'plugins' && 
                            currentNode.path.length === sourcePath.length &&
                            JSON.stringify(currentNode.path) !== JSON.stringify(sourcePath)) {
                          
                          // 查找对应的子项路径
                          const targetChildPath: string[] | string = childPath || [];
                          let targetChildKeys: string[] = [];
                          
                          // 处理不同格式的childPath
                          if (Array.isArray(targetChildPath)) {
                            targetChildKeys = targetChildPath;
                          } else if (typeof targetChildPath === 'string') {
                            targetChildKeys = (targetChildPath as string).split('.');
                          }
                          
                          // 递归查找对应的子项
                          const findChildByPath = (searchNode: JsonNode, pathKeys: string[]): JsonNode | null => {
                            if (pathKeys.length === 0) return searchNode;
                            
                            const [currentKey, ...remainingKeys] = pathKeys;
                            if (searchNode.children && typeof searchNode.children === 'object' && !Array.isArray(searchNode.children) && currentKey in searchNode.children) {
                              const childNode = (searchNode.children as { [key: string]: JsonNode })[currentKey];
                              if (remainingKeys.length === 0) {
                                return childNode;
                              } else {
                                return findChildByPath(childNode, remainingKeys);
                              }
                            }
                            return null;
                          };
                          
                          // 尝试查找对应的子项
                          let correspondingChild = findChildByPath(currentNode, targetChildKeys);
                          let actualChildPath = targetChildKeys;
                          
                          // 如果没有找到，尝试多种查找策略
                          if (!correspondingChild && targetChildKeys.length > 0) {
                            const targetKey = targetChildKeys[targetChildKeys.length - 1];
                            
                            // 策略1: 检查当前节点是否有opts子项
                            if (currentNode.children && typeof currentNode.children === 'object' && !Array.isArray(currentNode.children) && 'opts' in currentNode.children) {
                              const optsNode = (currentNode.children as { [key: string]: JsonNode })['opts'];
                              if (optsNode.children && typeof optsNode.children === 'object' && !Array.isArray(optsNode.children) && targetKey in optsNode.children) {
                                correspondingChild = (optsNode.children as { [key: string]: JsonNode })[targetKey];
                                actualChildPath = ['opts', targetKey];
                              }
                            }
                            
                            // 策略2: 如果还没找到，直接在当前节点的子项中查找同名键
                            if (!correspondingChild && currentNode.children && typeof currentNode.children === 'object' && !Array.isArray(currentNode.children)) {
                              if (targetKey in currentNode.children) {
                                correspondingChild = (currentNode.children as { [key: string]: JsonNode })[targetKey];
                                actualChildPath = [targetKey];
                              }
                            }
                            
                            // 策略3: 如果原始路径是多层的，尝试只使用最后一层键名
                            if (!correspondingChild && targetChildKeys.length > 1) {
                              if (currentNode.children && typeof currentNode.children === 'object' && !Array.isArray(currentNode.children) && targetKey in currentNode.children) {
                                correspondingChild = (currentNode.children as { [key: string]: JsonNode })[targetKey];
                                actualChildPath = [targetKey];
                              }
                            }
                          }
                          
                          if (correspondingChild) {
                            // 更新这个层级的容器配置
                            const nodeConfig = currentNode.parentDisplayConfig || { selectedChildren: [] };
                            const existingIndex = nodeConfig.selectedChildren.findIndex(
                              item => item.containerIndex === containerIndex
                            );
                            
                            const syncChildData = {
                              childPath: actualChildPath,
                              childKey: actualChildPath[actualChildPath.length - 1],
                              childValue: correspondingChild.value,
                              displayText: `"${actualChildPath[actualChildPath.length - 1]}": ${JSON.stringify(correspondingChild.value)}`
                            };
                            
                            if (existingIndex >= 0) {
                              nodeConfig.selectedChildren[existingIndex] = {
                                containerIndex,
                                ...syncChildData
                              };
                            } else {
                              nodeConfig.selectedChildren.push({
                                containerIndex,
                                ...syncChildData
                              });
                            }
                            
                            currentNode = { ...currentNode, parentDisplayConfig: nodeConfig };
                          }
                        }
                        
                        // 递归处理子节点
                        if (currentNode.children) {
                          if (Array.isArray(currentNode.children)) {
                            const updatedChildren = currentNode.children.map(child => syncToPluginsLevel(child));
                            return { ...currentNode, children: updatedChildren };
                          } else {
                            const updatedChildren: { [key: string]: JsonNode } = {};
                            Object.entries(currentNode.children).forEach(([key, child]) => {
                              updatedChildren[key] = syncToPluginsLevel(child);
                            });
                            return { ...currentNode, children: updatedChildren };
                          }
                        }
                        
                        return currentNode;
                      };
                      
                      node = syncToPluginsLevel(node);
                    });
                  }
                });
                
                return node;
              };
              
              restoredDisplayJsonData = syncAllPluginsLevels(restoredDisplayJsonData);
              set({ displayJsonData: restoredDisplayJsonData });
            }
          }
        }
        
        // 设置为最后使用的预设
        await presetManager.setLastUsedPreset(presetId);
        
        set({ isPresetManagementDialogOpen: false });
      } else {
        throw new Error(result.message || 'Preset not found');
      }
    } catch (error) {
      console.error('Failed to apply preset:', error);
      throw error;
    }
  },

  deletePreset: async (presetId) => {
    const { presetManager } = get();
    
    try {
      const result = await presetManager.deletePreset(presetId);
      if (result.success) {
        // 重新加载预设列表
        await get().loadPresets();
      } else {
        throw new Error(result.message || 'Failed to delete preset');
      }
    } catch (error) {
      console.error('Failed to delete preset:', error);
      throw error;
    }
  },

  setPresetDialogOpen: (open) => {
    set({ isPresetDialogOpen: open });
  },

  setPresetManagementDialogOpen: (open) => {
    set({ isPresetManagementDialogOpen: open });
  },

  // 重置状态
  reset: () => {
    set({
      currentFile: null,
      jsonContent: null,
      editHistory: [],
      currentHistoryIndex: -1,
      isModified: false,
      files: [],
      loading: false,
      error: null,
      expandedNodes: {},
      selectedNodePath: [],
      isEditing: false,
      editingPath: [],
      editingValue: null,
      jsonData: null,
      selectedNodesForParent: [],
      originalJsonContent: null,
      displayJsonContent: null,
      displayJsonData: null,
      globalSelectedContainerType: null,
      presets: [],
      isPresetDialogOpen: false,
      isPresetManagementDialogOpen: false,
      contextMenu: {
        show: false,
        x: 0,
        y: 0,
        type: '',
        data: null
      }
    });
  }
}));