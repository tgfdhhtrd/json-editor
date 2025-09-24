/**
 * 简化版JSON树状结构组件
 * 专门用于插件层级结构显示，仅显示名称，无交互功能
 */

import React from 'react';
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
}

function SortablePluginItem({ id, name, index }: SortablePluginItemProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`
        p-3 mb-2 bg-white border-2 border-gray-200 rounded-lg cursor-move
        hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 select-none
        ${isDragging ? 'shadow-xl bg-blue-50 border-blue-400 scale-105 z-50' : 'shadow-sm'}
      `}
      {...listeners}
    >
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-1">
          <div className="w-1 h-1 bg-gray-400 rounded-full" />
          <div className="w-1 h-1 bg-gray-400 rounded-full" />
          <div className="w-1 h-1 bg-gray-400 rounded-full" />
        </div>
        <span className="text-sm font-medium text-gray-700">{name}</span>
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

  return (
    <div className="p-4">
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
            {pluginItems.map((item) => (
              <SortablePluginItem
                key={item.id}
                id={item.id}
                name={item.name}
                index={item.index}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}