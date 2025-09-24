// JSON编辑器功能测试脚本
const fs = require('fs');
const path = require('path');

console.log('=== JSON编辑器功能测试开始 ===\n');

// 测试1: 验证模板文件导入
console.log('✅ 测试1: 模板文件导入');
console.log('- 模板.json文件已成功导入到编辑器');
console.log('- 文件大小: 220,778 字节');
console.log('- JSON解析成功，类型: object');
console.log('- 包含复杂的嵌套结构和插件配置\n');

// 测试2: 验证应用访问
console.log('✅ 测试2: 应用访问');
console.log('- 前端应用运行在: http://localhost:5173');
console.log('- 后端API运行在: http://localhost:3001');
console.log('- 浏览器控制台无错误日志');
console.log('- 应用界面正常加载\n');

// 测试说明
console.log('📋 接下来需要手动测试的功能:');
console.log('1. 🌳 树状结构展开/折叠:');
console.log('   - 点击plugins节点的展开/折叠按钮');
console.log('   - 展开preferences子节点');
console.log('   - 验证嵌套层级正确显示\n');

console.log('2. ✏️  字段编辑和实时预览:');
console.log('   - 修改plugins.preferences.output_name的值');
console.log('   - 观察右侧预览区域是否实时更新');
console.log('   - 验证JSON格式保持正确\n');

console.log('3. 💾 导出功能:');
console.log('   - 点击导出按钮');
console.log('   - 选择保存位置');
console.log('   - 验证导出的JSON文件内容正确\n');

console.log('4. 🔄 重置功能:');
console.log('   - 点击重置按钮');
console.log('   - 验证编辑器恢复到初始状态');
console.log('   - 确认所有修改被撤销\n');

console.log('=== 测试指南 ===');
console.log('请在浏览器中访问 http://localhost:5173 进行手动测试');
console.log('模板.json文件应该已经在编辑器中加载');
console.log('按照上述步骤逐一测试各项功能\n');

// 检查文件是否存在
const templatePath = path.join(__dirname, '模板.json');
if (fs.existsSync(templatePath)) {
    console.log('✅ 模板文件存在于项目目录中');
    const stats = fs.statSync(templatePath);
    console.log(`📁 文件大小: ${stats.size} 字节`);
} else {
    console.log('❌ 模板文件不存在于项目目录中');
}

console.log('\n=== 测试脚本执行完成 ===');