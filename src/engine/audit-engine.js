const fs = require('fs');
const path = require('path');
const { auditCategories } = require('../../config/models');

class AuditEngine {
  constructor(provider) {
    this.provider = provider;
  }

  async auditFile(filePath, options = {}) {
    const { categories = ['security', 'bugs', 'performance'] } = options;
    
    const fileContent = await this.readFile(filePath);
    const fileExt = path.extname(filePath).toLowerCase();
    
    const prompt = this.buildPrompt(fileContent, filePath, categories);
    
    const result = await this.provider.chat([
      { role: 'system', content: this.buildSystemPrompt(categories) },
      { role: 'user', content: prompt }
    ], {
      maxTokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.1
    });
    
    return this.parseResult(result.content, filePath, fileContent);
  }

  buildSystemPrompt(categories) {
    const selectedCategories = categories.map(cat => auditCategories[cat]).filter(Boolean);
    
    let prompt = `你是一位专业的代码审计专家，精通多种编程语言和框架。

你的任务是对用户提供的代码进行全面审计，发现潜在问题并给出修复建议。

审查范围包括：
${selectedCategories.map(cat => `- ${cat.icon} ${cat.name}: ${cat.rules.join(', ')}`).join('\n')}

输出格式要求（必须严格遵守）：
\`\`\`audit
<问题类型>:<严重程度>:<行号>:<问题描述>:<修复建议>
\`\`\`

问题类型：security, performance, bug, maintainability, bestpractice
严重程度：critical, high, medium, low
行号：如果能确定具体行号请填写，否则填 0
问题描述：简洁描述问题
修复建议：具体的修复代码或步骤

如果没有发现问题，只输出：
\`\`\`audit
OK:no_issues:0:代码审计通过，未发现问题
\`\`\`

不要输出任何额外内容！`;
    
    return prompt;
  }

  buildPrompt(content, filePath, categories) {
    const fileExt = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);
    
    return `请审计以下代码文件：

文件名: ${fileName}
文件类型: ${fileExt}
审查范围: ${categories.join(', ')}

代码内容：
\`\`\`${fileExt.slice(1)}
${content}
\`\`\`

请按照指定格式输出审计结果。`;
  }

  parseResult(content, filePath, originalCode) {
    const auditMatch = content.match(/```audit([\s\S]*?)```/);
    
    if (!auditMatch) {
      return {
        filePath,
        issues: [],
        rawOutput: content,
        status: 'error',
        message: '无法解析审计结果格式'
      };
    }
    
    const result = {
      filePath,
      issues: [],
      rawOutput: content,
      status: 'success',
      message: ''
    };
    
    const lines = auditMatch[1].trim().split('\n');
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const parts = line.split(':');
      if (parts.length < 4) continue;
      
      const [type, severity, lineStr, ...rest] = parts;
      const description = rest.join(':').trim();
      
      if (type === 'OK' && severity === 'no_issues') {
        result.status = 'passed';
        result.message = description;
        continue;
      }
      
      const lineNum = parseInt(lineStr, 10) || 0;
      
      const issue = {
        type: this.normalizeType(type),
        severity: this.normalizeSeverity(severity),
        line: lineNum,
        description: description,
        suggestion: '',
        code: this.extractCodeSnippet(originalCode, lineNum)
      };
      
      const suggestionMatch = description.match(/修复建议：(.+)/);
      if (suggestionMatch) {
        issue.suggestion = suggestionMatch[1];
        issue.description = description.replace(/修复建议：.+/, '').trim();
      }
      
      result.issues.push(issue);
    }
    
    return result;
  }

  normalizeType(type) {
    const types = {
      'security': 'security',
      'performance': 'performance',
      'bug': 'bug',
      'maintainability': 'maintainability',
      'bestpractice': 'bestpractice',
      'best_practice': 'bestpractice'
    };
    return types[type.toLowerCase()] || 'bug';
  }

  normalizeSeverity(severity) {
    const severities = {
      'critical': 'critical',
      'high': 'high',
      'medium': 'medium',
      'low': 'low'
    };
    return severities[severity.toLowerCase()] || 'medium';
  }

  extractCodeSnippet(code, lineNum, context = 3) {
    if (!lineNum || lineNum <= 0) return '';
    
    const lines = code.split('\n');
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
}

module.exports = AuditEngine;
