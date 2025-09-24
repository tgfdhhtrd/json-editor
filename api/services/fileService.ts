/**
 * 文件服务模块
 * 处理JSON文件的读取、保存、导入、导出等操作
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import type { FileInfo, JsonFileResponse, SaveFileRequest, ExportRequest } from '../../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 项目根目录
const PROJECT_ROOT = path.resolve(__dirname, '../..');

/**
 * 获取指定目录下名为"模板.json"的文件
 */
export async function getJsonFiles(dirPath: string = PROJECT_ROOT): Promise<FileInfo[]> {
  try {
    const files: FileInfo[] = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const stats = await fs.stat(fullPath);
      
      // 只处理名为"模板.json"的文件
      if (entry.isFile() && entry.name === '模板.json') {
        files.push({
          name: entry.name,
          path: fullPath,
          size: stats.size,
          lastModified: stats.mtime.toISOString(),
          type: 'file'
        });
      } else if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        // 递归获取子目录中的"模板.json"文件
        const subFiles = await getJsonFiles(fullPath);
        files.push(...subFiles);
      }
    }
    
    return files.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error reading directory:', error);
    throw new Error('Failed to read directory');
  }
}

/**
 * 读取JSON文件内容
 */
export async function readJsonFile(filename: string): Promise<JsonFileResponse> {
  try {
    console.log('开始读取文件:', filename);
    
    // 安全路径处理，防止路径遍历攻击
    const safePath = path.resolve(PROJECT_ROOT, filename);
    console.log('解析后的文件路径:', safePath);
    
    // 确保文件在项目目录内
    if (!safePath.startsWith(PROJECT_ROOT)) {
      throw new Error('Invalid file path');
    }
    
    // 检查文件是否存在
    if (!await fs.pathExists(safePath)) {
      console.error('文件不存在:', safePath);
      throw new Error('File not found');
    }
    
    const stats = await fs.stat(safePath);
    console.log('文件信息:', {
      size: stats.size,
      lastModified: stats.mtime.toISOString()
    });
    
    const content = await fs.readFile(safePath, 'utf-8');
    console.log('文件内容长度:', content.length);
    console.log('文件内容前200字符:', content.substring(0, 200));
    
    // 检查内容是否为空
    if (!content || content.trim().length === 0) {
      console.error('文件内容为空');
      throw new Error('文件内容为空');
    }
    
    // 解析JSON内容
    let jsonContent;
    try {
      console.log('开始解析JSON...');
      
      // 预处理内容，移除可能的BOM标记
      let cleanContent = content;
      if (content.charCodeAt(0) === 0xFEFF) {
        cleanContent = content.slice(1);
        console.log('移除BOM标记');
      }
      
      // 尝试解析JSON
      jsonContent = JSON.parse(cleanContent);
      console.log('JSON解析成功，数据类型:', typeof jsonContent);
      
      if (jsonContent && typeof jsonContent === 'object') {
        const keys = Object.keys(jsonContent);
        console.log('JSON对象键数量:', keys.length);
        if (keys.length > 0) {
          console.log('主要键名:', keys.slice(0, 5));
        }
      }
      
    } catch (parseError) {
      console.error('JSON解析失败:', {
        error: parseError instanceof Error ? parseError.message : 'Unknown parse error',
        contentPreview: content.slice(0, 500),
        contentLength: content.length,
        filename
      });
      
      // 提供更详细的错误信息
      let errorMessage = 'JSON格式错误';
      if (parseError instanceof SyntaxError) {
        errorMessage = `JSON语法错误: ${parseError.message}`;
      }
      throw new Error(errorMessage);
    }
    
    return {
      content: jsonContent,
      metadata: {
        name: path.basename(safePath),
        size: stats.size,
        lastModified: stats.mtime.toISOString(),
        encoding: 'utf-8'
      }
    };
  } catch (error) {
    console.error('读取JSON文件时发生错误:', {
      filename,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * 保存JSON文件
 */
export async function saveJsonFile(filename: string, request: SaveFileRequest): Promise<void> {
  try {
    const safePath = path.resolve(PROJECT_ROOT, filename);
    
    // 确保文件在项目目录内
    if (!safePath.startsWith(PROJECT_ROOT)) {
      throw new Error('Invalid file path');
    }
    
    // 确保目录存在
    await fs.ensureDir(path.dirname(safePath));
    
    // 格式化JSON内容
    let jsonString: string;
    if (request.preserveFormat) {
      // 尝试保持原始格式
      jsonString = JSON.stringify(request.content, null, 2);
    } else {
      // 使用标准格式
      jsonString = JSON.stringify(request.content, null, 2);
    }
    
    // 写入文件
    await fs.writeFile(safePath, jsonString, 'utf-8');
  } catch (error) {
    console.error('Error saving JSON file:', error);
    throw new Error('Failed to save file');
  }
}

/**
 * 处理文件导入
 */
export async function importJsonFile(fileBuffer: Buffer, originalName: string): Promise<any> {
  try {
    console.log('开始处理文件导入:', {
      originalName,
      bufferLength: fileBuffer.length,
      timestamp: new Date().toISOString()
    });
    
    // 检查文件扩展名
    const fileExt = path.extname(originalName).toLowerCase();
    if (fileExt !== '.json') {
      console.warn('文件扩展名不是.json:', fileExt);
    }
    
    // 尝试多种编码方式读取文件
    let content: string;
    try {
      // 首先尝试UTF-8
      content = fileBuffer.toString('utf-8');
      
      // 检查是否有无效字符（可能是编码问题）
      if (content.includes('\uFFFD')) {
        console.log('检测到UTF-8编码问题，尝试其他编码...');
        // 尝试GBK编码（中文系统常见）
        try {
          const iconv = require('iconv-lite');
          if (iconv.encodingExists('gbk')) {
            content = iconv.decode(fileBuffer, 'gbk');
            console.log('使用GBK编码成功读取文件');
          }
        } catch (iconvError) {
          console.log('iconv-lite不可用，继续使用UTF-8');
        }
      }
    } catch (encodingError) {
      console.error('文件编码读取失败:', encodingError);
      throw new Error('文件编码不支持或文件已损坏');
    }
    
    console.log('文件读取成功:', {
      contentLength: content.length,
      contentPreview: content.substring(0, 200),
      contentEnd: content.substring(Math.max(0, content.length - 100))
    });
    
    // 检查内容是否为空
    if (!content || content.trim().length === 0) {
      throw new Error('文件内容为空');
    }
    
    // 预处理内容
    let cleanContent = content.trim();
    
    // 移除BOM标记
    if (cleanContent.charCodeAt(0) === 0xFEFF) {
      cleanContent = cleanContent.slice(1);
      console.log('移除BOM标记');
    }
    
    // 检查文件是否以JSON格式开始和结束
    const firstChar = cleanContent.charAt(0);
    const lastChar = cleanContent.charAt(cleanContent.length - 1);
    
    if (!((firstChar === '{' && lastChar === '}') || (firstChar === '[' && lastChar === ']'))) {
      console.error('文件格式检查失败:', {
        firstChar,
        lastChar,
        contentStart: cleanContent.substring(0, 50)
      });
      throw new Error('文件不是有效的JSON格式（缺少正确的开始或结束标记）');
    }
    
    // 尝试解析JSON
    console.log('开始解析JSON...');
    let jsonContent;
    try {
      // 对于大文件，提供额外的处理信息
      if (cleanContent.length > 100000) {
        console.log('检测到大文件，大小:', cleanContent.length, '字符');
        
        // 检查是否是压缩的JSON（没有换行符和空格）
        const hasFormatting = cleanContent.includes('\n') || cleanContent.includes('\r') || cleanContent.includes('  ');
        if (!hasFormatting) {
          console.log('检测到压缩JSON格式');
        }
        
        // 检查是否有常见的JSON结构
        const hasObjects = cleanContent.includes('":');
        const hasArrays = cleanContent.includes('[');
        console.log('JSON结构分析:', { hasObjects, hasArrays });
      }
      
      // 执行JSON解析
      jsonContent = JSON.parse(cleanContent);
      
      console.log('JSON解析成功:', {
        dataType: typeof jsonContent,
        isArray: Array.isArray(jsonContent),
        timestamp: new Date().toISOString()
      });
      
      // 分析解析后的数据结构
      if (jsonContent && typeof jsonContent === 'object') {
        if (Array.isArray(jsonContent)) {
          console.log('JSON数组长度:', jsonContent.length);
          if (jsonContent.length > 0) {
            console.log('数组第一个元素类型:', typeof jsonContent[0]);
          }
        } else {
          const keys = Object.keys(jsonContent);
          console.log('JSON对象键数量:', keys.length);
          if (keys.length > 0) {
            console.log('主要键名:', keys.slice(0, 10));
          }
        }
      }
      
    } catch (parseError) {
      console.error('JSON解析失败，详细信息:', {
        error: parseError instanceof Error ? parseError.message : 'Unknown parse error',
        errorName: parseError instanceof Error ? parseError.name : 'Unknown',
        contentLength: cleanContent.length,
        contentPreview: cleanContent.slice(0, 500),
        originalName,
        timestamp: new Date().toISOString()
      });
      
      // 尝试提供更有用的错误信息
      let errorMessage = 'JSON格式错误';
      if (parseError instanceof SyntaxError) {
        const message = parseError.message;
        if (message.includes('position')) {
          errorMessage = `JSON语法错误: ${message}`;
        } else if (message.includes('Unexpected token')) {
          errorMessage = `JSON语法错误: 发现意外的字符或符号 - ${message}`;
        } else if (message.includes('Unexpected end')) {
          errorMessage = 'JSON语法错误: 文件意外结束，可能缺少结束标记';
        } else {
          errorMessage = `JSON语法错误: ${message}`;
        }
      }
      
      throw new Error(errorMessage);
    }
    
    console.log('文件导入处理完成:', {
      originalName,
      success: true,
      timestamp: new Date().toISOString()
    });
    
    return jsonContent;
    
  } catch (error) {
    console.error('importJsonFile处理失败:', {
      originalName,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      bufferLength: fileBuffer.length,
      timestamp: new Date().toISOString()
    });
    
    // 根据错误类型提供更好的用户反馈
    if (error instanceof Error) {
      if (error.message.includes('文件内容为空')) {
        throw new Error('文件内容为空，请检查文件是否正确');
      } else if (error.message.includes('JSON')) {
        throw error; // 保持JSON相关的错误信息
      } else if (error.message.includes('编码')) {
        throw new Error('文件编码不支持，请确保文件是UTF-8编码的JSON文件');
      } else {
        throw new Error(`文件处理失败: ${error.message}`);
      }
    } else {
      throw new Error('文件处理过程中发生未知错误');
    }
  }
}

/**
 * 导出JSON文件
 */
export function exportJsonFile(request: ExportRequest): string {
  try {
    let jsonString: string;
    
    switch (request.format) {
      case 'compact':
        jsonString = JSON.stringify(request.content);
        break;
      case 'pretty':
        jsonString = JSON.stringify(request.content, null, 2);
        break;
      case 'original':
      default:
        jsonString = JSON.stringify(request.content, null, 2);
        break;
    }
    
    return jsonString;
  } catch (error) {
    console.error('Error exporting JSON file:', error);
    throw new Error('Failed to export file');
  }
}

/**
 * 创建新的JSON文件
 */
export async function createJsonFile(filename: string, content: any = {}): Promise<void> {
  try {
    const safePath = path.resolve(PROJECT_ROOT, filename);
    
    // 确保文件在项目目录内
    if (!safePath.startsWith(PROJECT_ROOT)) {
      throw new Error('Invalid file path');
    }
    
    // 检查文件是否已存在
    if (await fs.pathExists(safePath)) {
      throw new Error('File already exists');
    }
    
    // 确保目录存在
    await fs.ensureDir(path.dirname(safePath));
    
    // 创建文件
    const jsonString = JSON.stringify(content, null, 2);
    await fs.writeFile(safePath, jsonString, 'utf-8');
  } catch (error) {
    console.error('Error creating JSON file:', error);
    throw error;
  }
}

/**
 * 删除JSON文件
 */
export async function deleteJsonFile(filename: string): Promise<void> {
  try {
    const safePath = path.resolve(PROJECT_ROOT, filename);
    
    // 确保文件在项目目录内
    if (!safePath.startsWith(PROJECT_ROOT)) {
      throw new Error('Invalid file path');
    }
    
    // 检查文件是否存在
    if (!await fs.pathExists(safePath)) {
      throw new Error('File not found');
    }
    
    // 删除文件
    await fs.remove(safePath);
  } catch (error) {
    console.error('Error deleting JSON file:', error);
    throw error;
  }
}

/**
 * 验证JSON格式
 */
export function validateJsonFormat(content: string): { valid: boolean; error?: string } {
  try {
    JSON.parse(content);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid JSON format'
    };
  }
}
