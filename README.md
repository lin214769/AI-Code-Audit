# AI Code Audit

AI 代码审计插件，基于 DeepSeek、OpenAI、Anthropic 等大语言模型，自动检测代码中的安全漏洞、性能问题、潜在 Bug 和代码质量问题。

## ✨ 功能特性

- 🔍 **智能代码审计** - 基于 AI 模型深度分析代码问题
- 🔧 **一键修复** - 自动生成修复代码并应用
- 👀 **实时监控** - 文件保存时自动审计
- 📊 **多维度分析** - 安全、性能、Bug、可维护性等多个维度
- 🌐 **多模型支持** - DeepSeek、OpenAI、Anthropic 等
- 📝 **报告生成** - 自动生成 Markdown 审计报告
- 🔗 **VS Code 集成** - 问题面板集成，支持点击跳转

## 🚀 快速开始

### 安装

1. 在 VS Code 扩展市场搜索 "AI Code Audit" 安装
2. 或下载 VSIX 文件手动安装

### 配置

1. 获取 API Key（推荐 DeepSeek，免费额度充足）
2. 在 VS Code 设置中配置：
   - `ai-code-audit.apiProvider`: 选择 AI 提供商
   - `ai-code-audit.apiKey`: 输入你的 API Key
   - `ai-code-audit.model`: 选择模型

### 使用

**命令面板操作：**
- `Ctrl+Shift+A` - 分析当前文件
- `Ctrl+Shift+F` - 修复选中问题

**右键菜单：**
- 在编辑器或资源管理器中右键文件，选择 "Analyze File"

**自动审计：**
- 文件保存时自动触发审计（可在设置中关闭）

## 🔧 支持的 AI 提供商

| 提供商 | 模型 | 推荐 |
|--------|------|------|
| DeepSeek | deepseek-v4-flash | ✅ 推荐（免费额度充足） |
| OpenAI | gpt-4o, gpt-4o-mini | 🔄 需要 API Key |
| Anthropic | claude-3-5-sonnet | 🔄 需要 API Key |
| Custom | 自定义 OpenAI 兼容接口 | 🔧 自定义部署 |

## 📋 审计维度

| 维度 | 说明 | 图标 |
|------|------|------|
| 🔴 Security | 安全漏洞检测 | SQL注入、XSS、硬编码密钥等 |
| 🟡 Performance | 性能问题分析 | 内存泄漏、低效算法等 |
| 🟠 Bugs | 潜在错误识别 | 空指针、类型错误等 |
| 🟢 Maintainability | 可维护性评估 | 代码重复、复杂度等 |
| 🔵 Best Practices | 最佳实践检查 | 代码风格、错误处理等 |

## 📁 项目结构

```
ai-code-audit/
├── src/
│   ├── cli.js               # 命令行入口
│   ├── extension.js         # VS Code 扩展入口
│   ├── providers/
│   │   └── ai-provider.js   # AI 提供商抽象层
│   ├── engine/
│   │   ├── audit-engine.js  # 审计引擎
│   │   └── fix-engine.js    # 修复引擎
│   └── reporter/
│       └── reporter.js      # 报告生成器
├── config/
│   └── models.js            # 模型配置
├── .env.example             # 环境变量示例
├── LICENSE                  # MIT 许可证
├── README.md                # 项目文档
└── package.json             # 扩展配置
```

## 🛠️ CLI 使用

```bash
# 安装依赖
npm install

# 审计单个文件
node src/cli.js audit <file>

# 监听目录
node src/cli.js watch <dir>

# 修复问题
node src/cli.js fix <file> [line]

# 列出可用提供商
node src/cli.js providers

# 列出可用模型
node src/cli.js models
```

## 🔒 安全注意事项

1. **API Key 安全** - 不要将 API Key 提交到版本控制
2. **本地处理** - 代码仅在本地处理，不上传至服务器
3. **权限最小化** - 使用最小权限的 API Key

## 📝 环境变量配置

```env
# 通用 API Key（适用于所有提供商）
API_KEY=your-api-key

# 或按提供商分别设置
DEEPSEEK_API_KEY=your-key
OPENAI_API_KEY=your-key
ANTHROPIC_API_KEY=your-key

# 默认配置
AUDIT_PROVIDER=deepseek
AUDIT_MODEL=deepseek-v4-flash
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

**注意**: 本插件依赖第三方 AI API，请确保遵守相关服务条款。
