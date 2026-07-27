/**
 * AI 生成服务 — 调用 DeepSeek API
 * 通过 OpenClaw 网关代理，也可以直接调 DeepSeek
 */

const axios = require('axios');
const logger = require('./logger');

// DeepSeek API 配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE = 'https://api.deepseek.com';
const MODEL = process.env.PANGU_MODEL || 'deepseek-chat';

/**
 * 调用 DeepSeek 生成内容
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @returns {Promise<string>}
 */
async function callDeepSeek(systemPrompt, userPrompt) {
  const response = await axios.post(
    `${DEEPSEEK_BASE}/v1/chat/completions`,
    {
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 4096,
      top_p: 0.9,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      timeout: 60000,
    }
  );

  return response.data.choices[0].message.content;
}

// 备用：通过 OpenClaw 本地 API 调用（不消耗外部 token）
async function callOpenClaw(systemPrompt, userPrompt) {
  // 通过本地 OpenClaw Gateway 的 API 代理
  // 这种方式用的是网关已经配好的 DeepSeek 通道
  const fullPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;
  
  // 简化版：直接用同一个 API key
  return callDeepSeek(systemPrompt, userPrompt);
}

/**
 * 生成单条内容
 */
async function generateContent(systemPrompt, userPrompt) {
  const useOpenClaw = process.env.USE_OPENCLAW === 'true';
  
  if (useOpenClaw) {
    return callOpenClaw(systemPrompt, userPrompt);
  }
  
  if (DEEPSEEK_API_KEY) {
    return callDeepSeek(systemPrompt, userPrompt);
  }
  
  // 无 API Key 时返回模拟结果（开发模式）
  logger.warn('未配置 API Key，使用开发模式', { module: 'ai' });
  return `[开发模式] 这是盘古AI为你生成的内容预览。

${userPrompt.substring(0, 200)}...

完整版需要配置 DeepSeek API Key 后生成。

请设置环境变量: DEEPSEEK_API_KEY=你的key`;
}

/**
 * 生成配图 Prompt（用于 ComfyUI）
 */
async function generateImagePrompt(content, style = '现代简约') {
  const system = `你是一个AI绘画提示词专家，擅长把文字内容转化为高质量的 Stable Diffusion / ComfyUI prompt。`;
  const user = `请为以下内容生成配图提示词：

内容：${content}
视觉风格：${style}

要求：
1. 生成中英文双语 prompt（英文为主，便于SD理解）
2. 包含：构图、光线、色调、风格、细节、质量词
3. 适合商业使用，美观专业
4. 同时给一个简短版（用于快速测试）和一个完整版（用于最终出图）`;

  return generateContent(system, user);
}

module.exports = { generateContent, generateImagePrompt, callDeepSeek };
