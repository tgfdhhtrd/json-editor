/**
 * API服务模块
 * 封装所有后端API调用
 */

import type {
  FileInfo,
  JsonFileResponse,
  SaveFileRequest,
  ExportRequest,
  ApiResponse,
  ImportResponse
} from '../../shared/types';

const API_BASE_URL = '/api';

/**
 * 通用API请求函数
 */
async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const fullUrl = `${API_BASE_URL}${url}`;
  console.log('🌐 API请求:', {
    url: fullUrl,
    method: options.method || 'GET'
  });
  
  try {
    const response = await fetch(fullUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    console.log('🌐 API响应状态:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      // 尝试解析错误响应
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (parseError) {
        console.warn('无法解析错误响应:', parseError);
      }
      
      console.error('❌ HTTP错误:', errorMessage);
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('✅ API响应成功:', {
      success: result.success,
      hasData: !!result.data,
      hasError: !!result.error
    });
    
    return result;
  } catch (error) {
    console.error('❌ API请求失败:', {
      url: fullUrl,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * 文件API服务
 */
export const fileApi = {
  /**
   * 获取所有JSON文件列表
   */
  async getFiles(): Promise<FileInfo[]> {
    const response = await apiRequest<FileInfo[]>('/files');
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to get files');
  },

  /**
   * 读取JSON文件内容
   */
  async readFile(filename: string): Promise<any> {
    const encodedFilename = encodeURIComponent(filename);
    console.log('🔄 开始读取文件:', filename);
    
    try {
      const response = await fetch(`/api/files/${encodedFilename}`);
      
      if (!response.ok) {
        throw new Error(`Failed to read file: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('📥 API响应:', {
        success: result.success,
        hasData: !!result.data,
        dataType: typeof result.data,
        error: result.error
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to read file');
      }
      
      if (result.data === undefined || result.data === null) {
        throw new Error('文件内容为空或未找到');
      }
      
      return result.data;
    } catch (error) {
      console.error('❌ 读取文件失败:', error);
      throw error;
    }
  },

  /**
   * 保存JSON文件
   */
  async saveFile(filename: string, content: any, preserveFormat = true): Promise<void> {
    const saveRequest: SaveFileRequest = {
      content,
      preserveFormat,
    };

    const response = await apiRequest(`/files/${encodeURIComponent(filename)}`, {
      method: 'POST',
      body: JSON.stringify(saveRequest),
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to save file');
    }
  },

  /**
   * 创建新的JSON文件
   */
  async createFile(filename: string, content: any = {}): Promise<void> {
    const response = await apiRequest(`/files/${encodeURIComponent(filename)}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to create file');
    }
  },

  /**
   * 删除JSON文件
   */
  async deleteFile(filename: string): Promise<void> {
    const response = await apiRequest(`/files/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete file');
    }
  },

  /**
   * 导入JSON文件
   */
  async importFile(file: File): Promise<ImportResponse> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/files/import`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        return {
          content: result.data.content,
          filename: result.data.filename,
          success: true,
        };
      }
      throw new Error(result.error || 'Failed to import file');
    } catch (error) {
      console.error('Import file failed:', error);
      throw error;
    }
  },

  /**
   * 导出JSON文件
   */
  async exportFile(
    content: any,
    filename: string,
    format: 'pretty' | 'compact' | 'original' = 'pretty'
  ): Promise<void> {
    const exportRequest: ExportRequest = {
      content,
      filename,
      format,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/files/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportRequest),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // 创建下载链接
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export file failed:', error);
      throw error;
    }
  },

  /**
   * 验证JSON格式
   */
  async validateJson(content: string | any): Promise<boolean> {
    try {
      const response = await apiRequest('/files/validate', {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      return response.success;
    } catch (error) {
      console.error('Validate JSON failed:', error);
      return false;
    }
  },
};

/**
 * 健康检查
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch('/health');
    return response.ok;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}