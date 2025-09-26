/**
 * 状态栏组件
 * 显示当前文件状态和编辑信息
 */

import { useState, useEffect } from 'react';
import {
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';

export function StatusBar() {
  const { currentFile, isModified, jsonData, loading } = useEditorStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // 更新时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 监听网络状态
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 计算JSON节点数量
  const getNodeCount = (node: any): number => {
    if (!node || typeof node !== 'object') return 1;
    
    let count = 1;
    if (node.children) {
      if (Array.isArray(node.children)) {
        count += node.children.reduce((sum: number, child: any) => sum + getNodeCount(child), 0);
      } else {
        count += Object.values(node.children).reduce((sum: number, child: any) => sum + getNodeCount(child), 0);
      }
    }
    return count;
  };

  // 格式化时间
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // 获取文件状态
  const getFileStatus = () => {
    if (loading) {
      return {
        icon: <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-500" />,
        text: '加载中...',
        color: 'text-blue-600'
      };
    }
    
    if (!currentFile) {
      return {
        icon: <FileText size={14} />,
        text: '未选择文件',
        color: 'text-gray-500'
      };
    }
    
    if (isModified) {
      return {
        icon: <AlertCircle size={14} />,
        text: '有未保存的更改',
        color: 'text-orange-600'
      };
    }
    
    return {
      icon: <CheckCircle size={14} />,
      text: '已保存',
      color: 'text-green-600'
    };
  };

  const fileStatus = getFileStatus();
  const nodeCount = jsonData ? getNodeCount(jsonData) : 0;

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-200 text-sm">
      {/* 左侧：文件状态 */}
      <div className="flex items-center space-x-4">
        {/* 文件状态 */}
        <div className={`flex items-center space-x-1 ${fileStatus.color}`}>
          {fileStatus.icon}
          <span>{fileStatus.text}</span>
        </div>
        
        {/* 当前文件 */}
        {currentFile && (
          <div className="flex items-center space-x-1 text-gray-600">
            <FileText size={14} />
            <span>{currentFile}</span>
          </div>
        )}
        
        {/* JSON节点数量 */}
        {jsonData && (
          <div className="text-gray-600">
            <span>{nodeCount} 个节点</span>
          </div>
        )}
      </div>

      {/* 右侧：系统状态 */}
      <div className="flex items-center space-x-4">
        {/* 网络状态 */}
        <div className={`flex items-center space-x-1 ${
          isOnline ? 'text-green-600' : 'text-red-600'
        }`}>
          {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
          <span>{isOnline ? '在线' : '离线'}</span>
        </div>
        
        {/* 当前时间 */}
        <div className="flex items-center space-x-1 text-gray-600">
          <Clock size={14} />
          <span>{formatTime(currentTime)}</span>
        </div>
      </div>
    </div>
  );
}