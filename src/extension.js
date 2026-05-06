const vscode = require('vscode');
const AIProvider = require('./providers/ai-provider');
const AuditEngine = require('./engine/audit-engine');
const FixEngine = require('./engine/fix-engine');
const Reporter = require('./reporter/reporter');

let auditEngine = null;
let fixEngine = null;

function activate(context) {
  console.log('Code Audit Extension Activated');
  
  initializeEngines();
  
  let disposable = vscode.commands.registerCommand('ai-code-audit.analyzeFile', async () => {
    await analyzeCurrentFile();
  });
  
  let disposable2 = vscode.commands.registerCommand('ai-code-audit.fixIssue', async () => {
    await fixSelectedIssue();
  });
  
  let disposable3 = vscode.commands.registerCommand('ai-code-audit.analyzeWorkspace', async () => {
    await analyzeWorkspace();
  });
  
  let disposable4 = vscode.commands.registerCommand('ai-code-audit.openReport', async () => {
    await openReport();
  });
  
  context.subscriptions.push(disposable);
  context.subscriptions.push(disposable2);
  context.subscriptions.push(disposable3);
  context.subscriptions.push(disposable4);
  

  const config = vscode.workspace.getConfiguration('ai-code-audit');
  if (config.get('auditOnSave')) {
    vscode.workspace.onDidSaveTextDocument(async (document) => {
      if (isSupportedFile(document)) {
        await analyzeDocument(document);
      }
    });
  }
  
  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration('ai-code-audit')) {
      initializeEngines();
    }
  });
}

function initializeEngines() {
  const config = vscode.workspace.getConfiguration('ai-code-audit');
  const providerId = config.get('apiProvider');
  const apiKey = config.get('apiKey') || process.env[getEnvVarName(providerId)];
  const model = config.get('model');
  
  if (!apiKey) {
    vscode.window.showWarningMessage('请在设置中配置 API Key');
    return;
  }
  
  try {
    const provider = new AIProvider(providerId, apiKey, model);
    auditEngine = new AuditEngine(provider);
    fixEngine = new FixEngine(provider);
    console.log('Engines initialized');
  } catch (error) {
    vscode.window.showErrorMessage(`初始化失败: ${error.message}`);
  }
}

function getEnvVarName(providerId) {
  const envMap = {
    deepseek: 'DEEPSEEK_API_KEY',
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY'
  };
  return envMap[providerId] || 'API_KEY';
}

function isSupportedFile(document) {
  const supportedExts = ['.js', '.ts', '.jsx', '.tsx', '.py'];
  const ext = document.fileName.toLowerCase().substring(document.fileName.lastIndexOf('.'));
  return supportedExts.includes(ext);
}

async function analyzeCurrentFile() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('请打开一个文件');
    return;
  }
  
  await analyzeDocument(editor.document);
}

async function analyzeDocument(document) {
  if (!auditEngine) {
    vscode.window.showErrorMessage('审计引擎未初始化，请检查 API Key 配置');
    return;
  }
  
  try {
    const result = await auditEngine.auditFile(document.fileName, {
      categories: ['security', 'bugs', 'performance', 'maintainability']
    });
    
    const reporter = new Reporter();
    await reporter.report(result);
    
    if (result.issues.length > 0) {
      displayIssues(result);
      vscode.window.showWarningMessage(`发现 ${result.issues.length} 个问题`);
    } else {
      vscode.window.showInformationMessage('代码审计通过，未发现问题');
    }
  } catch (error) {
    vscode.window.showErrorMessage(`审计失败: ${error.message}`);
  }
}

function displayIssues(result) {
  const diagnostics = [];
  const severityMap = {
    critical: vscode.DiagnosticSeverity.Error,
    high: vscode.DiagnosticSeverity.Error,
    medium: vscode.DiagnosticSeverity.Warning,
    low: vscode.DiagnosticSeverity.Information
  };
  
  for (const issue of result.issues) {
    const range = new vscode.Range(
      new vscode.Position(issue.line - 1, 0),
      new vscode.Position(issue.line - 1, 100)
    );
    
    const diagnostic = new vscode.Diagnostic(
      range,
      `${issue.description}\n${issue.suggestion || ''}`,
      severityMap[issue.severity]
    );
    
    diagnostic.code = issue.type;
    diagnostics.push(diagnostic);
  }
  
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('ai-code-audit');
  diagnosticCollection.set(vscode.Uri.file(result.filePath), diagnostics);
}

async function fixSelectedIssue() {
  if (!fixEngine) {
    vscode.window.showErrorMessage('修复引擎未初始化');
    return;
  }
  
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('请打开一个文件');
    return;
  }
  
  const document = editor.document;
  const selection = editor.selection;
  const lineNumber = selection.active.line + 1;
  
  const result = await auditEngine.auditFile(document.fileName);
  const issue = result.issues.find(i => i.line === lineNumber);
  
  if (!issue) {
    vscode.window.showErrorMessage('在此行未找到问题');
    return;
  }
  
  const confirm = await vscode.window.showWarningMessage(
    `确定要修复此问题吗？\n${issue.description}`,
    { modal: true },
    '确定',
    '取消'
  );
  
  if (confirm !== '确定') return;
  
  try {
    const fixResult = await fixEngine.applyFix(document.fileName, issue);
    
    if (fixResult.success) {
      vscode.window.showInformationMessage('修复已应用');
      await vscode.commands.executeCommand('workbench.action.files.refreshExplorer');
    } else {
      vscode.window.showErrorMessage(`修复失败: ${fixResult.message}`);
    }
  } catch (error) {
    vscode.window.showErrorMessage(`修复失败: ${error.message}`);
  }
}

async function analyzeWorkspace() {
  if (!auditEngine) {
    vscode.window.showErrorMessage('审计引擎未初始化');
    return;
  }
  
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage('请打开一个工作区');
    return;
  }
  
  const reporter = new Reporter();
  let totalIssues = 0;
  
  for (const folder of workspaceFolders) {
    const files = await vscode.workspace.findFiles(
      new vscode.RelativePattern(folder, '**/*.{js,ts,jsx,tsx,py}'),
      '**/node_modules/**'
    );
    
    for (const file of files) {
      try {
        const result = await auditEngine.auditFile(file.fsPath);
        await reporter.report(result);
        totalIssues += result.issues.length;
      } catch (error) {
        console.error(`审计失败 ${file.fsPath}: ${error.message}`);
      }
    }
  }
  
  vscode.window.showInformationMessage(`工作区审计完成，共发现 ${totalIssues} 个问题`);
}

async function openReport() {
  const reportsDir = './reports';
  const files = await vscode.workspace.findFiles('**/audit-report-*.md');
  
  if (files.length === 0) {
    vscode.window.showErrorMessage('未找到审计报告');
    return;
  }
  
  const latest = files.sort((a, b) => b.fsPath.localeCompare(a.fsPath))[0];
  const doc = await vscode.workspace.openTextDocument(latest);
  await vscode.window.showTextDocument(doc);
}

function deactivate() {
  console.log('Code Audit Extension Deactivated');
}

module.exports = {
  activate,
  deactivate
};
