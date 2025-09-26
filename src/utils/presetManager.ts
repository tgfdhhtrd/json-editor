import { PresetConfig, PresetStorage, PresetOperationResult, PresetManager } from '../types/preset';

/**
 * 预设管理器实现类
 * 负责预设的保存、加载、删除等操作
 */
class PresetManagerImpl implements PresetManager {
  private readonly STORAGE_KEY = 'json-editor-presets';
  private storage: PresetStorage;

  constructor() {
    this.storage = this.loadFromStorage();
  }

  /**
   * 从本地存储加载预设数据
   */
  private loadFromStorage(): PresetStorage {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          presets: parsed.presets || [],
          lastUsedPresetId: parsed.lastUsedPresetId,
          autoApplyLastUsed: parsed.autoApplyLastUsed ?? true
        };
      }
    } catch (error) {
      console.error('加载预设数据失败:', error);
    }
    
    return {
      presets: [],
      autoApplyLastUsed: true
    };
  }

  /**
   * 保存预设数据到本地存储
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.storage));
    } catch (error) {
      console.error('保存预设数据失败:', error);
    }
  }



  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 保存预设
   */
  async savePreset(
    name: string, 
    description: string, 
    pluginOrder: string[], 
    fileHash?: string,
    expandedNodes?: Record<string, boolean>,
    parentDisplayConfigs?: Record<string, {
      selectedChildren: Array<{
        containerIndex: number;
        childPath: string | string[];
        childKey: string;
        childValue: any;
        displayText: string;
      }>;
    }>
  ): Promise<PresetOperationResult> {
    try {
      // 验证输入
      if (!name.trim()) {
        return { success: false, message: '预设名称不能为空' };
      }
      
      if (!pluginOrder || pluginOrder.length === 0) {
        return { success: false, message: '插件顺序不能为空' };
      }
      
      // 检查名称是否已存在
      const existingPreset = this.storage.presets.find(p => p.name === name.trim());
      if (existingPreset) {
        return { success: false, message: '预设名称已存在，请使用其他名称' };
      }
      
      const now = Date.now();
      const newPreset: PresetConfig = {
        id: this.generateId(),
        name: name.trim(),
        description: description.trim(),
        pluginOrder: [...pluginOrder],
        expandedNodes: expandedNodes ? { ...expandedNodes } : undefined,
        parentDisplayConfigs: parentDisplayConfigs ? { ...parentDisplayConfigs } : undefined,
        createdAt: now,
        updatedAt: now,
        fileHash
      };
      
      this.storage.presets.push(newPreset);
      this.saveToStorage();
      
      return {
        success: true,
        message: '预设保存成功',
        data: newPreset
      };
    } catch (error) {
      console.error('保存预设失败:', error);
      return { success: false, message: '保存预设时发生错误' };
    }
  }

  /**
   * 加载预设
   */
  async loadPreset(presetId: string): Promise<PresetOperationResult> {
    try {
      const preset = this.storage.presets.find(p => p.id === presetId);
      if (!preset) {
        return { success: false, message: '预设不存在' };
      }
      
      // 更新最后使用的预设
      await this.setLastUsedPreset(presetId);
      
      return {
        success: true,
        message: '预设加载成功',
        data: preset
      };
    } catch (error) {
      console.error('加载预设失败:', error);
      return { success: false, message: '加载预设时发生错误' };
    }
  }

  /**
   * 获取所有预设
   */
  async getAllPresets(): Promise<PresetConfig[]> {
    return [...this.storage.presets].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * 删除预设
   */
  async deletePreset(presetId: string): Promise<PresetOperationResult> {
    try {
      const index = this.storage.presets.findIndex(p => p.id === presetId);
      if (index === -1) {
        return { success: false, message: '预设不存在' };
      }
      
      const deletedPreset = this.storage.presets[index];
      this.storage.presets.splice(index, 1);
      
      // 如果删除的是最后使用的预设，清除记录
      if (this.storage.lastUsedPresetId === presetId) {
        this.storage.lastUsedPresetId = undefined;
      }
      
      this.saveToStorage();
      
      return {
        success: true,
        message: '预设删除成功',
        data: deletedPreset
      };
    } catch (error) {
      console.error('删除预设失败:', error);
      return { success: false, message: '删除预设时发生错误' };
    }
  }

  /**
   * 更新预设
   */
  async updatePreset(presetId: string, updates: Partial<PresetConfig>): Promise<PresetOperationResult> {
    try {
      const preset = this.storage.presets.find(p => p.id === presetId);
      if (!preset) {
        return { success: false, message: '预设不存在' };
      }
      
      // 如果更新名称，检查是否重复
      if (updates.name && updates.name !== preset.name) {
        const existingPreset = this.storage.presets.find(p => p.name === updates.name && p.id !== presetId);
        if (existingPreset) {
          return { success: false, message: '预设名称已存在' };
        }
      }
      
      // 更新预设
      Object.assign(preset, updates, { updatedAt: Date.now() });
      this.saveToStorage();
      
      return {
        success: true,
        message: '预设更新成功',
        data: preset
      };
    } catch (error) {
      console.error('更新预设失败:', error);
      return { success: false, message: '更新预设时发生错误' };
    }
  }

  /**
   * 根据文件哈希获取匹配的预设
   */
  async getPresetsByFileHash(fileHash: string): Promise<PresetConfig[]> {
    return this.storage.presets.filter(p => p.fileHash === fileHash);
  }

  /**
   * 设置最后使用的预设
   */
  async setLastUsedPreset(presetId: string): Promise<void> {
    this.storage.lastUsedPresetId = presetId;
    this.saveToStorage();
  }

  /**
   * 获取最后使用的预设
   */
  async getLastUsedPreset(): Promise<PresetConfig | null> {
    if (!this.storage.lastUsedPresetId) {
      return null;
    }
    
    const preset = this.storage.presets.find(p => p.id === this.storage.lastUsedPresetId);
    return preset || null;
  }

  /**
   * 设置自动应用最后使用的预设
   */
  async setAutoApplyLastUsed(autoApply: boolean): Promise<void> {
    this.storage.autoApplyLastUsed = autoApply;
    this.saveToStorage();
  }

  /**
   * 获取自动应用设置
   */
  getAutoApplyLastUsed(): boolean {
    return this.storage.autoApplyLastUsed;
  }

  /**
   * 导出预设数据
   */
  exportPresets(): string {
    return JSON.stringify(this.storage, null, 2);
  }

  /**
   * 导入预设数据
   */
  async importPresets(data: string): Promise<PresetOperationResult> {
    try {
      const imported = JSON.parse(data);
      if (!imported.presets || !Array.isArray(imported.presets)) {
        return { success: false, message: '无效的预设数据格式' };
      }
      
      this.storage = {
        presets: imported.presets,
        lastUsedPresetId: imported.lastUsedPresetId,
        autoApplyLastUsed: imported.autoApplyLastUsed ?? true
      };
      
      this.saveToStorage();
      
      return {
        success: true,
        message: `成功导入 ${imported.presets.length} 个预设`
      };
    } catch (error) {
      console.error('导入预设失败:', error);
      return { success: false, message: '导入预设数据时发生错误' };
    }
  }
}

// 导出单例实例
export const presetManager = new PresetManagerImpl();
export default presetManager;