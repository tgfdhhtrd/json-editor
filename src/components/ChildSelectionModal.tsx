/**
 * 子层级选择弹窗组件
 * 用于在父层级容器点击时显示所有可选的子层级选项
 * 支持多层级嵌套选择和递归弹窗
 */

import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronDown, ArrowLeft, Home, Check, Folder, File, Hash, Type, ToggleLeft, List, Braces } from 'lucide-react';
import type { JsonNode } from '../../shared/types';

interface ChildSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentNode: JsonNode;
  parentPath: string[];
  containerIndex: number;
  onSelect: (childPath: string, childKey: string, childValue: any, childType: string) => void;
}

interface ChildOption {
  key: string;
  value: any;
  type: string;
  path: string;
  displayValue: string;
  hasChildren: boolean;
  node: JsonNode;
}

interface NavigationLevel {
  node: JsonNode;
  path: string[];
  title: string;
}

export function ChildSelectionModal({
  isOpen,
  onClose,
  parentNode,
  parentPath,
  containerIndex,
  onSelect
}: ChildSelectionModalProps) {
  const [childOptions, setChildOptions] = useState<ChildOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<ChildOption | null>(null);
  const [navigationStack, setNavigationStack] = useState<NavigationLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState<NavigationLevel | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [nodeChildren, setNodeChildren] = useState<Map<string, ChildOption[]>>(new Map());

  // 获取值的显示文本
  const getValueDisplay = (value: any, type: string): string => {
    switch (type) {
      case 'string': return `"${String(value).substring(0, 30)}${String(value).length > 30 ? '...' : ''}"`;
      case 'null': return 'null';
      case 'boolean': return value ? 'true' : 'false';
      case 'object': return `{${Object.keys(value || {}).length} 项}`;
      case 'array': return `[${(value || []).length} 项]`;
      case 'number': return String(value);
      default: return String(value).substring(0, 30) + (String(value).length > 30 ? '...' : '');
    }
  };

  // 获取节点图标
  const getNodeIcon = (type: string, hasChildren: boolean) => {
    if (hasChildren) {
      switch (type) {
        case 'object':
          return <Braces size={16} className="text-blue-600" />;
        case 'array':
          return <List size={16} className="text-green-600" />;
        default:
          return <Folder size={16} className="text-yellow-600" />;
      }
    } else {
      switch (type) {
        case 'string':
          return <Type size={16} className="text-purple-600" />;
        case 'number':
          return <Hash size={16} className="text-orange-600" />;
        case 'boolean':
          return <ToggleLeft size={16} className="text-green-600" />;
        case 'null':
          return <File size={16} className="text-gray-600" />;
        default:
          return <File size={16} className="text-gray-600" />;
      }
    }
  };

  // 树形节点组件
  interface TreeNodeItemProps {
    option: ChildOption;
    isSelected: boolean;
    onSelect: () => void;
    onDrillDown: () => void;
    depth: number;
    isLast: boolean;
    getTypeColor: (type: string) => string;
    children?: ChildOption[];
    onToggleExpand?: () => void;
    isExpanded?: boolean;
  }

  function TreeNodeItem({ 
    option, 
    isSelected, 
    onSelect, 
    onDrillDown, 
    depth, 
    isLast, 
    getTypeColor,
    children,
    onToggleExpand,
    isExpanded = false
  }: TreeNodeItemProps) {
    const indentWidth = depth * 24;
    const hasChildren = option.hasChildren && children && children.length > 0;
    
    return (
      <div className="relative">
        {/* 连接线 */}
        {depth > 0 && (
          <>
            {/* 垂直线 */}
            <div 
              className="absolute border-l border-slate-300"
              style={{
                left: `${indentWidth - 12}px`,
                top: 0,
                height: isLast ? '12px' : '100%',
                width: '1px'
              }}
            />
            {/* 水平线 */}
            <div 
              className="absolute border-t border-slate-300"
              style={{
                left: `${indentWidth - 12}px`,
                top: '12px',
                width: '12px',
                height: '1px'
              }}
            />
          </>
        )}
        
        {/* 节点内容 */}
        <div 
          className={`group flex items-center py-2 px-2 cursor-pointer transition-all duration-200 rounded-lg ${
            isSelected
              ? 'bg-blue-100 border border-blue-300 shadow-sm'
              : 'hover:bg-slate-50 border border-transparent'
          }`}
          style={{ paddingLeft: `${indentWidth + 8}px` }}
          onClick={onSelect}
          onDoubleClick={onDrillDown}
        >
          {/* 展开/折叠按钮 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className={`mr-2 p-1 rounded-md transition-colors ${
              hasChildren
                ? 'text-slate-600 hover:text-slate-800 hover:bg-slate-200'
                : 'invisible'
            }`}
            disabled={!hasChildren}
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          {/* 节点图标 */}
          <div className="flex-shrink-0 mr-2">
            {getNodeIcon(option.type, option.hasChildren)}
          </div>
          
          {/* 节点信息 */}
          <div className="flex-1 min-w-0 flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              {/* 键名和类型 */}
              <div className="flex items-center space-x-2 min-w-0">
                <span className="font-medium text-slate-800 truncate">
                  {option.key}
                </span>
                <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                  getTypeColor(option.type)
                }`}>
                  {option.type}
                </span>
                {option.hasChildren && (
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                    可深入
                  </span>
                )}
              </div>
              
              {/* 值预览 */}
              <div className="text-sm text-slate-500 truncate max-w-[200px]">
                {option.displayValue}
              </div>
            </div>
            
            {/* 操作按钮 */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              {option.hasChildren && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDrillDown();
                  }}
                  className="p-1 text-green-600 hover:text-green-800 hover:bg-green-100 rounded transition-colors"
                  title="深入到子层级"
                >
                  <ChevronRight size={14} />
                </button>
              )}
              {isSelected && (
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <Check size={12} className="text-white" />
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* 子节点 */}
        {isExpanded && hasChildren && children && (
          <div className="ml-3">
            {children.map((child, index) => (
              <TreeNodeItem
                key={child.path}
                option={child}
                isSelected={selectedOption?.path === child.path}
                onSelect={() => setSelectedOption(child)}
                onDrillDown={() => child.hasChildren && drillDown(child)}
                depth={depth + 1}
                isLast={index === children.length - 1}
                getTypeColor={getTypeColor}
                children={getNodeChildren(child.path)}
                onToggleExpand={() => toggleNodeExpansion(child.path)}
                isExpanded={expandedNodes.has(child.path)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // 获取类型颜色
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'string': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'number': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'boolean': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'null': return 'text-slate-500 bg-slate-50 border-slate-200';
      case 'object': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'array': return 'text-indigo-600 bg-indigo-50 border-indigo-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  // 检查节点是否有子层级
  const hasChildrenNodes = (node: JsonNode): boolean => {
    if (!node.children) return false;
    if (node.type === 'object') {
      return Object.keys(node.children).length > 0;
    } else if (node.type === 'array') {
      return node.children.length > 0;
    }
    return false;
  };

  // 切换节点展开状态
  const toggleNodeExpansion = (path: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
        // 获取子选项
        if (!nodeChildren.has(path)) {
          // 在所有选项中查找（包括已展开的子选项）
          const findOptionByPath = (options: ChildOption[], targetPath: string): ChildOption | null => {
            for (const option of options) {
              if (option.path === targetPath) {
                return option;
              }
              const childOptions = nodeChildren.get(option.path);
              if (childOptions) {
                const found = findOptionByPath(childOptions, targetPath);
                if (found) return found;
              }
            }
            return null;
          };
          
          const option = findOptionByPath(childOptions, path);
          if (option && hasChildrenNodes(option.node)) {
            const children = collectDirectChildOptions(option.node, option.path.split('.'));
            setNodeChildren(prev => new Map(prev).set(path, children));
          }
        }
      }
      return newSet;
    });
  };

  // 获取节点的子选项
  const getNodeChildren = (path: string): ChildOption[] => {
    return nodeChildren.get(path) || [];
  };

  // 收集当前层级的直接子选项（不递归）
  const collectDirectChildOptions = (node: JsonNode, currentPath: string[]): ChildOption[] => {
    const options: ChildOption[] = [];
    
    if (!node.children) return options;

    if (node.type === 'object') {
      Object.entries(node.children).forEach(([key, childNode]) => {
        const safePath = currentPath || [];
        const childPath = [...safePath, key];
        const pathString = childPath.join('.');
        
        options.push({
          key,
          value: childNode.value,
          type: childNode.type,
          path: pathString,
          displayValue: getValueDisplay(childNode.value, childNode.type),
          hasChildren: hasChildrenNodes(childNode),
          node: childNode
        });
      });
    } else if (node.type === 'array') {
      node.children.forEach((childNode, index) => {
        const safePath = currentPath || [];
        const childPath = [...safePath, String(index)];
        const pathString = childPath.join('.');
        
        options.push({
          key: `[${index}]`,
          value: childNode.value,
          type: childNode.type,
          path: pathString,
          displayValue: getValueDisplay(childNode.value, childNode.type),
          hasChildren: hasChildrenNodes(childNode),
          node: childNode
        });
      });
    }

    return options;
  };

  // 导航到指定层级
  const navigateToLevel = (node: JsonNode, path: string[], title: string) => {
    const newLevel: NavigationLevel = { node, path, title };
    setCurrentLevel(newLevel);
    const options = collectDirectChildOptions(node, path);
    setChildOptions(options);
    setSelectedOption(null);
    // 清理展开状态和子节点缓存
    setExpandedNodes(new Set());
    setNodeChildren(new Map());
  };

  // 深入到子层级
  const drillDown = (option: ChildOption) => {
    if (!option.hasChildren) return;
    
    // 将当前层级加入导航栈
    if (currentLevel) {
      setNavigationStack(prev => [...prev, currentLevel]);
    }
    
    // 导航到新层级
    const newPath = option.path.split('.');
    navigateToLevel(option.node, newPath, option.key);
  };

  // 返回上一层级
  const goBack = () => {
    if (navigationStack.length === 0) return;
    
    const previousLevel = navigationStack[navigationStack.length - 1];
    setNavigationStack(prev => prev.slice(0, -1));
    setCurrentLevel(previousLevel);
    
    const options = collectDirectChildOptions(previousLevel.node, previousLevel.path);
    setChildOptions(options);
    setSelectedOption(null);
  };

  // 返回根层级
  const goToRoot = () => {
    setNavigationStack([]);
    const rootTitle = parentPath && parentPath.length > 0 ? parentPath[parentPath.length - 1] : '根目录';
    navigateToLevel(parentNode, parentPath || [], rootTitle);
  };

  // 当弹窗打开时初始化
  useEffect(() => {
    if (isOpen && parentNode) {
      setNavigationStack([]);
      const rootTitle = parentPath && parentPath.length > 0 ? parentPath[parentPath.length - 1] : '根目录';
      navigateToLevel(parentNode, parentPath || [], rootTitle);
    }
  }, [isOpen, parentNode, parentPath]);

  // 处理选择
  const handleSelect = () => {
    if (selectedOption) {
      onSelect(
        selectedOption.path,
        selectedOption.key,
        selectedOption.value,
        selectedOption.type
      );
      onClose();
    }
  };

  // 处理键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && selectedOption) {
        handleSelect();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, selectedOption, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* 弹窗内容 */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* 头部 */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">
              选择子层级内容
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* 面包屑导航 */}
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-slate-500">容器 {containerIndex + 1}:</span>
            
            {/* 根目录按钮 */}
            <button
              onClick={goToRoot}
              className="flex items-center space-x-1 px-2 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
            >
              <Home size={14} />
              <span>根目录</span>
            </button>
            
            {/* 导航路径 */}
            {navigationStack.map((level, index) => (
              <React.Fragment key={index}>
                <ChevronRight size={14} className="text-slate-400" />
                <button
                  onClick={() => {
                    // 返回到指定层级
                    setNavigationStack(prev => prev.slice(0, index + 1));
                    setCurrentLevel(level);
                    const options = collectDirectChildOptions(level.node, level.path);
                    setChildOptions(options);
                    setSelectedOption(null);
                  }}
                  className="px-2 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                >
                  {level.title}
                </button>
              </React.Fragment>
            ))}
            
            {/* 当前层级 */}
            {currentLevel && (
              <>
                <ChevronRight size={14} className="text-slate-400" />
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-medium">
                  {currentLevel.title}
                </span>
              </>
            )}
          </div>
          
          {/* 返回按钮 */}
          {navigationStack.length > 0 && (
            <div className="mt-3">
              <button
                onClick={goBack}
                className="flex items-center space-x-2 px-3 py-1.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={16} />
                <span>返回上一层</span>
              </button>
            </div>
          )}
        </div>

        {/* 树形结构选项 */}
        <div className="flex-1 overflow-y-auto p-4">
          {childOptions.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📁</span>
              </div>
              <p className="text-lg font-medium mb-2">该父层级下没有可选的子层级</p>
              <p className="text-sm text-slate-400">请展开父层级或选择其他包含子项的节点</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              <div className="text-sm text-slate-600 mb-3 flex items-center justify-between">
                <span>共找到 {childOptions.length} 个子层级选项</span>
                <span className="text-xs text-slate-400">点击选择要显示的内容</span>
              </div>
              {childOptions.map((option, index) => (
                <TreeNodeItem
                  key={`${option.path}-${index}`}
                  option={option}
                  isSelected={selectedOption?.path === option.path}
                  onSelect={() => setSelectedOption(option)}
                  onDrillDown={() => option.hasChildren && drillDown(option)}
                  depth={0}
                  isLast={index === childOptions.length - 1}
                  getTypeColor={getTypeColor}
                  children={getNodeChildren(option.path)}
                  onToggleExpand={() => toggleNodeExpansion(option.path)}
                  isExpanded={expandedNodes.has(option.path)}
                />
              ))}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end space-x-3 p-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSelect}
            disabled={!selectedOption}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedOption
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            确认选择
          </button>
        </div>
      </div>
    </div>
  );
}