/**
 * 简化版JSON树状结构组件
 * 专门用于插件层级结构显示，仅显示名称，无交互功能
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import type { JsonNode } from '../../shared/types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SimpleJsonTreeProps {
  data: any;
}

/**
 * 可拖拽的插件项组件
 */
interface SortablePluginItemProps {
  id: string;
  name: string;
  index: number;
  isSelected: boolean;
  isMerged: boolean;
  onSelect: (id: string, ctrlPressed: boolean) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
}

function SortablePluginItem({ id, name, index, isSelected, isMerged, onSelect, onContextMenu }: SortablePluginItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // 只有在按住Ctrl键时才响应点击
    if (e.ctrlKey) {
      onSelect(id, e.ctrlKey);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu(e, id);
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        ...(isMerged ? {
          margin: 0,
          padding: '8px 12px',
          border: 'none',
          borderRadius: 0,
          backgroundColor: 'transparent'
        } : {})
      }}
      {...attributes}
      className={`
        cursor-move transition-all duration-200 select-none
        ${isDragging ? 'shadow-xl bg-blue-50 border-blue-400 scale-105 z-50' : ''}
        ${!isMerged ? 
          'p-3 bg-white border-2 border-gray-200 rounded-lg mb-2 shadow-sm hover:bg-gray-50 hover:border-gray-300' :
          ''
        }
        ${isSelected && !isMerged ? 'border-blue-500 bg-blue-50' : ''}
      `}
      {...listeners}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-1">
          <div className="w-1 h-1 bg-gray-400 rounded-full" />
          <div className="w-1 h-1 bg-gray-400 rounded-full" />
          <div className="w-1 h-1 bg-gray-400 rounded-full" />
        </div>
        <span className="text-sm font-medium text-gray-700">{name}</span>
        {isMerged && (
          <span className="ml-auto text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
            已合并
          </span>
        )}
      </div>
    </div>
  );
}

interface SimpleJsonTreeNodeProps {
  node: JsonNode;
  path: string[];
  level: number;
}

/**
 * 获取节点的显示名称
 */
function getNodeName(key: string, value: any): string {
  return key;
}

/**
 * 获取子节点列表
 */
function getChildNodes(value: any): Array<{ key: string; value: any }> {
  if (!value || typeof value !== 'object') {
    return [];
  }
  
  if (Array.isArray(value)) {
    return value.map((item, index) => ({
      key: index.toString(),
      value: item
    }));
  }
  
  return Object.entries(value).map(([key, val]) => ({
    key,
    value: val
  }));
}

