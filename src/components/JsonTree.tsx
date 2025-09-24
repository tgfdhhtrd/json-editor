/**
 * JSON树状结构组件
 * 支持展开/折叠功能和不同数据类型的显示
 */

import React, { useState, useCallback } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Edit3,
  Plus,
  Trash2,
  Check,
  Copy,
  X
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import { toast } from 'sonner';
import type { JsonNode } from '../../shared/types';
import { ChildSelectionModal } from './ChildSelectionModal';

interface JsonTreeProps {
  node: JsonNode;
  path: string[];
  level: number;
}

interface EditingState {
  path: string[];
  type: 'key' | 'value';
  value: string;
}

export function JsonTree({ node, path, level }: JsonTreeProps) {
  const { updateJsonValue, addJsonProperty, deleteJsonProperty, expandedNodes, toggleNodeExpansion, setParentDisplayConfig, getParentDisplayConfig } = useEditorStore();
  
  // 添加空值检查，防止path为undefined导致的错误
  if (!path || !Array.isArray(path)) {
    console.error('JsonTree: path is undefined or not an array', { path, node });
    return <div className="text-red-500">错误：路径参数无效</div>;
  }
  
  const pathString = path.join('.');
  const expanded = expandedNodes[pathString] ?? false; // 使用store中的展开状态，默认折叠
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showChildModal, setShowChildModal] = useState(false);
  const [selectedContainerIndex, setSelectedContainerIndex] = useState<number>(0);

  
  // 检查是否有任何节点正在编辑
  const isEditing = editing !== null;

  // 判断是否为用户创建的分组（使用节点属性）
  const isUserGroupNode = node.isUserGroup || false;
  const userGroupDisplayName = node.userGroupName || node.key;

  // 获取值的类型颜色
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'string': return 'text-emerald-600';
      case 'number': return 'text-blue-600';
      case 'boolean': return 'text-purple-600';
      case 'null': return 'text-slate-500';
      case 'object': return 'text-slate-700';
      case 'array': return 'text-slate-700';
      default: return 'text-slate-600';
    }
  };

  // 获取值的显示文本
  const getValueDisplay = (value: any, type: string): string => {
    switch (type) {
      case 'string': return `"${value}"`;
      case 'null': return 'null';
      case 'boolean': return value ? 'true' : 'false';
      case 'object': return `{${Object.keys(value).length} 项}`;
      case 'array': return `[${value.length} 项]`;
      default: return String(value);
    }
  };

  // 切换展开状态
  const toggleExpanded = useCallback((e?: React.MouseEvent) => {
    // 阻止事件冒泡
    if (e) {
      e.stopPropagation();
    }
    
    if (node.type === 'object' || node.type === 'array') {
      toggleNodeExpansion(pathString);
    }
  }, [pathString, node.type, toggleNodeExpansion]);

  // 开始编辑
  const startEdit = (type: 'key' | 'value', currentValue: string) => {
    setEditing({ path, type, value: currentValue });
  };

  // 保存编辑
  const saveEdit = () => {
    if (!editing) return;

    try {
      // 保存当前展开状态
      const wasExpanded = expanded;
      
      if (editing.type === 'key') {
        // 重命名键
        const parentPath = path.slice(0, -1);
        const oldKey = path[path.length - 1];
        const newKey = editing.value;
        
        if (newKey && newKey !== oldKey) {
          // 获取当前值
          const currentValue = node.value;
          
          // 如果是用户分组，需要更新分组名称
          if (isUserGroupNode && currentValue && typeof currentValue === 'object') {
            const updatedValue = {
              ...currentValue,
              __groupName: newKey
            };
            // 删除旧键
            deleteJsonProperty(path);
            // 添加新键
            addJsonProperty(parentPath, newKey, updatedValue);
            toast.success(`分组重命名为 "${newKey}" 成功`);
          } else {
            // 普通键重命名
            deleteJsonProperty(path);
            addJsonProperty(parentPath, newKey, currentValue);
            toast.success('重命名成功');
          }
        }
      } else {
        // 编辑值
        let newValue: any;
        const trimmedValue = editing.value.trim();
        
        // 尝试解析值的类型
        if (trimmedValue === 'null') {
          newValue = null;
        } else if (trimmedValue === 'true' || trimmedValue === 'false') {
          newValue = trimmedValue === 'true';
        } else if (/^-?\d+(\.\d+)?$/.test(trimmedValue)) {
          newValue = Number(trimmedValue);
        } else if (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) {
          newValue = trimmedValue.slice(1, -1);
        } else {
          newValue = trimmedValue;
        }
        
        updateJsonValue(path, newValue);
        toast.success('修改成功');
      }
      
      setEditing(null);
      
      // 确保编辑完成后保持原有的展开状态
      if (wasExpanded && (node.type === 'object' || node.type === 'array')) {
        // 展开状态由store管理，无需手动设置
      }
      
    } catch (error) {
      toast.error('修改失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 取消编辑
  const cancelEdit = () => {
    // 保存当前展开状态
    const wasExpanded = expanded;
    
    setEditing(null);
    
    // 确保取消编辑后保持原有的展开状态
    if (wasExpanded && (node.type === 'object' || node.type === 'array')) {
      // 展开状态由store管理，无需手动设置
    }
  };

  // 添加节点
  const handleAddNode = (type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null') => {
    try {
      let newValue: any;
      let newKey = '';
      
      if (node.type === 'object') {
        newKey = `新属性${Object.keys(node.children || {}).length + 1}`;
      }
      
      switch (type) {
        case 'string': newValue = ''; break;
        case 'number': newValue = 0; break;
        case 'boolean': newValue = false; break;
        case 'null': newValue = null; break;
        case 'object': newValue = {}; break;
        case 'array': newValue = []; break;
      }
      
      addJsonProperty(path, newKey, newValue);
      setShowAddMenu(false);
      toast.success('添加成功');
    } catch (error) {
      toast.error('添加失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };













  // 复制路径
  const copyPath = async () => {
    try {
      const pathStr = path.join('.');
      await navigator.clipboard.writeText(pathStr);
      setCopied(true);
      toast.success('路径已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('复制失败');
    }
  };

  // 删除节点
  const handleDelete = () => {
    if (path.length === 0) {
      toast.error('无法删除根节点');
      return;
    }
    
    // 为用户分组提供特殊的删除确认提示
    const confirmMessage = isUserGroupNode 
      ? `确定要删除分组 "${userGroupDisplayName}" 吗？\n\n⚠️ 删除分组将同时删除其中的所有内容，此操作无法撤销！`
      : '确定要删除此节点吗？';
    
    if (confirm(confirmMessage)) {
      try {
        deleteJsonProperty(path);
        const successMessage = isUserGroupNode 
          ? `分组 "${userGroupDisplayName}" 已删除`
          : '删除成功';
        toast.success(successMessage);
      } catch (error) {
        toast.error('删除失败: ' + (error instanceof Error ? error.message : '未知错误'));
      }
    }
  };

  // 处理容器点击
  const handleContainerClick = (containerIndex: number) => {
    setSelectedContainerIndex(containerIndex);
    setShowChildModal(true);
  };

  // 处理子层级选择
  const handleChildSelect = (childPath: string, childKey: string, childValue: any, childType: string) => {
    if (selectedContainerIndex !== null) {
      // 生成键值对格式的显示文本
      const valueDisplay = getValueDisplay(childValue, childType);
      const displayText = `"${childKey}": ${valueDisplay}`;
      
      // 更新父层级显示配置 - 传递完整的子层级信息
      setParentDisplayConfig(path, selectedContainerIndex, {
        childPath,
        value: childValue,
        type: childType,
        displayText: displayText
      });
      
      // 关闭弹窗
      setShowChildModal(false);
      setSelectedContainerIndex(null);
      
      // 提示用户
      toast.success(`已将 "${childKey}" 添加到容器 ${selectedContainerIndex + 1}`);
    }
  };

  // 根据路径获取子层级完整信息的辅助函数
  const getChildInfoByPath = (parentNode: any, childPath: string): { value: any, type: string, displayText: string } => {
    const keys = childPath.split('.');
    let current = parentNode.children;
    let currentKey = '';
    
    for (const key of keys) {
      currentKey = key;
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
        // 如果当前节点是JsonNode，获取其信息
        if (current && typeof current === 'object' && 'value' in current) {
          if (keys.indexOf(key) === keys.length - 1) {
            // 最后一个键，返回完整信息
            const value = current.value;
            const type = current.type || typeof value;
            // 生成键值对格式的显示文本
            const valueDisplay = getValueDisplay(value, type);
            const displayText = `"${currentKey}": ${valueDisplay}`;
            return { value, type, displayText };
          } else {
            // 继续遍历子节点
            current = current.children;
          }
        }
      } else {
        return { value: undefined, type: 'undefined', displayText: 'undefined' };
      }
    }
    
    const value = current?.value || current;
    const type = current?.type || typeof value;
    // 生成键值对格式的显示文本
    const valueDisplay = getValueDisplay(value, type);
    const displayText = `"${currentKey}": ${valueDisplay}`;
    return { value, type, displayText };
  };

  // 根据路径获取值的辅助函数（保持向后兼容）
  const getValueByPath = (parentNode: any, childPath: string): any => {
    return getChildInfoByPath(parentNode, childPath).value;
  };







  // 渲染子节点
  const renderChildren = () => {
    if (!expanded || !node.children) return null;
    
    if (node.type === 'object') {
      return Object.entries(node.children).map(([key, childNode]) => (
        <JsonTree
          key={key}
          node={childNode}
          path={[...path, key]}
          level={level + 1}
        />
      ));
    } else if (node.type === 'array') {
      return node.children.map((childNode, index) => (
        <JsonTree
          key={index}
          node={childNode}
          path={[...path, String(index)]}
          level={level + 1}
        />
      ));
    }
    
    return null;
  };

  const canExpand = node.type === 'object' || node.type === 'array';
  const hasChildren = node.children && (
    (node.type === 'object' && Object.keys(node.children).length > 0) ||
    (node.type === 'array' && node.children.length > 0)
  );

  return (
    <div className="select-none">
      <div
        className={`group flex items-center transition-all duration-200 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 ${
          isEditing 
            ? 'py-2 px-3 min-h-[48px]' // 编辑时适度增加高度和内边距
            : 'py-0.5 px-3 min-h-[24px]' // 更紧凑的单行显示
        }`}
        style={{ paddingLeft: `${level * 20 + 10}px` }}
        onClick={(e) => {
          // 完全阻止主容器的点击事件，防止意外触发展开/收起
          e.stopPropagation();
        }}
      >
        {/* 展开/折叠按钮 */}
        <button
          onClick={(e) => toggleExpanded(e)}
          className={`mr-1.5 p-0.5 rounded-md transition-colors ${
            canExpand && hasChildren
              ? 'text-slate-600 hover:text-slate-800 hover:bg-slate-200'
              : 'invisible'
          }`}
          disabled={!canExpand || !hasChildren}
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        {/* 键名 */}
        {path.length > 0 && (
          <>
            {editing?.type === 'key' && editing.path === path ? (
              <div className="flex items-start mr-3">
                <textarea
                  value={editing.value}
                  onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      saveEdit();
                    }
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  className="px-3 py-2 text-sm border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50 resize-none min-h-[40px] max-h-[200px] overflow-y-auto transition-all duration-200"
                  style={{
                    height: 'auto',
                    minHeight: '40px',
                    maxHeight: '200px'
                  }}
                  rows={1}
                  autoFocus
                  ref={(textarea) => {
                    if (textarea) {
                      textarea.style.height = 'auto';
                      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
                    }
                  }}
                />
                <div className="flex flex-col ml-2">
                  <button onClick={saveEdit} className="p-1 text-green-600 hover:bg-green-100 rounded-md transition-colors mb-1">
                    <Check size={14} />
                  </button>
                  <button onClick={cancelEdit} className="p-1 text-red-600 hover:bg-red-100 rounded-md transition-colors">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <span
                className={`text-sm font-semibold mr-2 cursor-pointer px-1.5 py-0.5 rounded-md transition-colors ${
                  isEditing 
                    ? 'whitespace-pre-wrap break-words' // 编辑时允许换行
                    : 'truncate max-w-[200px]' // 默认单行显示，超出显示省略号
                } ${
                  isUserGroupNode 
                    ? 'text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 shadow-sm' 
                    : 'text-blue-700 hover:bg-blue-100'
                }`}
                onClick={() => startEdit('key', path[path.length - 1])}
                title={isUserGroupNode ? `用户分组: ${userGroupDisplayName}` : '点击编辑键名'}
              >
                {isUserGroupNode ? (
                  <span className="flex items-center">
                    <span className="text-emerald-600 mr-1">📁</span>
                    <span className="font-bold text-emerald-800">{userGroupDisplayName}</span>
                  </span>
                ) : (
                  `"${path[path.length - 1]}"`
                )}
              </span>
            )}
            <span className="text-slate-500 mr-2 font-medium">:</span>
          </>
        )}

        {/* 值 */}
        {editing?.type === 'value' && editing.path === path ? (
          <div className="flex items-start flex-1">
            <textarea
              value={editing.value}
              onChange={(e) => {
                const newEditing = { ...editing, value: e.target.value };
                setEditing(newEditing);
                // 自动调整高度
                const textarea = e.target as HTMLTextAreaElement;
                textarea.style.height = 'auto';
                textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  saveEdit();
                }
                if (e.key === 'Escape') cancelEdit();
              }}
              className="flex-1 px-3 py-2 text-sm border border-yellow-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-yellow-50 resize-none min-h-[40px] max-h-[200px] overflow-y-auto transition-all duration-200"
              style={{
                height: 'auto',
                minHeight: '40px',
                maxHeight: '200px'
              }}
              rows={1}
              autoFocus
              ref={(textarea) => {
                if (textarea) {
                  textarea.style.height = 'auto';
                  textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
                }
              }}
            />
            <div className="flex flex-col ml-2">
              <button onClick={saveEdit} className="p-1 text-green-600 hover:bg-green-100 rounded-md transition-colors mb-1">
                <Check size={14} />
              </button>
              <button onClick={cancelEdit} className="p-1 text-red-600 hover:bg-red-100 rounded-md transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>
        ) : (
          <span
            className={`text-sm flex-1 px-1.5 py-0.5 rounded-md transition-colors font-medium ${
              isEditing 
                ? 'whitespace-pre-wrap break-words' // 编辑时允许换行
                : 'truncate' // 默认单行显示，超出显示省略号
            } ${
              getTypeColor(node.type)
            } ${
              node.type !== 'object' && node.type !== 'array' 
                ? 'cursor-pointer hover:bg-slate-100' 
                : 'cursor-default'
            }`}
            onClick={(e) => {
              // 阻止事件冒泡
              e.stopPropagation();
              
              // 只允许编辑基本类型的值，对象和数组不可点击
              if (node.type !== 'object' && node.type !== 'array') {
                startEdit('value', getValueDisplay(node.value, node.type));
              }
            }}
            onContextMenu={(e) => handleRightClick(e, path[path.length - 1] || 'root', node.value, path, node.type)}
            title={node.type !== 'object' && node.type !== 'array' ? '点击编辑值 (右键查看详情)' : '对象/数组内容 (右键查看详情)'}
          >
            {getValueDisplay(node.value, node.type)}
          </span>
        )}



        {/* 父层级容器区域 - 8个水平排列的可点击容器框 */}
        {(node.type === 'object' || node.type === 'array') && (
          <div className="ml-1 flex items-center gap-2 flex-wrap">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((containerIndex) => {
              // 获取当前容器的配置
              const parentConfig = node.parentDisplayConfig;
              const containerConfig = parentConfig?.selectedChildren?.find(item => item.containerIndex === containerIndex);
              
              // 计算容器内容长度，实现弹性伸缩
              const getContainerWidth = () => {
                if (!containerConfig) return 'min-w-[80px] w-auto';
                
                const displayText = containerConfig.displayText || containerConfig.value?.toString() || '';
                const textLength = displayText.length;
                
                // 根据内容长度动态调整宽度，移除max-width限制，实现完全自适应
                if (textLength <= 8) return 'min-w-[80px] w-auto';
                if (textLength <= 16) return 'min-w-[120px] w-auto';
                if (textLength <= 24) return 'min-w-[160px] w-auto';
                if (textLength <= 32) return 'min-w-[200px] w-auto';
                return 'min-w-[240px] w-auto'; // 移除max-width，允许无限扩展
              };
              
              return (
                <div 
                  key={containerIndex}
                  className={`group/container inline-flex items-center justify-center rounded-lg px-2 py-1 text-xs cursor-pointer transition-all duration-200 h-[40px] ${getContainerWidth()} ${
                    containerConfig 
                      ? 'bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-300 hover:border-blue-400 shadow-sm' 
                      : 'hover:bg-blue-50 border border-transparent hover:border-blue-300'
                  }`}
                  style={{ padding: '6px', flexShrink: 0 }}
                  onClick={(e) => {
                     e.stopPropagation();
                     handleContainerClick(containerIndex);
                   }}
                  title={containerConfig ? `${containerConfig.displayText || containerConfig.value?.toString()}` : `点击选择子层级内容 (容器 ${containerIndex + 1})`}
                >
                  {containerConfig ? (
                    <div className="flex items-center justify-center w-full h-full">
                      {/* 只显示所选的具体内容 */}
                      <span className="text-blue-800 font-semibold text-sm leading-tight w-full text-center px-1 whitespace-nowrap" title={`${containerConfig.displayText || containerConfig.value?.toString()}`}>
                        {containerConfig.displayText || containerConfig.value?.toString()}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400 font-medium opacity-0 group-hover/container:opacity-100 transition-opacity">+</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center ml-3 space-x-1 transition-opacity">
          {/* 复制路径 */}
          <button
            onClick={copyPath}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
            title="复制路径"
          >
            {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
          </button>
          
          {/* 添加子节点 */}
          {(node.type === 'object' || node.type === 'array') && (
            <div className="relative">
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-100 rounded-md transition-colors"
                title="添加子节点"
              >
                <Plus size={14} />
              </button>
              
              {showAddMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowAddMenu(false)} />
                  <div className="absolute right-0 top-8 z-50 bg-white border border-slate-200 rounded-lg shadow-lg py-2 min-w-32">
                    <button onClick={() => handleAddNode('string')} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors">字符串</button>
                    <button onClick={() => handleAddNode('number')} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors">数字</button>
                    <button onClick={() => handleAddNode('boolean')} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors">布尔值</button>
                    <button onClick={() => handleAddNode('null')} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors">空值</button>
                    <hr className="my-2 border-slate-200" />
                    <button onClick={() => handleAddNode('object')} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors">对象</button>
                    <button onClick={() => handleAddNode('array')} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors">数组</button>
                  </div>
                </>
              )}
            </div>
          )}
          
          {/* 删除节点 */}
          {path.length > 0 && (
            <button
              onClick={handleDelete}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded-md transition-colors"
              title="删除节点"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 子节点 */}
      {renderChildren()}

      {/* 子层级选择弹窗 */}
      {showChildModal && (
        <ChildSelectionModal
          isOpen={showChildModal}
          onClose={() => setShowChildModal(false)}
          parentNode={node}
          parentPath={path}
          containerIndex={selectedContainerIndex || 0}
          onSelect={(childPath, childKey, childValue, childType) => {
            // 处理多层级选择的结果
            handleChildSelect(childPath, childKey, childValue, childType);
          }}
        />
      )}

    </div>
  );
}

// 主JSON树组件
export function JsonTreeView() {
  const { displayJsonData, currentFile, loading, error } = useEditorStore();
  const jsonData = displayJsonData; // 使用显示用的JSON数据

  if (loading) {
    return (
      <div className="h-full flex flex-col bg-gradient-to-b from-white to-slate-50">
        <div className="p-6 border-b border-slate-200 bg-white shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <Edit3 className="w-6 h-6 mr-3 text-green-600" />
            JSON 结构
          </h2>
          <p className="text-sm text-slate-500 mt-1">可视化JSON数据结构</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center space-x-3 text-slate-500">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-lg">加载中...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!currentFile) {
    return (
      <div className="h-full flex flex-col bg-gradient-to-b from-white to-slate-50">
        <div className="p-6 border-b border-slate-200 bg-white shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <Edit3 className="w-6 h-6 mr-3 text-green-600" />
            JSON 结构
          </h2>
          <p className="text-sm text-slate-500 mt-1">可视化JSON数据结构</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Edit3 className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-600 mb-2">开始编辑JSON</h3>
            <p className="text-slate-500 mb-1">请选择一个JSON文件</p>
            <p className="text-slate-400 text-sm">从左侧文件列表中选择要编辑的JSON文件</p>
          </div>
        </div>
      </div>
    );
  }

  if (!jsonData) {
    return (
      <div className="h-full flex flex-col bg-gradient-to-b from-white to-slate-50">
        <div className="p-6 border-b border-slate-200 bg-white shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <Edit3 className="w-6 h-6 mr-3 text-green-600" />
            JSON 结构
          </h2>
          <p className="text-sm text-slate-500 mt-1">可视化JSON数据结构</p>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-lg mx-auto">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <X className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-red-600 mb-3">无法解析JSON文件</h3>
            
            {/* 错误详情显示 */}
            {error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-700 font-medium mb-2">错误详情：</p>
                <div className="text-sm text-red-600 break-words bg-white p-3 rounded border font-mono">
                  {error}
                </div>
                {/* 添加调试信息 */}
                <div className="mt-3 pt-3 border-t border-red-200">
                  <p className="text-xs text-red-500 mb-1">调试信息：</p>
                  <p className="text-xs text-red-500">文件: {currentFile || '未知'}</p>
                  <p className="text-xs text-red-500">时间: {new Date().toLocaleString()}</p>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-700 font-medium mb-2">文件状态：</p>
                <p className="text-sm text-yellow-600">文件内容为空或格式不正确</p>
                <div className="mt-3 pt-3 border-t border-yellow-200">
                  <p className="text-xs text-yellow-500 mb-1">调试信息：</p>
                  <p className="text-xs text-yellow-500">文件: {currentFile || '未选择'}</p>
                  <p className="text-xs text-yellow-500">加载状态: {loading ? '加载中' : '已完成'}</p>
                </div>
              </div>
            )}
            
            {/* 解决方案建议 */}
            <div className="text-left bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-slate-600 font-medium mb-3">可能的解决方案：</p>
              <ul className="text-sm text-slate-500 space-y-2">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>检查JSON语法是否正确（括号、引号、逗号等）</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>确保文件编码为UTF-8</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>验证文件是否完整（未被截断或损坏）</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>尝试重新导入文件或选择其他文件</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>使用在线JSON验证工具检查文件格式</span>
                </li>
              </ul>
            </div>
            
            {/* 操作按钮 */}
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                刷新页面
              </button>
              <button
                onClick={() => {
                  console.log('调试信息:', {
                    currentFile,
                    error,
                    loading,
                    jsonData,
                    timestamp: new Date().toISOString()
                  });
                  toast.info('调试信息已输出到控制台');
                }}
                className="px-4 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                输出调试信息
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-white to-slate-50">
      <div className="p-6 border-b border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center">
              <Edit3 className="w-6 h-6 mr-3 text-green-600" />
              JSON 结构
            </h2>
            <p className="text-sm text-slate-500 mt-1">可视化JSON数据结构 - {currentFile}</p>
          </div>
          <button
            onClick={() => {
              const { resetDisplayToOriginal } = useEditorStore.getState();
              resetDisplayToOriginal();
              toast.success('已重置为原始JSON数据');
            }}
            className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
            title="重置为原始JSON数据"
          >
            <Copy size={14} />
            重置
          </button>
        </div>
      </div>
      

      
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="border border-gray-200 rounded-lg bg-white">
            {jsonData && (
              <JsonTree node={jsonData} path={[]} level={0} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}