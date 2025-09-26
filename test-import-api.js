// 测试文件导入API的脚本
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

async function testImportAPI() {
  try {
    console.log('🧪 开始测试文件导入API...');
    
    // 读取测试文件
    const fileContent = fs.readFileSync('test-import.json');
    
    // 创建FormData
    const formData = new FormData();
    formData.append('file', fileContent, {
      filename: 'test-import.json',
      contentType: 'application/json'
    });
    
    console.log('📤 发送导入请求...');
    
    // 发送请求
    const response = await axios.post('http://localhost:3001/api/files/import', formData, {
      headers: formData.getHeaders()
    });
    
    console.log('📥 响应状态:', response.status, response.statusText);
    
    const result = response.data;
    console.log('📋 响应内容:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ 文件导入成功!');
      
      // 验证文件列表是否更新
      console.log('🔍 检查文件列表...');
      const listResponse = await axios.get('http://localhost:3001/api/files');
      const listResult = listResponse.data;
      console.log('📋 当前文件列表:', JSON.stringify(listResult, null, 2));
    } else {
      console.log('❌ 文件导入失败:', result.error);
    }
    
  } catch (error) {
    console.error('💥 测试过程中出错:', error.message);
  }
}

testImportAPI();