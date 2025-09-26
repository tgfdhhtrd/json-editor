import React, { useState } from 'react';
import { X, Save } from 'lucide-react';

interface PresetSaveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string) => void;
  isLoading?: boolean;
}

export const PresetSaveDialog: React.FC<PresetSaveDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  isLoading = false
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证名称
    if (!name.trim()) {
      setNameError('预设名称不能为空');
      return;
    }
    
    if (name.trim().length < 2) {
      setNameError('预设名称至少需要2个字符');
      return;
    }
    
    if (name.trim().length > 50) {
      setNameError('预设名称不能超过50个字符');
      return;
    }
    
    setNameError('');
    onSave(name.trim(), description.trim());
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setNameError('');
    onClose();
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (nameError) {
      setNameError('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Save className="w-5 h-5 text-blue-600" />
            保存预设
          </h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* 预设名称 */}
            <div>
              <label htmlFor="preset-name" className="block text-sm font-medium text-gray-700 mb-2">
                预设名称 <span className="text-red-500">*</span>
              </label>
              <input
                id="preset-name"
                type="text"
                value={name}
                onChange={handleNameChange}
                disabled={isLoading}
                placeholder="请输入预设名称"
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                  nameError ? 'border-red-300' : 'border-gray-300'
                }`}
                maxLength={50}
                autoFocus
              />
              {nameError && (
                <p className="mt-1 text-sm text-red-600">{nameError}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {name.length}/50 字符
              </p>
            </div>

            {/* 预设描述 */}
            <div>
              <label htmlFor="preset-description" className="block text-sm font-medium text-gray-700 mb-2">
                预设描述
              </label>
              <textarea
                id="preset-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
                placeholder="请输入预设描述（可选）"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                rows={3}
                maxLength={200}
              />
              <p className="mt-1 text-xs text-gray-500">
                {description.length}/200 字符
              </p>
            </div>
          </div>

          {/* 按钮 */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  保存预设
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PresetSaveDialog;