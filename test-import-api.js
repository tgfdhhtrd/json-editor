// 测试文件导入API的脚本 (ESM)
import fs from 'fs';


async function testImportAPI() {
  try {
    console.log('🧪 开始测试文件导入API...');
    
    // 读取测试文件
    const fileContent = fs.readFileSync('test-import.json');
    
    console.log('📤 发送导入请求...');

    // 使用 Node 18 内置 fetch/FormData/Blob
    const blob = new Blob([fileContent], { type: 'application/json' });
    const nativeForm = new FormData();
    nativeForm.append('file', blob, 'test-import.json');

    const response = await fetch('http://localhost:3001/api/files/import', {
      method: 'POST',
      body: nativeForm
    });

    console.log('📥 响应状态:', response.status, response.statusText);

    const result = await response.json().catch(() => null);
    if (!response.ok) {
      console.error('❌ 导入失败，错误响应:', result);
      throw new Error(result?.error || `HTTP ${response.status}`);
    }

    console.log('📋 响应内容:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('✅ 文件导入成功!');

      // 验证文件列表是否更新
      console.log('🔍 检查文件列表...');
      const listResponse = await fetch('http://localhost:3001/api/files');
      const listResult = await listResponse.json();
      console.log('📋 当前文件列表:', JSON.stringify(listResult, null, 2));
    } else {
      console.log('❌ 文件导入失败:', result.error);
    }
    
  } catch (error) {
    console.error('💥 测试过程中出错:', error.message);
  }
}

testImportAPI();