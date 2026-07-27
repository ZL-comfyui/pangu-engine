/**
 * 盘古AI内容引擎 — 环境变量持久化服务
 *
 * 功能：
 * 1. 读写 .env 文件（保留注释和格式）
 * 2. 白标版配置管理
 * 3. 管理后台配置的持久化同步
 */

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const ENV_PATH = path.join(__dirname, '..', '..', '.env');

/**
 * 解析 .env 文件为键值对数组（保留顺序和注释）
 * @returns {Array<{type: 'comment'|'empty'|'key', key?: string, value?: string, raw: string}>}
 */
function parseEnvFile(filePath = ENV_PATH) {
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  const result = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      result.push({ type: 'empty', raw: line });
    } else if (trimmed.startsWith('#') || trimmed.startsWith(';')) {
      result.push({ type: 'comment', raw: line });
    } else {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.substring(0, eqIdx).trim();
        let value = trimmed.substring(eqIdx + 1).trim();
        // 去除引号
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        result.push({ type: 'key', key, value, raw: `${key}=${value}` });
      } else {
        result.push({ type: 'comment', raw: line });
      }
    }
  }

  return result;
}

/**
 * 将解析结果写回 .env 文件
 */
function writeEnvFile(parsed, filePath = ENV_PATH) {
  const lines = parsed.map(item => {
    if (item.type === 'key') {
      return `${item.key}=${item.value}`;
    }
    return item.raw;
  });
  const content = lines.join('\n') + '\n';
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * 读取单个环境变量
 */
function get(key, filePath = ENV_PATH) {
  const parsed = parseEnvFile(filePath);
  const entry = parsed.find(item => item.type === 'key' && item.key === key);
  return entry ? entry.value : process.env[key] || null;
}

/**
 * 设置环境变量（同时更新 process.env 和 .env 文件）
 */
function set(key, value, filePath = ENV_PATH) {
  // 更新 process.env
  process.env[key] = String(value);

  // 更新 .env 文件
  const parsed = parseEnvFile(filePath);
  const existing = parsed.find(item => item.type === 'key' && item.key === key);

  if (existing) {
    existing.value = String(value);
    existing.raw = `${key}=${value}`;
  } else {
    // 在文件末尾添加
    parsed.push({ type: 'empty', raw: '' });
    parsed.push({ type: 'comment', raw: `# 管理后台配置 - ${new Date().toISOString()}` });
    parsed.push({ type: 'key', key, value: String(value), raw: `${key}=${value}` });
  }

  writeEnvFile(parsed, filePath);
  logger.info('env 配置已持久化', { key, value: key.includes('KEY') ? '***' : value, module: 'config' });
}

/**
 * 批量设置环境变量
 */
function setMany(kvPairs, filePath = ENV_PATH) {
  const parsed = parseEnvFile(filePath);

  for (const [key, value] of Object.entries(kvPairs)) {
    // 更新 process.env
    process.env[key] = String(value);

    // 更新 .env 文件
    const existing = parsed.find(item => item.type === 'key' && item.key === key);
    if (existing) {
      existing.value = String(value);
      existing.raw = `${key}=${value}`;
    } else {
      parsed.push({ type: 'key', key, value: String(value), raw: `${key}=${value}` });
    }
  }

  writeEnvFile(parsed, filePath);
  logger.info('批量 env 配置已持久化', {
    keys: Object.keys(kvPairs).join(', '),
    module: 'config',
  });
}

/**
 * 检查 .env 文件是否存在
 */
function envFileExists() {
  return fs.existsSync(ENV_PATH);
}

// ==========================================
// 白标版配置
// ==========================================

const WHITELABEL_DEFAULTS = {
  brandName: '盘古AI',
  brandLogo: '',
  primaryColor: '#4F46E5',
  secondaryColor: '#7C3AED',
  customDomain: '',
  contactEmail: '',
  customFooter: 'Powered by 盘古AI内容引擎',
  features: {
    textGeneration: true,
    imageGeneration: true,
    videoScript: true,
    liveScript: true,
    competitorAnalysis: true,
    contentCalendar: true,
  },
};

/**
 * 获取白标版配置（从 .env 读取或使用默认值）
 */
function getWhitelabelConfig() {
  return {
    brandName: get('WL_BRAND_NAME') || WHITELABEL_DEFAULTS.brandName,
    brandLogo: get('WL_BRAND_LOGO') || WHITELABEL_DEFAULTS.brandLogo,
    primaryColor: get('WL_PRIMARY_COLOR') || WHITELABEL_DEFAULTS.primaryColor,
    secondaryColor: get('WL_SECONDARY_COLOR') || WHITELABEL_DEFAULTS.secondaryColor,
    customDomain: get('WL_CUSTOM_DOMAIN') || WHITELABEL_DEFAULTS.customDomain,
    contactEmail: get('WL_CONTACT_EMAIL') || WHITELABEL_DEFAULTS.contactEmail,
    customFooter: get('WL_CUSTOM_FOOTER') || WHITELABEL_DEFAULTS.customFooter,
  };
}

/**
 * 更新白标版配置
 */
function updateWhitelabelConfig(config) {
  const kvPairs = {};
  if (config.brandName !== undefined) kvPairs.WL_BRAND_NAME = config.brandName;
  if (config.brandLogo !== undefined) kvPairs.WL_BRAND_LOGO = config.brandLogo;
  if (config.primaryColor !== undefined) kvPairs.WL_PRIMARY_COLOR = config.primaryColor;
  if (config.secondaryColor !== undefined) kvPairs.WL_SECONDARY_COLOR = config.secondaryColor;
  if (config.customDomain !== undefined) kvPairs.WL_CUSTOM_DOMAIN = config.customDomain;
  if (config.contactEmail !== undefined) kvPairs.WL_CONTACT_EMAIL = config.contactEmail;
  if (config.customFooter !== undefined) kvPairs.WL_CUSTOM_FOOTER = config.customFooter;

  if (Object.keys(kvPairs).length > 0) {
    setMany(kvPairs);
  }

  return getWhitelabelConfig();
}

/**
 * 获取所有可管理的配置项（用于管理后台展示）
 */
function getAllConfig() {
  return {
    ai: {
      model: get('PANGU_MODEL'),
      apiKey: get('DEEPSEEK_API_KEY') ? '***已配置***' : '未配置',
      useOpenClaw: get('USE_OPENCLAW'),
    },
    server: {
      port: get('PORT') || '18790',
      adminKey: get('ADMIN_KEY') ? '***已配置***' : '未配置',
    },
    comfyUI: {
      url: get('COMFYUI_URL'),
    },
    whitelabel: getWhitelabelConfig(),
  };
}

module.exports = {
  get,
  set,
  setMany,
  parseEnvFile,
  writeEnvFile,
  envFileExists,
  ENV_PATH,
  getWhitelabelConfig,
  updateWhitelabelConfig,
  getAllConfig,
  WHITELABEL_DEFAULTS,
};
