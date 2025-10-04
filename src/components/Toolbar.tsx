/**
 * 工具栏组件
 * 包含文件操作按钮和功能菜单
 */


import {
  Upload,
  Expand,
  Minimize2,
  PanelLeft,
  Undo,
  Redo,
  Save,
  Settings
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import { fileApi } from '../services/api';
import { toast } from 'sonner';

export function Toolbar() {
  const {
    currentFile,
    jsonContent,
    expandAllNodes,
    collapseAllNodes,
    canUndo,
    canRedo,
    undo,
    redo,
    loadFiles,
    loadFile,
    isFileManagerVisible,
    toggleFileManager,
    setPresetDialogOpen,
    setPresetManagementDialogOpen
  } = useEditorStore();







  // 导入文件
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('🔄 开始导入文件:', file.name);

    try {
      console.log('📤 调用 fileApi.importFile...');
      const result = await fileApi.importFile(file);
      console.log('✅ 文件导入API成功，返回结果:', result);
      
      // 重新加载文件列表
      console.log('🔄 调用 loadFiles() 重新加载文件列表...');
      await loadFiles();
      console.log('✅ loadFiles() 执行完成');
      
      // 自动加载新导入的文件
      console.log('🔄 调用 loadFile() 加载新文件:', result.filename);
      await loadFile(result.filename);
      console.log('✅ loadFile() 执行完成');
      
      // 显示成功消息
      toast.success(`文件 "${result.filename}" 导入成功`);
      console.log('🎉 文件导入流程全部完成');
    } catch (error) {
      console.error('❌ Import failed:', error);
      
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



  return (
    <>
      <div className="h-16 bg-gradient-to-r from-white to-slate-50 border-b border-slate-200 flex items-center justify-between px-6 shadow-md">
        {/* 左侧：文件操作 */}
        <div className="flex items-center space-x-3">
          {/* 预设操作按钮 */}
          <button
            onClick={() => setPresetDialogOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors shadow-sm"
            title="保存预设"
          >
            <Save className="w-4 h-4" />
            保存预设
          </button>
          <button
            onClick={() => setPresetManagementDialogOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors shadow-sm"
            title="管理预设"
          >
            <Settings className="w-4 h-4" />
            管理预设
          </button>
          
          <div className="w-px h-8 bg-slate-300"></div>
          
          {!isFileManagerVisible && (
            <button
              onClick={toggleFileManager}
              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shadow-sm"
              title="显示文件管理器"
            >
              <PanelLeft className="w-5 h-5" />
            </button>
          )}
          

          
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