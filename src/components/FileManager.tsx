/**
 * 文件管理器组件
 * 显示文件列表和文件操作功能
 */

import { useState, useEffect } from 'react';
import {
  FileText,
  Folder,
  MoreVertical,
  Trash2,
  Edit3,
  RefreshCw,
  Search,
  PanelLeftClose
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import { toast } from 'sonner';
import type { FileInfo } from '../../shared/types';

export function FileManager() {
  const {
    files,
    currentFile,
    loading,
    loadFile,
    loadFiles,
    deleteFile,
    toggleFileManager,
    contextMenu,
    showContextMenu,
    hideContextMenu
  } = useEditorStore((state) => ({
    files: state.files,
    currentFile: state.currentFile,
    loading: state.loading,
    loadFile: state.loadFile,
    loadFiles: state.loadFiles,
    deleteFile: state.deleteFile,
    toggleFileManager: state.toggleFileManager,
    contextMenu: state.contextMenu,
    showContextMenu: state.showContextMenu,
    hideContextMenu: state.hideContextMenu
  }));

  const [searchTerm, setSearchTerm] = useState('');

  // 添加调试日志监听files状态变化
  useEffect(() => {
    console.log('🔍 [FileManager] files状态变化:', {
      filesCount: files.length,
      fileNames: files.map(f => f.name),
      currentFile,
      loading
    });
  }, [files, currentFile, loading]);

  // 过滤文件
  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 加载文件
  const handleFileClick = async (filename: string) => {
    if (filename === currentFile) return;
    
    try {
      await loadFile(filename);
      toast.success(`已加载文件: ${filename}`);
    } catch (error) {
      toast.error('加载文件失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 刷新文件列表
  const handleRefresh = async () => {
    try {
      await loadFiles();
      toast.success('文件列表已刷新');
    } catch (error) {
      toast.error('刷新失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 删除文件
  const handleDeleteFile = async (filename: string) => {
    try {
      await deleteFile(filename);
      toast.success(`文件 "${filename}" 已删除`);
    } catch (error) {
      toast.error('删除失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };



  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化修改时间
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return '昨天';
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  };

  return (
    <>
      <div className="h-full flex flex-col bg-gradient-to-b from-slate-50 to-white">
        {/* 标题栏 */}
        <div className="p-6 border-b border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center">
                <Folder className="w-6 h-6 mr-3 text-blue-600" />
                文件管理
              </h2>
              <p className="text-sm text-slate-500 mt-1">管理您的JSON文件</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                title="刷新文件列表"
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={toggleFileManager}
                className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                title="隐藏文件管理器"
              >
                <PanelLeftClose size={18} />
              </button>
            </div>
          </div>
          
          {/* 搜索框 */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索文件..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
        </div>

        {/* 文件列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="flex items-center space-x-2 text-slate-500">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span>加载中...</span>
              </div>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-600 mb-2">
                {searchTerm ? '未找到匹配的文件' : '暂无JSON文件'}
              </h3>
              <p className="text-slate-400 text-sm">点击新建按钮创建您的第一个文件</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFiles.map((file) => (
                <div
                  key={file.path}
                  className={`group p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-md ${
                    currentFile === file.name
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-md ring-1 ring-blue-200'
                      : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                  onClick={() => handleFileClick(file.name)}

                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {/* 文件图标 */}
                      <div className={`p-2 rounded-lg mr-3 ${
                        currentFile === file.name ? 'bg-blue-100' : 'bg-slate-100 group-hover:bg-slate-200'
                      }`}>
                        {file.type === 'directory' ? (
                          <Folder className={`w-5 h-5 ${
                            currentFile === file.name ? 'text-blue-600' : 'text-slate-500'
                          }`} />
                        ) : (
                          <FileText className={`w-5 h-5 ${
                            currentFile === file.name ? 'text-blue-600' : 'text-slate-500'
                          }`} />
                        )}
                      </div>
                      
                      {/* 文件信息 */}
                      <div>
                        <div className="flex items-center">
                          <span className={`text-sm font-semibold ${
                            currentFile === file.name ? 'text-blue-900' : 'text-slate-700'
                          }`}>
                            {file.name}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3 mt-1">
                          <span className="text-xs text-slate-500">
                            {formatFileSize(file.size)}
                          </span>
                          <span className="text-xs text-slate-500">
                            {formatDate(file.lastModified)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 删除按钮 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // 阻止事件冒泡，避免触发文件加载
                        handleDeleteFile(file.name);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
                      title={`删除文件 ${file.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 文件统计 */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <p className="text-xs text-slate-600">
            共 {filteredFiles.length} 个文件
            {searchTerm && ` (从 ${files.length} 个文件中筛选)`}
          </p>
        </div>
      </div>
    </>
  );
}