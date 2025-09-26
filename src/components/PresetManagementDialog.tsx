import React, { useState, useEffect } from 'react';
import { X, Settings, Trash2, Clock, FileText, Search, Download } from 'lucide-react';
import { PresetConfig } from '../types/preset';
import presetManager from '../utils/presetManager';

interface PresetManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPreset: (preset: PresetConfig) => void;
  currentFileHash?: string;
}

export const PresetManagementDialog: React.FC<PresetManagementDialogProps> = ({
  isOpen,
  onClose,
  onApplyPreset,
  currentFileHash
}) => {
  const [presets, setPresets] = useState<PresetConfig[]>([]);
  const [filteredPresets, setFilteredPresets] = useState<PresetConfig[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [showMatchingOnly, setShowMatchingOnly] = useState(false);

  // 加载预设列表
  const loadPresets = async () => {
    setIsLoading(true);
    try {
      const allPresets = await presetManager.getAllPresets();
      setPresets(allPresets);
    } catch (error) {
      console.error('加载预设失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 过滤预设
  useEffect(() => {
    let filtered = presets;
    
    // 根据搜索词过滤
    if (searchTerm) {
      filtered = filtered.filter(preset => 
        preset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (preset.description && preset.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // 根据文件哈希过滤
    if (showMatchingOnly && currentFileHash) {
      filtered = filtered.filter(preset => preset.fileHash === currentFileHash);
    }
    
    setFilteredPresets(filtered);
  }, [presets, searchTerm, showMatchingOnly, currentFileHash]);

  // 组件打开时加载预设
  useEffect(() => {
    if (isOpen) {
      loadPresets();
      setSearchTerm('');
      setSelectedPreset(null);
    }
  }, [isOpen]);

  // 删除预设
  const handleDeletePreset = async (presetId: string, presetName: string) => {
    try {
      const result = await presetManager.deletePreset(presetId);
      if (result.success) {
        await loadPresets();
        if (selectedPreset === presetId) {
          setSelectedPreset(null);
        }
      } else {
        alert(`删除失败: ${result.message}`);
      }
    } catch (error) {
      console.error('删除预设失败:', error);
      alert('删除预设时发生错误');
    }
  };

  // 应用预设
  const handleApplyPreset = (preset: PresetConfig) => {
    onApplyPreset(preset);
    onClose();
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 获取匹配的预设数量
  const matchingPresetsCount = currentFileHash 
    ? presets.filter(p => p.fileHash === currentFileHash).length 
    : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            预设管理
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 搜索和过滤 */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex gap-4 items-center">
            {/* 搜索框 */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="搜索预设名称或描述..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {/* 过滤选项 */}
            {currentFileHash && (
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={showMatchingOnly}
                  onChange={(e) => setShowMatchingOnly(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                仅显示匹配当前文件的预设 ({matchingPresetsCount})
              </label>
            )}
          </div>
        </div>

        {/* 预设列表 */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-gray-600">加载中...</span>
            </div>
          ) : filteredPresets.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm || showMatchingOnly ? '没有找到匹配的预设' : '暂无预设'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
                >
                  清除搜索
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredPresets.map((preset) => (
                <div
                  key={preset.id}
                  className={`border rounded-lg p-4 transition-all cursor-pointer ${
                    selectedPreset === preset.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedPreset(preset.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-gray-900">{preset.name}</h3>
                        {preset.fileHash === currentFileHash && (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                            匹配当前文件
                          </span>
                        )}
                      </div>
                      
                      {preset.description && (
                        <p className="text-sm text-gray-600 mb-2">{preset.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          创建: {formatTime(preset.createdAt)}
                        </span>
                        <span>
                          插件数量: {preset.pluginOrder.length}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyPreset(preset);
                        }}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        应用
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePreset(preset.id, preset.name);
                        }}
                        className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        删除
                      </button>
                    </div>
                  </div>
                  
                  {/* 插件顺序预览 */}
                  {selectedPreset === preset.id && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-2">插件顺序:</p>
                      <div className="flex flex-wrap gap-1">
                        {preset.pluginOrder.map((plugin, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                          >
                            {index + 1}. {plugin}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              共 {presets.length} 个预设
              {filteredPresets.length !== presets.length && (
                <span>，显示 {filteredPresets.length} 个</span>
              )}
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PresetManagementDialog;