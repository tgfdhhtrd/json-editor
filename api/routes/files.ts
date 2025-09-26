/**
 * 文件操作API路由
 * 定义所有JSON文件操作的接口端点
 */

import express from 'express';
import multer from 'multer';
import type { Request, Response } from 'express';
import {
  getJsonFiles,
  readJsonFile,
  saveJsonFile,
  importJsonFile,
  exportJsonFile,
  createJsonFile,
  deleteJsonFile
} from '../services/fileService.js';
import type { ApiResponse, SaveFileRequest, ExportRequest } from '../../shared/types.js';

const router = express.Router();

// 配置multer用于文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB限制
  },
  fileFilter: (req, file, cb) => {
    console.log('File upload attempt:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    // 只允许JSON文件，放宽限制以便调试
    if (file.mimetype === 'application/json' || 
        file.originalname.endsWith('.json') ||
        file.mimetype === 'text/plain' ||
        file.mimetype === 'application/octet-stream') {
      cb(null, true);
    } else {
      console.error('File type rejected:', file.mimetype, file.originalname);
      cb(new Error(`Only JSON files are allowed. Received: ${file.mimetype}`));
    }
  }
});

/**
 * GET /api/files
 * 获取所有JSON文件列表
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const files = await getJsonFiles();
    const response: ApiResponse = {
      success: true,
      data: files
    };
    res.json(response);
  } catch (error) {
    console.error('Error getting files:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    res.status(500).json(response);
  }
});





/**
 * POST /api/files/import
 * 导入JSON文件
 */
router.post('/import', upload.single('file'), async (req: Request, res: Response) => {
  console.log('Import request received:', {
    hasFile: !!req.file,
    body: req.body,
    headers: req.headers['content-type']
  });
  
  try {
    if (!req.file) {
      console.error('No file in request');
      const response: ApiResponse = {
        success: false,
        error: 'No file uploaded'
      };
      return res.status(400).json(response);
    }
    
    console.log('Processing file:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      bufferLength: req.file.buffer.length
    });
    
    const content = await importJsonFile(req.file.buffer, req.file.originalname);
    console.log('File imported successfully:', req.file.originalname);
    
    // 将解析后的内容保存到磁盘
    await saveJsonFile(req.file.originalname, { content });
    console.log('File saved to disk:', req.file.originalname);
    
    const response: ApiResponse = {
      success: true,
      data: {
        content,
        filename: req.file.originalname
      }
    };
    res.json(response);
  } catch (error) {
    console.error('Error importing file:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      file: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : 'No file'
    });
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    res.status(400).json(response);
  }
});

/**
 * POST /api/files/export
 * 导出JSON文件
 */
router.post('/export', (req: Request, res: Response) => {
  try {
    const exportRequest: ExportRequest = req.body;
    
    if (!exportRequest.content) {
      const response: ApiResponse = {
        success: false,
        error: 'Content is required'
      };
      return res.status(400).json(response);
    }
    
    const jsonString = exportJsonFile(exportRequest);
    const filename = exportRequest.filename || 'export.json';
    
    // 设置响应头以触发文件下载
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(jsonString);
  } catch (error) {
    console.error('Error exporting file:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/files/validate
 * 验证JSON格式
 */
router.post('/validate', (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    
    if (typeof content === 'string') {
      // 如果是字符串，尝试解析
      JSON.parse(content);
    }
    
    const response: ApiResponse = {
      success: true,
      message: 'Valid JSON format'
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Invalid JSON format',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
    res.status(400).json(response);
  }
});

/**
 * GET /api/files/:filename
 * 读取指定JSON文件内容
 */
router.get('/:filename', async (req: Request, res: Response) => {
  try {
    const filename = decodeURIComponent(req.params.filename);
    const result = await readJsonFile(filename);
    const response: ApiResponse = {
      success: true,
      data: result
    };
    res.json(response);
  } catch (error) {
    console.error('读取文件失败:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : '读取文件失败'
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/files/:filename
 * 保存JSON文件内容
 */
router.post('/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const saveRequest: SaveFileRequest = req.body;
    
    if (!saveRequest.content) {
      const response: ApiResponse = {
        success: false,
        error: 'Content is required'
      };
      return res.status(400).json(response);
    }
    
    await saveJsonFile(filename, saveRequest);
    const response: ApiResponse = {
      success: true,
      message: 'File saved successfully'
    };
    res.json(response);
  } catch (error) {
    console.error('Error saving file:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    res.status(500).json(response);
  }
});

/**
 * PUT /api/files/:filename
 * 创建新的JSON文件
 */
router.put('/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const { content = {} } = req.body;
    
    await createJsonFile(filename, content);
    const response: ApiResponse = {
      success: true,
      message: 'File created successfully'
    };
    res.json(response);
  } catch (error) {
    console.error('Error creating file:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    res.status(500).json(response);
  }
});

/**
 * DELETE /api/files/:filename
 * 删除JSON文件
 */
router.delete('/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    await deleteJsonFile(filename);
    const response: ApiResponse = {
      success: true,
      message: 'File deleted successfully'
    };
    res.json(response);
  } catch (error) {
    console.error('Error deleting file:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    res.status(500).json(response);
  }
});

export default router;