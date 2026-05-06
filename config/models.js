module.exports = {
  providers: {
    deepseek: {
      name: 'DeepSeek',
      baseUrl: 'https://api.deepseek.com',
      chatEndpoint: '/chat/completions',
      apiKeyEnv: 'DEEPSEEK_API_KEY',
      models: [
        { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash', contextWindow: 1048576 },
        { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', contextWindow: 1048576 },
        { id: 'deepseek-chat', name: 'DeepSeek Chat', contextWindow: 131072 },
        { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', contextWindow: 131072 }
      ],
      format: 'openai'
    },
    openai: {
      name: 'OpenAI',
      baseUrl: 'https://api.openai.com',
      chatEndpoint: '/v1/chat/completions',
      apiKeyEnv: 'OPENAI_API_KEY',
      models: [
        { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000 },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000 },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', contextWindow: 128000 },
        { id: 'gpt-4', name: 'GPT-4', contextWindow: 8192 },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', contextWindow: 16384 }
      ],
      format: 'openai'
    },
    anthropic: {
      name: 'Anthropic',
      baseUrl: 'https://api.anthropic.com',
      chatEndpoint: '/v1/messages',
      apiKeyEnv: 'ANTHROPIC_API_KEY',
      models: [
        { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', contextWindow: 200000 },
        { id: 'claude-3-opus', name: 'Claude 3 Opus', contextWindow: 200000 },
        { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', contextWindow: 200000 },
        { id: 'claude-3-haiku', name: 'Claude 3 Haiku', contextWindow: 200000 }
      ],
      format: 'anthropic'
    },
    azure: {
      name: 'Azure OpenAI',
      baseUrl: 'https://YOUR_RESOURCE_NAME.openai.azure.com',
      chatEndpoint: '/openai/deployments/YOUR_DEPLOYMENT_NAME/chat/completions?api-version=2024-02-15-preview',
      apiKeyEnv: 'AZURE_OPENAI_API_KEY',
      models: [
        { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000 },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', contextWindow: 128000 },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', contextWindow: 16384 }
      ],
      format: 'openai'
    },
    custom: {
      name: 'Custom OpenAI Compatible',
      baseUrl: '',
      chatEndpoint: '/v1/chat/completions',
      apiKeyEnv: 'CUSTOM_API_KEY',
      models: [
        { id: 'custom-model', name: 'Custom Model', contextWindow: 65536 }
      ],
      format: 'openai'
    }
  },

  auditCategories: {
    security: {
      name: 'Security',
      icon: '🔴',
      rules: [
        'SQL injection vulnerabilities',
        'XSS vulnerabilities',
        'Command injection',
        'Hardcoded secrets/keys',
        'Insecure deserialization',
        'Authentication bypass',
        'CSRF vulnerabilities',
        'Sensitive data exposure',
        'Access control issues',
        'Insecure cryptography'
      ]
    },
    performance: {
      name: 'Performance',
      icon: '🟡',
      rules: [
        'N+1 database queries',
        'Memory leaks',
        'Unnecessary computations',
        'Blocking operations',
        'Inefficient algorithms',
        'Excessive re-renders',
        'Memory-intensive operations',
        'Network request optimization'
      ]
    },
    bugs: {
      name: 'Potential Bugs',
      icon: '🟠',
      rules: [
        'Null/undefined reference errors',
        'Type mismatches',
        'Off-by-one errors',
        'Incorrect conditionals',
        'Race conditions',
        'Uncaught exceptions',
        'Promise rejection handling',
        'Resource leaks',
        'Incorrect error handling'
      ]
    },
    maintainability: {
      name: 'Maintainability',
      icon: '🟢',
      rules: [
        'Code duplication',
        'Complex conditional logic',
        'Unused variables/imports',
        'Missing documentation',
        'Inconsistent naming',
        'Magic numbers',
        'Long functions',
        'Nested callbacks/promises'
      ]
    },
    bestPractices: {
      name: 'Best Practices',
      icon: '🔵',
      rules: [
        'Proper error handling',
        'Input validation',
        'Type safety',
        'Testing coverage',
        'Security headers',
        'Dependency management',
        'Configuration management'
      ]
    }
  },

  outputFormats: {
    console: {
      colorize: true,
      showEmoji: true
    },
    markdown: {
      includeTimestamp: true,
      includeFileInfo: true
    },
    problemMatcher: {
      format: '{file}:{line}: {severity}: {message}'
    }
  }
};
