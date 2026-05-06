const fs = require('fs');
const path = require('path');
const prettier = require('prettier');

class FixEngine {
  constructor(provider) {
    this.provider = provider;
  }

  async applyFix(filePath, issue, options = {}) {
    const fileContent = await this.readFile(filePath);
    const fileExt = path.extname(filePath).toLowerCase();
    
    const fixResult = await this.generateFix(fileContent, filePath, issue, options);
    
    if (!fixResult.success || !fixResult.fixedCode) {
      return { success: false, message: fixResult.message || '修复失败' };
    }
    
    if (options.dryRun) {
      return {
        success: true,
        message: '预览模式：修复已生成但未保存',
        fixedCode: fixResult.fixedCode,
        originalCode: fileContent
      };
    }
    
    await this.writeFile(filePath, fixResult.fixedCode);
    
    return {
      success: true,
      message: '修复已应用',
      fixedCode: fixResult.fixedCode,
      originalCode: fileContent
    };
  }

  async applyFixes(filePath, issues, options = {}) {
    let fileContent = await this.readFile(filePath);
    const results = [];
    const appliedFixes = [];
    
    for (const issue of issues) {
      if (!issue.line || issue.line <= 0) {
        results.push({
          issue,
          success: false,
          message: '无法定位修复位置（行号未知）'
        });
        continue;
      }
      
      const fixResult = await this.generateFix(fileContent, filePath, issue, options);
      
      if (fixResult.success && fixResult.fixedCode) {
        fileContent = fixResult.fixedCode;
        appliedFixes.push(issue);
        results.push({
          issue,
          success: true,
          message: '修复已应用'
        });
      } else {
        results.push({
          issue,
          success: false,
          message: fixResult.message || '修复失败'
        });
      }
    }
    
    if (!options.dryRun && appliedFixes.length > 0) {
      await this.writeFile(filePath, fileContent);
    }
    
    return {
      success: appliedFixes.length === issues.length,
      results,
      appliedFixes,
      fixedCode: fileContent
    };
  }

  async generateFix(content, filePath, issue, options = {}) {
    const fileExt = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);
    
    const prompt = `请修复以下代码问题：

文件名: ${fileName}
问题类型: ${issue.type}
严重程度: ${issue.severity}
问题位置: 第 ${issue.line} 行
问题描述: ${issue.description}
当前代码片段:
\`\`\`${fileExt.slice(1)}
${issue.code || this.extractLine(content, issue.line)}
\`\`\`

请提供修复后的完整代码（仅输出代码，不包含任何额外解释）。

输出格式：
\`\`\`${fileExt.slice(1)}
<修复后的代码>
\`\`\``;

    const result = await this.provider.chat([
      { role: 'system', content: this.buildSystemPrompt() },
      { role: 'user', content: prompt }
    ], {
      maxTokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.1
    });

    return this.parseFixResult(result.content, content, issue.line);
  }

  buildSystemPrompt() {
    return `你是一位专业的代码修复专家。请根据用户提供的问题描述和代码片段，提供准确的修复方案。

规则：
1. 只输出修复后的代码，不要添加任何解释或说明
2. 保持代码风格与原代码一致
3. 确保修复后的代码语法正确
4. 如果无法修复，输出：UNFIXABLE
5. 如果需要替换整行，请输出完整的修复代码`;
  }

  parseFixResult(content, originalContent, issueLine) {
    const codeMatch = content.match(/```(\w+)?\n([\s\S]*?)```/);
    
    if (!codeMatch) {
      if (content.trim() === 'UNFIXABLE') {
        return { success: false, message: '无法修复此问题' };
      }
      return { success: false, message: '无法解析修复结果' };
    }
    
    const fixedCode = codeMatch[2].trim();
    
    if (!fixedCode || fixedCode === 'UNFIXABLE') {
      return { success: false, message: '无法修复此问题' };
    }
    
    const fixedContent = this.applyFixToContent(originalContent, fixedCode, issueLine);
    
    return {
      success: true,
      fixedCode: fixedContent,
      message: '修复成功'
    };
  }

  applyFixToContent(content, fixCode, issueLine) {
    const lines = content.split('\n');
    
    if (!issueLine || issueLine <= 0) {
      return content;
    }
    
    const fixLines = fixCode.split('\n');
    const startLine = issueLine - 1;
    const endLine = startLine + fixLines.length;
    
    const newLines = [
      ...lines.slice(0, startLine),
      ...fixLines,
      ...lines.slice(endLine)
    ];
    
    return newLines.join('\n');
  }

  extractLine(content, lineNum, context = 2) {
    const lines = content.split('\n');
    const start = Math.max(0, lineNum - 1 - context);
    const end = Math.min(lines.length, lineNum + context);
    
    return lines.slice(start, end).join('\n');
  }

  async readFile(filePath) {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  async writeFile(filePath, content) {
    try {
      const prettified = await prettier.format(content, {
        parser: this.getParser(path.extname(filePath)),
        semi: true,
        singleQuote: true,
        trailingComma: 'es5'
      });
      
      return new Promise((resolve, reject) => {
        fs.writeFile(filePath, prettified, 'utf8', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch {
      return new Promise((resolve, reject) => {
        fs.writeFile(filePath, content, 'utf8', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }

  getParser(ext) {
    const parsers = {
      '.js': 'babel',
      '.jsx': 'babel',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.json': 'json',
      '.md': 'markdown',
      '.html': 'html'
    };
    return parsers[ext] || 'babel';
  }
}

module.exports = FixEngine;