export default function SimpleJsonTree({ data }: SimpleJsonTreeProps) {
  const { updatePluginsOrder } = useEditorStore();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [mergedGroups, setMergedGroups] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    targetId: string;
  }>({ visible: false, x: 0, y: 0, targetId: '' });
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Ctrl键状态检测和选择状态管理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        setIsCtrlPressed(true);
      }
      // ESC键清除所有选择
      if (e.key === 'Escape') {
        setSelectedItems(new Set());
        setContextMenu({ visible: false, x: 0, y: 0, targetId: '' });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        setIsCtrlPressed(false);
        // 释放Ctrl键时清除选择状态
        setSelectedItems(new Set());
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      // 点击空白区域时清除选择和右键菜单
      const target = e.target as HTMLElement;
      if (!target.closest('.sortable-plugin-item') && !target.closest('.context-menu')) {
        setSelectedItems(new Set());
        setContextMenu({ visible: false, x: 0, y: 0, targetId: '' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('click', handleClickOutside);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('click', handleClickOutside);
    };
  }, []);

  if (!data) {
    return (
      <div className="p-4 text-gray-500 text-center">
        暂无数据
      </div>
    );
  }

  const getPluginChildren = (): string[] => {
    if (!data || typeof data !== 'object') return [];
    
    const plugins = (data as any).plugins;
    if (!plugins || typeof plugins !== 'object') return [];
    
    return Object.keys(plugins);
  };

  // 只显示plugins节点下的项名称
  const plugins = data.plugins;
  if (!plugins || typeof plugins !== 'object') {
    return (
      <div className="p-4 text-gray-500 text-center">
        未找到plugins数据
      </div>
    );
  }

  const pluginNames = getPluginChildren();
  const pluginItems = pluginNames.map((name, index) => ({
    id: name,
    name,
    index
  }));

  // 处理项目选择 - 严格的Ctrl键检测
  const handleItemSelect = useCallback((id: string, ctrlPressed: boolean) => {
    // 严格检查：必须同时满足Ctrl键被按下且事件中也检测到Ctrl键
    if (!isCtrlPressed || !ctrlPressed) {
      // 没有按住Ctrl键时，不做任何反应
      return;
    }

    setSelectedItems(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return newSelected;
    });
  }, [isCtrlPressed]);

  // 处理右键菜单
  const handleContextMenu = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      targetId: id
    });
  }, []);

  // 合并选中的项目
  const handleMergeItems = useCallback(() => {
    if (selectedItems.size < 2) return;

    const selectedArray = Array.from(selectedItems).sort((a, b) => {
      // 按照在原数组中的顺序排序，保持原有顺序
      const indexA = pluginNames.indexOf(a);
      const indexB = pluginNames.indexOf(b);
      return indexA - indexB;
    });
    
    const groupId = `group_${Date.now()}`;
    
    // 创建合并组ID（使用第一个项目的ID作为组ID）
    const firstGroupId = selectedArray[0];
    
    // 将所有选中项标记为同一个合并组
    selectedArray.forEach(item => {
      setMergedGroups(prev => new Set([...prev, `${firstGroupId}:${item}`]));
    });

    setSelectedItems(new Set());
    setContextMenu({ visible: false, x: 0, y: 0, targetId: '' });
  }, [selectedItems, pluginNames]);

  // 解除合并
  const handleUnmergeItem = useCallback((itemId: string) => {
    // 找到包含该项目的合并组或直接是合并组ID
    let groupToUnmerge = itemId;
    if (!itemId.startsWith('group_')) {
      groupToUnmerge = Array.from(mergedGroups).find(key => key.includes(itemId)) || '';
    }
    
    if (groupToUnmerge && mergedGroups.has(groupToUnmerge)) {
      setMergedGroups(prev => {
        const newGroups = new Set(prev);
        newGroups.delete(groupToUnmerge);
        return newGroups;
      });
    }
    setContextMenu({ visible: false, x: 0, y: 0, targetId: '' });
  }, [mergedGroups]);

  function handleDragStart(event: DragStartEvent) {
    // 拖拽开始时的处理逻辑
  }
  
  function handleDragOver(event: DragOverEvent) {
    // 拖拽经过时的处理逻辑
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active.id !== over?.id && over) {
      const oldIndex = pluginItems.findIndex(item => item.id === active.id);
      const newIndex = pluginItems.findIndex(item => item.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(pluginNames, oldIndex, newIndex);
        // 调用store方法更新插件顺序
        updatePluginsOrder(newOrder);
      }
    }
  }

  // 添加合并选中项的快捷键处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && selectedItems.size > 1) {
        handleMergeItems();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItems, handleMergeItems]);

  return (
    <div className="p-4 relative">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={pluginItems.map(item => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {(() => {
              const renderedItems: JSX.Element[] = [];
              const processedItems = new Set<string>();
              
              pluginItems.forEach((item) => {
                if (processedItems.has(item.id)) return;
                
                const isSelected = selectedItems.has(item.id);
                
                // 检查是否属于合并组
                const mergedGroupKey = Array.from(mergedGroups).find(key => key.includes(item.id));
                
                if (mergedGroupKey) {
                  // 获取合并组中的所有项目
                  const groupItems = mergedGroupKey.split(':').slice(1); // 移除组ID前缀
                  const mergedItemsData = groupItems.map(id => 
                    pluginItems.find(p => p.id === id)
                  ).filter(Boolean);
                  
                  // 标记这些项目已处理
                  groupItems.forEach(id => processedItems.add(id));
                  
                  // 渲染合并后的项目
                   renderedItems.push(
                     <div
                       key={mergedGroupKey}
                       className="merged-group"
                       style={{
                         border: '2px solid #3b82f6',
                         borderRadius: '8px',
                         backgroundColor: '#eff6ff',
                         margin: '4px 0',
                         padding: 0,
                         overflow: 'hidden'
                       }}
                       onContextMenu={(e) => handleContextMenu(e, mergedGroupKey)}
                     >
                       {mergedItemsData.map((mergedItem, index) => (
                         <div
                           key={mergedItem!.id}
                           style={{
                             borderBottom: index < mergedItemsData.length - 1 ? '1px solid #cbd5e1' : 'none'
                           }}
                         >
                           <SortablePluginItem
                             id={mergedItem!.id}
                             name={mergedItem!.name}
                             index={mergedItem!.index}
                             isSelected={false}
                             isMerged={true}
                             onSelect={handleItemSelect}
                             onContextMenu={handleContextMenu}
                           />
                         </div>
                       ))}
                     </div>
                   );
                } else {
                  // 渲染普通项目
                  processedItems.add(item.id);
                  renderedItems.push(
                    <SortablePluginItem
                      key={item.id}
                      id={item.id}
                      name={item.name}
                      index={item.index}
                      isSelected={isSelected}
                      isMerged={false}
                      onSelect={handleItemSelect}
                      onContextMenu={handleContextMenu}
                    />
                  );
                }
              });
              
              return renderedItems;
            })()}
          </div>
        </SortableContext>
      </DndContext>

      {/* 右键菜单 */}
      {contextMenu.visible && (
        <div
          className="fixed bg-white border border-gray-300 rounded-lg shadow-lg py-2 z-50 context-menu"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {(() => {
            // 检查目标项是否在合并组中
            const isMergedItem = Array.from(mergedGroups).some(key => key.includes(contextMenu.targetId));
            // 检查是否点击的是合并组容器
            const isGroupContainer = contextMenu.targetId.startsWith('group_');
            
            if (isMergedItem || isGroupContainer) {
              return (
                <button
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
                  onClick={() => handleUnmergeItem(contextMenu.targetId)}
                >
                  解除合并
                </button>
              );
            } else if (selectedItems.size > 1 && selectedItems.has(contextMenu.targetId)) {
              return (
                <button
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
                  onClick={handleMergeItems}
                >
                  合并选中项
                </button>
              );
            }
            return null;
          })()} 
        </div>
      )}

      {/* 提示信息 */}
      {selectedItems.size > 0 && (
        <div className="mt-4 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
          已选中 {selectedItems.size} 个项目
          {selectedItems.size > 1 && (
            <span className="ml-2">（按 Enter 键合并或右键选择合并）</span>
          )}
        </div>
      )}
    </div>
  );
}