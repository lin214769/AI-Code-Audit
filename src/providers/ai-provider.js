const axios = require('axios');
const { providers } = require('../../config/models');

class AIProvider {
  constructor(providerId, apiKey, modelId) {
    this.provider = providers[providerId];
    this.apiKey = apiKey;
    this.modelId = modelId;
    
    if (!this.provider) {
      throw new Error(`Unknown provider: ${providerId}`);
    }
    
    const baseUrl = this.provider.baseUrl || process.env.CUSTOM_BASE_URL || '';
    
    if (!baseUrl && providerId !== 'custom') {
      throw new Error(`Provider ${providerId} requires a base URL`);
    }
    
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });
  }

  async chat(messages, options = {}) {
    const { maxTokens = 4096, temperature = 0.1 } = options;
    
    const payload = this.buildPayload(messages, maxTokens, temperature);
    
    try {
      const response = await this.client.post(
        this.provider.chatEndpoint,
        payload
      );
      
      return this.parseResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  buildPayload(messages, maxTokens, temperature) {
    const format = this.provider.format || 'openai';
    
    if (format === 'anthropic') {
      return {
        model: this.modelId,
        messages: messages.map(m => ({
          role: m.role === 'system' ? 'user' : m.role,
          content: m.content
        })),
        max_tokens: maxTokens,
        temperature: temperature
      };
    }
    
    return {
      model: this.modelId,
      messages: messages,
      max_tokens: maxTokens,
      temperature: temperature
    };
  }

  parseResponse(response) {
    const format = this.provider.format || 'openai';
    
    if (format === 'anthropic') {
      return {
        content: response.data.content[0]?.text || '',
        usage: {
          prompt_tokens: response.data.usage?.input_tokens || 0,
          completion_tokens: response.data.usage?.output_tokens || 0
        }
      };
    }
    
    return {
      content: response.data.choices?.[0]?.message?.content || '',
      usage: {
        prompt_tokens: response.data.usage?.prompt_tokens || 0,
        completion_tokens: response.data.usage?.completion_tokens || 0
      }
    };
  }

  handleError(error) {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error?.message || 
                     error.response.data?.message || 
                     error.message;
      
      let errorMsg = `API Error ${status}: ${message}`;
      
      if (status === 401) {
        errorMsg += '\n💡 请检查您的 API Key 是否正确';
      } else if (status === 402) {
        errorMsg += '\n💡 余额不足，请充值或更换 API Key';
      } else if (status === 429) {
        errorMsg += '\n💡 请求过于频繁，请稍后重试';
      } else if (status === 404) {
        errorMsg += '\n💡 API 端点不存在，请检查配置的 baseUrl';
      }
      
      return new Error(errorMsg);
    }
    
    return new Error(`网络错误: ${error.message}`);
  }

  static getProviders() {
    return Object.keys(providers).map(id => ({
      id,
      ...providers[id]
    }));
  }

  static getModels(providerId) {
    return providers[providerId]?.models || [];
  }
}

module.exports = AIProvider;
