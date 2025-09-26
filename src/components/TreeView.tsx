/**
 * TreeView组件 - 显示plugins节点下的完整层级结构
 * 支持容器点击和同步选择功能
 */


import { Folder } from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import type { JsonNode } from '../../shared/types';
import SimpleJsonTree from './SimpleJsonTree';

interface TreeViewProps {
  className?: string;
}

// 主TreeView组件
export function TreeView({ className = '' }: TreeViewProps) {
  const { jsonData } = useEditorStore();
  
  // 获取plugins节点
  const getPluginsNode = (): JsonNode | null => {
    if (!jsonData || !jsonData.children || typeof jsonData.children !== 'object') {
      return null;
    }
    
    const pluginsNode = (jsonData.children as { [key: string]: JsonNode })['plugins'];
    if (!pluginsNode) {
      return null;
    }
    
    return pluginsNode;
  };
  
  const pluginsNode = getPluginsNode();
  
  if (!pluginsNode) {
    return (
      <div className={`p-4 text-center text-slate-500 ${className}`}>
        <div className="flex flex-col items-center space-y-2">
          <Folder size={48} className="text-slate-300" />
          <p>暂无插件数据</p>
          <p className="text-sm">请确保JSON文件包含plugins节点</p>
        </div>
      </div>
    );
  }
  

  
  // 获取plugins下的直接子项名称
  const getPluginItemNames = (): string[] => {
    if (!pluginsNode.children || typeof pluginsNode.children !== 'object') {
      return [];
    }
    
    if (Array.isArray(pluginsNode.children)) {
      return pluginsNode.children.map((_, index) => String(index));
    }
    
    return Object.keys(pluginsNode.children);
  };
  
  const pluginItemNames = getPluginItemNames();
  
  return (
    <div className={`h-full flex flex-col bg-white border border-slate-200 rounded-lg shadow-sm ${className}`}>
      {/* 标题栏 */}
      <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
        <div className="flex items-center">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center">
            <Folder size={16} className="mr-2 text-blue-500" />
            插件项目
          </h3>
          <span className="ml-2 text-xs text-slate-500">({pluginItemNames.length} 个项目)</span>
        </div>
      </div>
      
      {/* 插件项目名称列表 - 使用SimpleJsonTree支持拖拽 */}
      <div className="flex-1 overflow-y-auto p-4">
        {pluginItemNames.length > 0 ? (
          <SimpleJsonTree data={jsonData?.value || {}} />
        ) : (
          <div className="text-center text-slate-500 py-8">
            <p>暂无插件项目</p>
          </div>
        )}
      </div>
    </div>
  );
}