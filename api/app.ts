/**
 * This is a API server
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Request, Response, NextFunction } from 'express';
import filesRouter from './routes/files.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 中间件配置
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Multer错误处理中间件
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof Error && error.message.includes('Only JSON files are allowed')) {
    console.error('Multer file filter error:', error.message);
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
  if (error.code === 'LIMIT_FILE_SIZE') {
    console.error('File size limit exceeded:', error);
    return res.status(400).json({
      success: false,
      error: 'File size too large. Maximum size is 10MB.'
    });
  }
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    console.error('Unexpected file field:', error);
    return res.status(400).json({
      success: false,
      error: 'Unexpected file field. Expected field name: file'
    });
  }
  next(error);
});

// 静态文件服务（用于前端构建文件）
app.use(express.static(path.join(__dirname, '../dist')));

// API路由
app.use('/api/files', filesRouter);

// 健康检查接口
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA路由处理 - 所有非API请求都返回index.html
app.get('*', (req: Request, res: Response) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  });
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
