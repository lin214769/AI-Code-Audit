#!/usr/bin/env node

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const chokidar = require('chokidar');
const AIProvider = require('./providers/ai-provider');
const AuditEngine = require('./engine/audit-engine');
const FixEngine = require('./engine/fix-engine');
const Reporter = require('./reporter/reporter');

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  switch (command) {
    case 'audit':
    case 'fix':
    case 'watch':
      await handleWithProvider(command, args);
      break;
    case 'providers':
      listProviders();
      break;
    case 'models':
      listModels(getConfig().provider);
      break;
    case 'help':
    case '--help':
    case '-h':
    default:
      showHelp();
  }
}

async function handleWithProvider(command, args) {
  const config = getConfig();
  
  if (!config.apiKey) {
    console.error('❌ 错误: 请设置 API Key');
    console.error('   方法1: 设置环境变量 DEEPSEEK_API_KEY');
    console.error('   方法2: 在 .env 文件中设置');
    console.error('   方法3: 使用 --api-key 参数');
    process.exit(1);
  }
  
  const provider = new AIProvider(config.provider, config.apiKey, config.model);
  const auditEngine = new AuditEngine(provider);
  const fixEngine = new FixEngine(provider);
  const reporter = new Reporter({ format: ['console', 'markdown'] });
  
  switch (command) {
    case 'audit':
      await handleAudit(auditEngine, reporter, args);
      break;
    case 'fix':
      await handleFix(fixEngine, args);
      break;
    case 'watch':
      await handleWatch(auditEngine, reporter, args);
      break;
  }
}

function getConfig() {
  return {
    provider: process.env.AUDIT_PROVIDER || args.find(a => a.startsWith('--provider='))?.split('=')[1] || 'deepseek',
    apiKey: process.env.API_KEY ||
            process.env.DEEPSEEK_API_KEY || 
            process.env.OPENAI_API_KEY || 
            process.env.ANTHROPIC_API_KEY ||
            process.env.CUSTOM_API_KEY ||
            args.find(a => a.startsWith('--api-key='))?.split('=')[1],
    model: process.env.AUDIT_MODEL || args.find(a => a.startsWith('--model='))?.split('=')[1] || 'deepseek-v4-flash',
    maxTokens: parseInt(process.env.AUDIT_MAX_TOKENS || '4096'),
    temperature: parseFloat(process.env.AUDIT_TEMPERATURE || '0.1')
  };
}

async function handleAudit(auditEngine, reporter, args) {
  const filePath = args[1];
  
  if (!filePath) {
    console.error('❌ 请提供要审计的文件路径');
    console.error('   使用: node cli.js audit <file>');
    return;
  }
  
  try {
    const result = await auditEngine.auditFile(filePath, {
      categories: ['security', 'bugs', 'performance', 'maintainability']
    });
    
    await reporter.report(result);
    
    if (result.issues.length > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`❌ 审计失败: ${error.message}`);
    process.exit(1);
  }
}

