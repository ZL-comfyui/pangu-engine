/**
 * ComfyUI 配图引擎集成
 * 基于本地 ComfyUI v0.20.1 + SD1.5
 * 
 * 调用方式：curl + subprocess（已验证，Python urllib 会卡死）
 */

const { exec } = require('child_process');
const path = require('path');

const COMFYUI_URL = process.env.COMFYUI_URL || 'http://127.0.0.1:8188';
const OUTPUT_DIR = process.env.COMFYUI_OUTPUT || path.join(__dirname, '..', '..', 'data', 'images');

/**
 * 调用 ComfyUI 生成图片
 * @param {Object} params
 * @param {string} params.positive - 正向提示词
 * @param {string} params.negative - 反向提示词
 * @param {number} params.width - 宽度（默认512）
 * @param {number} params.height - 高度（默认512）
 * @param {number} params.steps - 步数（默认20）
 * @param {number} params.cfg - CFG scale（默认7）
 * @param {string} params.seed - 随机种子
 * @returns {Promise<{imageUrl: string, seed: string}>}
 */
async function generateImage(params = {}) {
  const {
    positive,
    negative = 'lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry',
    width = 512,
    height = 512,
    steps = 20,
    cfg = 7,
    seed = Math.floor(Math.random() * 999999999999999).toString(),
  } = params;

  if (!positive) throw new Error('正向提示词不能为空');

  // ComfyUI workflow JSON（文生图最小工作流）
  const workflow = buildWorkflow({
    positive,
    negative,
    width,
    height,
    steps,
    cfg,
    seed,
  });

  const workflowJson = JSON.stringify(workflow);
  const tempFile = path.join(OUTPUT_DIR, `workflow_${Date.now()}.json`);

  // 写入临时 workflow 文件
  const fs = require('fs');
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(tempFile, workflowJson);

  return new Promise((resolve, reject) => {
    // 使用 curl 调用（已验证可靠）
    const cmd = `curl -s -X POST "${COMFYUI_URL}/prompt" -d @"${tempFile}"`;
    
    exec(cmd, { timeout: 120000 }, (error, stdout) => {
      // 清理临时文件
      try { fs.unlinkSync(tempFile); } catch {}

      if (error) {
        console.error('ComfyUI 调用失败:', error.message);
        return reject(new Error('ComfyUI 配图服务不可用，请确认 ComfyUI 已启动'));
      }

      try {
        const result = JSON.parse(stdout);
        if (result.error) return reject(new Error(result.error));

        const promptId = result.prompt_id;
        resolve({
          promptId,
          seed,
          status: 'queued',
          imageUrl: `${COMFYUI_URL}/view?filename=${promptId}_00001_.png`,
        });
      } catch (e) {
        reject(new Error('ComfyUI 返回异常: ' + e.message));
      }
    });
  });
}

/**
 * 查询 ComfyUI 队列状态
 */
async function getQueueStatus() {
  return new Promise((resolve, reject) => {
    exec(`curl -s "${COMFYUI_URL}/queue"`, { timeout: 5000 }, (error, stdout) => {
      if (error) return reject(error);
      try {
        resolve(JSON.parse(stdout));
      } catch {
        resolve({ status: 'unknown' });
      }
    });
  });
}

/**
 * 获取生成历史
 */
async function getHistory(promptId) {
  return new Promise((resolve, reject) => {
    exec(`curl -s "${COMFYUI_URL}/history/${promptId}"`, { timeout: 5000 }, (error, stdout) => {
      if (error) return reject(error);
      try {
        resolve(JSON.parse(stdout));
      } catch {
        resolve(null);
      }
    });
  });
}

/**
 * 构建 ComfyUI 文生图工作流
 */
function buildWorkflow({ positive, negative, width, height, steps, cfg, seed }) {
  return {
    "3": {
      "inputs": { "seed": parseInt(seed) % 999999999999999, "steps": steps, "cfg": cfg, "sampler_name": "euler", "scheduler": "normal", "denoise": 1, "model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["5", 0] },
      "class_type": "KSampler"
    },
    "4": {
      "inputs": { "ckpt_name": "v1-5-pruned-emaonly.safetensors" },
      "class_type": "CheckpointLoaderSimple"
    },
    "5": {
      "inputs": { "width": width, "height": height, "batch_size": 1 },
      "class_type": "EmptyLatentImage"
    },
    "6": {
      "inputs": { "text": positive, "clip": ["4", 1] },
      "class_type": "CLIPTextEncode"
    },
    "7": {
      "inputs": { "text": negative, "clip": ["4", 1] },
      "class_type": "CLIPTextEncode"
    },
    "8": {
      "inputs": { "samples": ["3", 0], "vae": ["4", 2] },
      "class_type": "VAEDecode"
    },
    "9": {
      "inputs": { "filename_prefix": "pangu", "images": ["8", 0] },
      "class_type": "SaveImage"
    },
  };
}

/**
 * 快捷生成：从盘古文案生成配图
 */
async function generateFromContent(content, style = 'modern') {
  // 将中文文案转换为 SD prompt（调用 AI 服务）
  const { generateContent } = require('./ai');
  
  const styleMap = {
    modern: '现代简约风格，干净明亮，专业商业摄影',
    warm: '温馨暖色调，自然光，生活化场景',
    luxury: '高端奢华，金色点缀，精致细节',
    fresh: '清新自然，柔光，文艺氛围',
    cool: '科技感，冷色调，赛博朋克',
  };

  const promptSystem = `你是SD提示词专家。将以下内容转为英文Stable Diffusion提示词。格式：主体描述 + 环境 + 光线 + 风格 + 质量词。用逗号分隔。输出纯英文。`;
  const promptUser = `内容：${content}
视觉风格：${styleMap[style] || styleMap.modern}

请生成一个英文SD提示词（不超过200字符），适合商业配图。`;

  const sdPrompt = await generateContent(promptSystem, promptUser);
  
  return generateImage({
    positive: sdPrompt.trim(),
    width: 768,
    height: 768,
    steps: 25,
  });
}

module.exports = { generateImage, generateFromContent, getQueueStatus, getHistory };
