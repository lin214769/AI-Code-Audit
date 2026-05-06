const fs = require('fs');
const path = require('path');

class Reporter {
  constructor(options = {}) {
    this.options = {
      outputDir: options.outputDir || './reports',
      format: options.format || ['console', 'markdown'],
      timestamp: new Date()
    };
    
    if (!fs.existsSync(this.options.outputDir)) {
      fs.mkdirSync(this.options.outputDir, { recursive: true });
    }
  }

  report(result) {
    const outputs = [];
    
    if (this.options.format.includes('console')) {
      outputs.push(this.toConsole(result));
    }
    
    if (this.options.format.includes('markdown')) {
      outputs.push(this.toMarkdown(result));
    }
    
    if (this.options.format.includes('json')) {
      outputs.push(this.toJson(result));
    }
    
    return Promise.all(outputs);
  }

  toConsole(result) {
    return new Promise((resolve) => {
      const severityColors = {
        critical: '\x1b[31m',
        high: '\x1b[31m',
        medium: '\x1b[33m',
        low: '\x1b[32m'
      };
      
      const typeIcons = {
        security: '🔴',
        performance: '🟡',
        bug: '🟠',
        maintainability: '🟢',
        bestpractice: '🔵'
      };
      
      console.log('\n' + '═'.repeat(70));
      console.log(`📄 文件: ${result.filePath}`);
      console.log(`⏰ 时间: ${this.formatTime(result.timestamp || this.options.timestamp)}`);
      console.log('━'.repeat(70));
      
      if (result.status === 'passed') {
        console.log(`✅ ${result.message}`);
      } else if (result.status === 'error') {
        console.log(`❌ ${result.message}`);
      } else {
        for (const issue of result.issues) {
          const color = severityColors[issue.severity] || '\x1b[37m';
          const icon = typeIcons[issue.type] || '⚪';
          
          console.log(`${icon} ${color}[${issue.severity.toUpperCase()}]${'\x1b[0m'} 行${issue.line}: ${issue.description}`);
          
          if (issue.suggestion) {
            console.log(`   💡 ${issue.suggestion}`);
          }
          
          if (issue.code) {
            console.log(`   代码片段:`);
            console.log(`   \`\`\``);
            issue.code.split('\n').forEach(line => console.log(`   ${line}`));
            console.log(`   \`\`\``);
          }
        }
      }
      
      console.log('═'.repeat(70) + '\n');
      resolve();
    });
  }

  async toMarkdown(result) {
    const reportPath = path.join(
      this.options.outputDir,
      `audit-report-${this.getTimestampString()}.md`
    );
    
    const content = this.buildMarkdown(result);
    
    return new Promise((resolve, reject) => {
      fs.appendFile(reportPath, content, 'utf8', (err) => {
        if (err) reject(err);
        else resolve(reportPath);
      });
    });
  }

  buildMarkdown(result) {
    const severityLabels = {
      critical: '🔴 严重',
      high: '🔴 高危',
      medium: '🟡 中等',
      low: '🟢 低危'
    };
    
    const typeLabels = {
      security: '安全',
      performance: '性能',
      bug: 'Bug',
      maintainability: '可维护性',
      bestpractice: '最佳实践'
    };
    
    let content = `\n## ${this.formatTime(result.timestamp || this.options.timestamp)} - ${result.filePath}\n\n`;
    
    if (result.status === 'passed') {
      content += `✅ **代码审计通过**\n\n${result.message}\n\n`;
      return content;
    }
    
    content += `### 审计结果\n\n`;
    content += `| 类型 | 严重程度 | 行号 | 问题描述 |\n`;
    content += `|------|----------|------|----------|\n`;
    
    for (const issue of result.issues) {
      content += `| ${typeLabels[issue.type]} | ${severityLabels[issue.severity]} | ${issue.line} | ${issue.description} |\n`;
    }
    
    content += `\n### 详细信息\n\n`;
    
    for (const issue of result.issues) {
      content += `#### ${severityLabels[issue.severity]} - 行 ${issue.line}\n\n`;
      content += `**问题**: ${issue.description}\n\n`;
      
      if (issue.suggestion) {
        content += `**修复建议**: ${issue.suggestion}\n\n`;
      }
      
      if (issue.code) {
        content += `**代码片段**:\n\n\`\`\`\n${issue.code}\n\`\`\`\n\n`;
      }
    }
    
    return content;
  }

  async toJson(result) {
    const reportPath = path.join(
      this.options.outputDir,
      `audit-report-${this.getTimestampString()}.json`
    );
    
    const content = JSON.stringify(result, null, 2);
    
    return new Promise((resolve, reject) => {
      fs.appendFile(reportPath, content + ',\n', 'utf8', (err) => {
        if (err) reject(err);
        else resolve(reportPath);
      });
    });
  }

  formatTime(date) {
    return date.toISOString().replace('T', ' ').substring(0, 19);
  }

  getTimestampString() {
    return this.options.timestamp.toISOString().replace(/[:.]/g, '-').substring(0, 19);
  }

  generateProblemMatcher(result) {
    const output = [];
    
    for (const issue of result.issues) {
      const severity = issue.severity === 'critical' || issue.severity === 'high' 
        ? 'error' 
        : issue.severity === 'medium' 
          ? 'warning' 
          : 'info';
      
      output.push(`${result.filePath}:${issue.line}: ${severity}: ${issue.description}`);
    }
    
    return output.join('\n');
  }
}

module.exports = Reporter;