async function handleFix(fixEngine, args) {
  const filePath = args[1];
  const lineNumber = parseInt(args[2], 10);
  
  if (!filePath) {
    console.error('❌ 请提供文件路径');
    console.error('   使用: node cli.js fix <file> [line]');
    return;
  }
  
  try {
    const issue = {
      line: lineNumber || 0,
      type: 'bug',
      severity: 'medium',
      description: '自动修复',
      code: ''
    };
    
    const result = await fixEngine.applyFix(filePath, issue);
    
    if (result.success) {
      console.log('✅ 修复成功');
      if (result.fixedCode) {
        console.log('修复后的代码:');
        console.log('```');
        console.log(result.fixedCode.substring(0, 500));
        console.log('```');
      }
    } else {
      console.error(`❌ 修复失败: ${result.message}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ 修复失败: ${error.message}`);
    process.exit(1);
  }
}

async function handleWatch(auditEngine, reporter, args) {
  const watchDir = args[1] || './src';
  
  console.log(`👀 监听目录: ${watchDir}`);
  console.log('按 Ctrl+C 停止');
  
  const watcher = chokidar.watch(watchDir, {
    ignored: /node_modules|\.git|dist|build/,
    persistent: true,
    ignoreInitial: true
  });
  
  watcher.on('change', async (filePath) => {
    if (!filePath.match(/\.(js|ts|jsx|tsx|py)$/)) return;
    
    try {
      const result = await auditEngine.auditFile(filePath);
      await reporter.report(result);
    } catch (error) {
      console.error(`❌ 审计失败: ${error.message}`);
    }
  });
  
  process.on('SIGINT', () => {
    console.log('\n🛑 停止监听');
    watcher.close();
    process.exit(0);
  });
}

function listProviders() {
  const providers = AIProvider.getProviders();
  
  console.log();
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║              Code Audit - 可用的 AI 提供商                ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log();
  
  for (const provider of providers) {
    const modelCount = provider.models?.length || 0;
    console.log(`  📦 ${provider.id}`);
    console.log(`     名称: ${provider.name}`);
    console.log(`     Base URL: ${provider.baseUrl}`);
    console.log(`     环境变量: ${provider.apiKeyEnv}`);
    console.log(`     模型数量: ${modelCount}`);
    console.log();
  }
  
  console.log('使用 --provider=<name> 指定提供商');
  console.log('示例: node cli.js audit test/app.js --provider=openai --model=gpt-4o');
  console.log();
}

function listModels(providerId) {
  const models = AIProvider.getModels(providerId);
  
  console.log();
  console.log(`╔══════════════════════════════════════════════════════════╗`);
  console.log(`║              ${providerId} 可用模型                        ║`);
  console.log(`╚══════════════════════════════════════════════════════════╝`);
  console.log();
  
  if (models.length === 0) {
    console.error(`❌ 未找到提供商 "${providerId}" 的模型列表`);
    console.log();
    return;
  }
  
  for (const model of models) {
    const contextSize = model.contextWindow >= 1000000 
      ? `${(model.contextWindow / 1000000).toFixed(1)}M` 
      : `${(model.contextWindow / 1000).toFixed(0)}K`;
    console.log(`  🤖 ${model.id}`);
    console.log(`     名称: ${model.name}`);
    console.log(`     上下文窗口: ${contextSize}`);
    console.log();
  }
}

function showHelp() {
  console.log();
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                  Code Audit CLI                         ║');
  console.log('║            AI 代码审计和修复工具                        ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log();
  console.log('用法:');
  console.log('  node cli.js <command> [options]');
  console.log();
  console.log('命令:');
  console.log('  audit    <file>          审计单个文件');
  console.log('  fix      <file> [line]   修复指定文件的问题');
  console.log('  watch    [dir]           监听目录，自动审计');
  console.log('  providers               列出可用的 AI 提供商');
  console.log('  models                  列出当前提供商的可用模型');
  console.log();
  console.log('选项:');
  console.log('  --provider=<name>        指定 AI 提供商');
  console.log('  --model=<name>          指定模型名称');
  console.log('  --api-key=<key>         指定 API Key');
  console.log();
  console.log('支持的提供商:');
  console.log('  deepseek   - DeepSeek V4 (默认)');
  console.log('  openai     - OpenAI GPT 系列');
  console.log('  anthropic - Anthropic Claude 系列');
  console.log('  azure     - Azure OpenAI');
  console.log('  custom    - 自定义 OpenAI 兼容接口');
  console.log();
  console.log('示例:');
  console.log('  node cli.js providers');
  console.log('  node cli.js models');
  console.log('  node cli.js audit test/vulnerable-api.js');
  console.log('  node cli.js audit test/app.js --provider=openai --model=gpt-4o');
  console.log('  node cli.js watch src');
  console.log();
  console.log('环境变量:');
  console.log('  DEEPSEEK_API_KEY     DeepSeek API Key');
  console.log('  OPENAI_API_KEY       OpenAI API Key');
  console.log('  ANTHROPIC_API_KEY    Anthropic API Key');
  console.log('  AUDIT_PROVIDER       默认提供商');
  console.log('  AUDIT_MODEL          默认模型');
  console.log();
}

main().catch(error => {
  console.error(`❌ 错误: ${error.message}`);
  process.exit(1);
});
