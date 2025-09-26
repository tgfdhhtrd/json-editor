/**
 * 预设功能相关的类型定义
 */

// 预设配置接口
export interface PresetConfig {
  id: string;                    // 预设唯一标识
  name: string;                  // 预设名称
  description?: string;          // 预设描述
  pluginOrder: string[];         // 插件顺序数组
  expandedNodes?: Record<string, boolean>; // 节点展开状态
  parentDisplayConfigs?: Record<string, {
    selectedChildren: Array<{
      containerIndex: number;
      childPath: string | string[];
      childKey: string;
      childValue: any;
      displayText: string;
    }>;
  }>; // 父层级容器配置
  createdAt: number;            // 创建时间戳
  updatedAt: number;            // 更新时间戳
  fileHash?: string;            // 文件哈希值（用于识别相同结构的文件）
}

// 预设存储接口
export interface PresetStorage {
  presets: PresetConfig[];       // 所有预设列表
  lastUsedPresetId?: string;     // 最后使用的预设ID
  autoApplyLastUsed: boolean;    // 是否自动应用最后使用的预设
}

// 预设操作结果
export interface PresetOperationResult {
  success: boolean;
  message: string;
  data?: any;
}

// 预设管理器接口
export interface PresetManager {
  // 保存预设
  savePreset(name: string, description: string, pluginOrder: string[], fileHash?: string, expandedNodes?: Record<string, boolean>): Promise<PresetOperationResult>;
  
  // 加载预设
  loadPreset(presetId: string): Promise<PresetOperationResult>;
  
  // 获取所有预设
  getAllPresets(): Promise<PresetConfig[]>;
  
  // 删除预设
  deletePreset(presetId: string): Promise<PresetOperationResult>;
  
  // 更新预设
  updatePreset(presetId: string, updates: Partial<PresetConfig>): Promise<PresetOperationResult>;
  
  // 根据文件哈希获取匹配的预设
  getPresetsByFileHash(fileHash: string): Promise<PresetConfig[]>;
  
  // 设置最后使用的预设
  setLastUsedPreset(presetId: string): Promise<void>;
  
  // 获取最后使用的预设
  getLastUsedPreset(): Promise<PresetConfig | null>;
}

// 预设应用选项
export interface PresetApplyOptions {
  presetId: string;
  autoSave?: boolean;           // 是否自动保存当前状态
  showConfirmation?: boolean;   // 是否显示确认对话框
}

// 文件哈希生成选项
export interface FileHashOptions {
  includeValues?: boolean;      // 是否包含值（默认只包含结构）
  depth?: number;              // 哈希计算深度
}