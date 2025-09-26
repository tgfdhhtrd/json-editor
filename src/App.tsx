import { useEffect, useState, useCallback, useRef } from 'react';
import { Toaster } from 'sonner';
import { useEditorStore } from './store/useEditorStore';
import { Toolbar } from './components/Toolbar';
import { FileManager } from './components/FileManager';
import { JsonTreeView } from './components/JsonTree';
import { TreeView } from './components/TreeView';
import { PresetSaveDialog } from './components/PresetSaveDialog';
import { PresetManagementDialog } from './components/PresetManagementDialog';

import { GripHorizontal } from 'lucide-react';



function App() {
  const { 
    loadFiles, 
    currentFile, 
    isFileManagerVisible, 
    contextMenu, 
    hideContextMenu,
    setSelectedNodeForParent,
    isPresetDialogOpen,
    isPresetManagementDialogOpen,
    loadPresets,
    savePreset,
    setPresetDialogOpen,
    setPresetManagementDialogOpen,
    applyPreset
  } = useEditorStore();
  
  // 分隔条拖拽状态
  const [isDragging, setIsDragging] = useState(false);
  const [topHeight, setTopHeight] = useState(() => {
    const saved = localStorage.getItem('json-editor-split-ratio');
    return saved ? parseFloat(saved) : 60; // 默认上部分占60%
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startHeight = useRef(0);

  useEffect(() => {
    loadFiles();
    loadPresets();
  }, [loadFiles, loadPresets]);
  
  // 拖拽处理函数
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startY.current = e.clientY;
    startHeight.current = topHeight;
    
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, [topHeight]);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    e.preventDefault();
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const deltaY = e.clientY - startY.current;
    const containerHeight = containerRect.height;
    const deltaPercent = (deltaY / containerHeight) * 100;
    
    let newTopHeight = startHeight.current + deltaPercent;
    // 限制在15%-85%之间，确保两个窗口都有足够的可视空间
    newTopHeight = Math.max(15, Math.min(85, newTopHeight));
    
    setTopHeight(newTopHeight);
  }, [isDragging]);
  
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      
      // 保存到本地存储
      localStorage.setItem('json-editor-split-ratio', topHeight.toString());
    }
  }, [isDragging, topHeight]);
  
  // 添加全局鼠标事件监听
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // 全局点击事件监听器，确保点击其他区域时菜单能正确关闭
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      // 如果点击的不是右键菜单本身，则关闭菜单
      const target = e.target as HTMLElement;
      const isContextMenuClick = target.closest('[data-context-menu]');
      
      if (contextMenu.show && !isContextMenuClick) {
        hideContextMenu();
      }
    };

    if (contextMenu.show) {
      document.addEventListener('click', handleGlobalClick, true);
      return () => document.removeEventListener('click', handleGlobalClick, true);
    }
  }, [contextMenu.show, hideContextMenu]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Toaster position="top-right" richColors />
      
      {/* 顶部工具栏 */}
      <Toolbar />
      
      {/* 主要内容区域 */}
      <div className="flex h-[calc(100vh-64px)] min-h-0">
        {/* 左侧文件管理区域 */}
        {isFileManagerVisible && (
          <div className="w-80 bg-white/80 backdrop-blur-sm border-r border-slate-200 shadow-lg flex flex-col">
            <div className="flex-1">
              <FileManager />
            </div>

          </div>
        )}
        
        {/* 右侧JSON展示编辑区域 */}
        <div className="flex-1 flex flex-col bg-white/80 backdrop-blur-sm shadow-lg relative min-w-0 min-h-0">
          {/* 标题栏 */}
          <div className="h-12 bg-gradient-to-r from-slate-100 to-blue-100 border-b border-slate-200 flex items-center px-4">
            <h2 className="text-sm font-semibold text-slate-700">
              {currentFile ? (
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  编辑: {currentFile}
                </span>
              ) : (
                <span className="flex items-center gap-2 text-slate-500">
                  <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                  请选择一个JSON文件
                </span>
              )}
            </h2>
          </div>
          
          {/* JSON编辑器和树状视图容器 */}
          <div ref={containerRef} className="flex-1 flex flex-col overflow-hidden">
            {/* JSON编辑器 */}
            <div 
              className="overflow-hidden flex flex-col transition-all duration-200"
              style={{ height: `${topHeight}%` }}
            >
              <div className="flex-1 overflow-auto p-4">
                <JsonTreeView />
              </div>
            </div>
            
            {/* 可拖拽分隔条 */}
            <div 
              className={`relative flex items-center justify-center bg-gradient-to-r from-slate-200 to-blue-200 border-y border-slate-300 transition-all duration-200 ${
                isDragging ? 'bg-blue-300 shadow-lg' : 'hover:bg-gradient-to-r hover:from-slate-300 hover:to-blue-300'
              }`}
              style={{ height: '8px', cursor: 'row-resize', flexShrink: 0 }}
              onMouseDown={handleMouseDown}
            >
              {/* 拖拽手柄 */}
              <div className={`flex items-center justify-center transition-all duration-200 ${
                isDragging ? 'scale-110' : 'hover:scale-105'
              }`}>
                <GripHorizontal 
                  size={16} 
                  className={`transition-colors duration-200 ${
                    isDragging ? 'text-blue-700' : 'text-slate-500 hover:text-blue-600'
                  }`} 
                />
              </div>
              
              {/* 拖拽时的视觉反馈 */}
              {isDragging && (
                <div className="absolute inset-0 bg-blue-400 opacity-20 animate-pulse" />
              )}
            </div>
            
            {/* 树状结构视图 */}
            <div 
              className="overflow-hidden flex flex-col bg-slate-50/50 transition-all duration-200"
              style={{ height: `${100 - topHeight}%` }}
            >
              <div className="flex-1 overflow-auto p-4">
                <TreeView />
              </div>
            </div>
          </div>
          

        </div>
      </div>
      

      
      {/* 全局右键菜单 */}
      {contextMenu.show && contextMenu.type === 'json-tree' && (
        <div
          data-context-menu
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[160px]"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
            {contextMenu.data?.key}
          </div>
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors flex items-center space-x-2"
            onClick={() => {
              if (contextMenu.data) {
                setSelectedNodeForParent(contextMenu.data);
              }
              hideContextMenu();
            }}
          >
            <span>📋</span>
            <span>在父层级显示</span>
          </button>
          
          <div className="px-3 py-2 text-xs text-gray-400 border-t border-gray-100">
            类型: {contextMenu.data?.type}
          </div>
        </div>
      )}
      
      {/* 预设对话框 */}
      <PresetSaveDialog 
        isOpen={isPresetDialogOpen}
        onClose={() => setPresetDialogOpen(false)}
        onSave={savePreset}
      />
      
      <PresetManagementDialog 
        isOpen={isPresetManagementDialogOpen}
        onClose={() => setPresetManagementDialogOpen(false)}
        onApplyPreset={(preset) => applyPreset(preset.id)}
        currentFileHash={currentFile || ''}
      />
    </div>
  );
}

export default App;
