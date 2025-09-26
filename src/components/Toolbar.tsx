/**
 * 工具栏组件
 * 包含文件操作按钮和功能菜单
 */

import { useState } from 'react';
import {
  Save,
  FileText,
  Upload,
  Download,
  Undo,
  Redo,
  Expand,
  Minimize2,
  Settings,
  PanelLeft
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import { fileApi } from '../services/api';
import { toast } from 'sonner';

export function Toolbar() {
  const {
    currentFile,
    isModified,
    jsonContent,
    saveCurrentFile,
    expandAllNodes,
    collapseAllNodes,
    canUndo,
    canRedo,
    undo,
    redo,
    loadFiles,
    isFileManagerVisible,
    toggleFileManager
  } = useEditorStore();



  // 保存文件
  const handleSave = async () => {
    if (!currentFile || !isModified) return;
    
    try {
      await saveCurrentFile();
      toast.success('文件保存成功');
    } catch (error) {
      toast.error('保存失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };



  // 导入文件
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // 添加文件信息日志
      console.log('开始导入文件:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified).toISOString()
      });
      
      const result = await fileApi.importFile(file);
      
      console.log('文件导入成功:', result);
      
      // 重新加载文件列表
      await loadFiles();
      
      // 显示成功消息
      toast.success(`文件 "${result.filename}" 导入成功`);
    } catch (error) {
      console.error('Import failed:', {
        error: error instanceof Error ? error.message : '未知错误',
        stack: error instanceof Error ? error.stack : undefined,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
      
      // 显示更详细的错误信息
      let errorMessage = '导入失败';
      if (error instanceof Error) {
        if (error.message.includes('JSON')) {
          errorMessage = `JSON解析错误: ${error.message}`;
        } else if (error.message.includes('format')) {
          errorMessage = `文件格式错误: ${error.message}`;
        } else {
          errorMessage = `导入失败: ${error.message}`;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      // 清空input值，允许重复选择同一文件
      event.target.value = '';
    }
  };

  // 导出文件
  const handleExport = async () => {
    if (!currentFile || !jsonContent) {
      toast.error('没有可导出的文件');
      return;
    }

    try {
      await fileApi.exportFile(jsonContent, currentFile, 'pretty');
      toast.success('文件导出成功');
    } catch (error) {
      toast.error('导出失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  return (
    <>
      <div className="h-16 bg-gradient-to-r from-white to-slate-50 border-b border-slate-200 flex items-center justify-between px-6 shadow-md">
        {/* 左侧：文件操作 */}
        <div className="flex items-center space-x-3">
          {!isFileManagerVisible && (
            <button
              onClick={toggleFileManager}
              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shadow-sm"
              title="显示文件管理器"
            >
              <PanelLeft className="w-5 h-5" />
            </button>
          )}
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSave}
              disabled={!currentFile || !isModified}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              title="保存文件 (Ctrl+S)"
            >
              <Save className="w-4 h-4" />
              保存预设
            </button>
          </div>
          
          <div className="w-px h-8 bg-slate-300"></div>
          
          <div className="flex items-center space-x-2">
            <label className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors shadow-sm cursor-pointer">
              <Upload className="w-4 h-4" />
              导入
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
            
            <button
              onClick={handleExport}
              disabled={!currentFile || !jsonContent}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              title="导出文件"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
          </div>
        </div>

        {/* 中间：视图操作 */}
        <div className="flex items-center space-x-2">
          <button
            onClick={expandAllNodes}
            disabled={!jsonContent}
            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            title="展开所有节点"
          >
            <Expand className="w-5 h-5" />
          </button>
          <button
            onClick={collapseAllNodes}
            disabled={!jsonContent}
            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            title="折叠所有节点"
          >
            <Minimize2 className="w-5 h-5" />
          </button>
        </div>
        
        {/* 右侧：编辑操作 */}
        <div className="flex items-center space-x-2">
          <button
            onClick={undo}
            disabled={!canUndo()}
            className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            title="撤销 (Ctrl+Z)"
          >
            <Undo className="w-5 h-5" />
          </button>
          
          <button
            onClick={redo}
            disabled={!canRedo()}
            className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            title="重做 (Ctrl+Y)"
          >
            <Redo className="w-5 h-5" />
          </button>
        </div>
      </div>


    </>
  );
}