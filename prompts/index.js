/**
 * 盘古AI内容引擎 — Prompt 模板库入口
 * 
 * 这是整个产品最核心的IP资产。
 * 每个模板经过精心设计，包含：
 * 1. 角色设定（让AI理解目标用户）
 * 2. 行业know-how（行话、痛点、场景）
 * 3. 格式规范（适配不同平台规则）
 * 4. 创意激发（提供多个角度）
 */

const industries = {
  beauty: require('./industries/beauty'),
  restaurant: require('./industries/restaurant'),
  retail: require('./industries/retail'),
  education: require('./industries/education'),
  fitness: require('./industries/fitness'),
  decoration: require('./industries/decoration'),
};

const platforms = {
  douyin: require('./platforms/douyin'),
  xiaohongshu: require('./platforms/xiaohongshu'),
  wechat: require('./platforms/wechat'),
  zhihu: require('./platforms/zhihu'),
  gongzhonghao: require('./platforms/gongzhonghao'),
};

const tools = {
  headline: require('./tools/headline'),
  video: require('./tools/video'),
  live: require('./tools/live'),
  poster: require('./tools/poster'),
  rewrite: require('./tools/rewrite'),
  calendar: require('./tools/calendar'),
};

class PromptEngine {
  /**
   * 生成单条文案
   * @param {Object} params
   * @param {string} params.industry - 行业（beauty/restaurant/retail/education/fitness/decoration）
   * @param {string} params.platform - 平台（douyin/xiaohongshu/wechat/zhihu/gongzhonghao）
   * @param {string} params.scene - 场景（促销/新品/日常/节日/活动）
   * @param {Object} params.inputs - 用户输入的业务信息
   * @returns {Object} {system, user} prompt 对象
   */
  generate({ industry, platform, scene = 'promotion', inputs = {} }) {
    const industryPack = industries[industry] || industries.retail;
    const platformPack = platforms[platform] || platforms.wechat;
    const sceneConfig = industryPack.scenes[scene] || industryPack.scenes.promotion;

    const systemPrompt = this._buildSystemPrompt(industryPack, platformPack, sceneConfig);
    const userPrompt = this._buildUserPrompt(inputs, sceneConfig);

    return { system: systemPrompt, user: userPrompt };
  }

  /**
   * 一键多平台改写 — 杀手功能
   * 输入一份核心信息，同时生成5个平台的版本
   */
  multiPlatform({ industry, scene, inputs, targetPlatforms = ['wechat', 'xiaohongshu', 'douyin', 'zhihu', 'gongzhonghao'] }) {
    const industryPack = industries[industry] || industries.retail;
    const sceneConfig = industryPack.scenes[scene] || industryPack.scenes.promotion;
    
    const prompts = {};
    for (const plat of targetPlatforms) {
      const platformPack = platforms[plat];
      if (!platformPack) continue;
      
      const system = this._buildSystemPrompt(industryPack, platformPack, sceneConfig);
      const user = this._buildUserPrompt(inputs, sceneConfig);
      prompts[plat] = { system, user };
    }
    
    return prompts;
  }

  /**
   * 爆款标题工厂
   * @param {string} topic - 主题
   * @param {number} count - 生成数量
   */
  headlineFactory({ topic, count = 20, platform = 'xiaohongshu' }) {
    const headlineTool = tools.headline;
    const platformPack = platforms[platform] || platforms.xiaohongshu;
    
    return {
      system: headlineTool.system(platformPack),
      user: headlineTool.user(topic, count),
    };
  }

  /**
   * 内容日历生成
   */
  contentCalendar({ industry, month, keyDates = [] }) {
    const calendarTool = tools.calendar;
    return {
      system: calendarTool.system(),
      user: calendarTool.user(industry, month, keyDates),
    };
  }

  /**
   * 竞品爆款分析
   */
  competitorAnalysis({ url, content, industry }) {
    return {
      system: tools.rewrite.system.analyze(),
      user: tools.rewrite.user.analyze(url || content, industry),
    };
  }

  // --- 内部方法 ---

  _buildSystemPrompt(industryPack, platformPack, sceneConfig) {
    return `你是${industryPack.role}。
${industryPack.knowledge}

你现在要写的是「${sceneConfig.name}」场景的内容。

${platformPack.rules}

${platformPack.format}`;
  }

  _buildUserPrompt(inputs, sceneConfig) {
    let prompt = sceneConfig.template;
    for (const [key, value] of Object.entries(inputs)) {
      prompt = prompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return prompt;
  }

  // 获取所有行业列表
  getIndustries() {
    return Object.entries(industries).map(([key, val]) => ({
      id: key,
      name: val.name,
      scenes: Object.keys(val.scenes).map(k => ({ id: k, name: val.scenes[k].name })),
    }));
  }

  // 获取所有平台
  getPlatforms() {
    return Object.entries(platforms).map(([key, val]) => ({
      id: key,
      name: val.name,
      description: val.description,
    }));
  }
}

module.exports = new PromptEngine();
