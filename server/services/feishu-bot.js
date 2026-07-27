/**
 * 飞书群机器人 — 盘古引擎入口
 * 
 * 老板在飞书群 @盘古 即可使用：
 *   @盘古 帮我写美甲店七夕朋友圈促销文案
 *   @盘古 一键多平台 火锅店新品毛肚
 *   @盘古 内容日历 美业 8月
 *   @盘古 爆款标题 夏天防晒
 *   @盘古 直播话术 服装店 连衣裙 299
 * 
 * 集成方式：作为 OpenClaw Agent 的一个 skill / 或者独立 Express 路由
 */

const promptEngine = require('../../prompts');
const { generateContent } = require('./ai');

/**
 * 解析飞书消息意图
 */
function parseIntent(text) {
  const cleaned = text.replace(/@盘古|@盤古|@pangu/gi, '').trim();

  // 意图匹配
  const patterns = [
    {
      intent: 'multi-platform',
      keywords: ['多平台', '一键多平台', '全平台', '各平台'],
      regex: /(.+?)(?:店|公司|工作室|机构)(.+)/,
    },
    {
      intent: 'headline',
      keywords: ['标题', '爆款标题', '取标题'],
    },
    {
      intent: 'calendar',
      keywords: ['日历', '内容日历', '排期', '月度计划'],
    },
    {
      intent: 'live',
      keywords: ['直播', '直播话术', '带货话术'],
    },
    {
      intent: 'video',
      keywords: ['视频', '脚本', '口播', 'vlog'],
    },
    {
      intent: 'analyze',
      keywords: ['分析', '竞品', '拆解'],
    },
    {
      intent: 'generate',
      keywords: ['写', '生成', '文案', '帮写', '帮我', '写一个', '写一条'],
    },
  ];

  // 检测行业
  const industryPatterns = [
    { id: 'beauty', keywords: ['美甲', '美发', '美容', '美睫', '纹绣', '美业', '皮肤管理', '美妆'] },
    { id: 'restaurant', keywords: ['火锅', '餐厅', '餐饮', '饭店', '小吃', '奶茶', '咖啡', '烧烤'] },
    { id: 'retail', keywords: ['服装', '衣服', '饰品', '母婴', '便利店', '杂货', '鞋子'] },
    { id: 'education', keywords: ['教育', '培训', '课程', '教培', '辅导', '学习'] },
    { id: 'fitness', keywords: ['健身', '瑜伽', '普拉提', '私教', '运动', '减肥'] },
    { id: 'decoration', keywords: ['装修', '家装', '全屋定制', '软装', '设计公司'] },
  ];

  let industry = 'retail';
  for (const ip of industryPatterns) {
    if (ip.keywords.some(k => cleaned.includes(k))) {
      industry = ip.id;
      break;
    }
  }

  // 检测平台
  let platform = 'wechat';
  if (cleaned.includes('小红书') || cleaned.includes('小红书')) platform = 'xiaohongshu';
  else if (cleaned.includes('抖音')) platform = 'douyin';
  else if (cleaned.includes('知乎')) platform = 'zhihu';
  else if (cleaned.includes('公众号')) platform = 'gongzhonghao';
  else if (cleaned.includes('朋友圈')) platform = 'wechat';

  // 匹配意图
  let intent = 'generate';
  for (const p of patterns) {
    if (p.keywords.some(k => cleaned.includes(k))) {
      intent = p.intent;
      break;
    }
  }

  return { intent, industry, platform, text: cleaned };
}

/**
 * 提取业务信息
 */
function extractInfo(text) {
  return {
    name: extractPattern(text, /(.+?)(?:店|公司|工作室|机构|品牌)/) || '商家',
    service: text,
    promotion: extractPattern(text, /(?:活动|折扣|优惠)(.*?)(?:原价|价格|时间|$)/) || '',
    price: extractPattern(text, /(?:价格|原价|活动价|¥)?(\d+[元块]?) /) || '',
    period: extractPattern(text, /(?:时间|截止|到)(.*?)(?:地址|门店|$)/) || '',
    address: extractPattern(text, /(?:地址|门店|位置)(.*?)$/) || '',
  };
}

function extractPattern(text, regex) {
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * 处理飞书消息
 * @param {string} text - 用户消息（已去除@）
 * @returns {Promise<string>} 回复
 */
async function handleFeishuMessage(text) {
  const { intent, industry, platform, text: cleaned } = parseIntent(text);
  const info = extractInfo(cleaned);

  try {
    switch (intent) {
      case 'multi-platform': {
        const prompts = promptEngine.multiPlatform({
          industry,
          scene: 'promotion',
          inputs: info,
          targetPlatforms: ['wechat', 'xiaohongshu', 'douyin'],
        });
        
        let result = '🚀 **一键多平台文案**\n\n';
        const platformNames = { wechat: '💬 朋友圈', xiaohongshu: '📕 小红书', douyin: '🎵 抖音' };
        
        for (const [plat, prompt] of Object.entries(prompts)) {
          const content = await generateContent(prompt.system, prompt.user);
          result += `### ${platformNames[plat] || plat}\n${content}\n\n---\n\n`;
        }
        return result;
      }

      case 'headline': {
        const prompt = promptEngine.headlineFactory({
          topic: cleaned.replace('标题', '').replace('爆款', '').trim(),
          count: 10,
          platform,
        });
        const result = await generateContent(prompt.system, prompt.user);
        return `💥 **爆款标题工厂**\n\n${result}`;
      }

      case 'calendar': {
        const prompt = promptEngine.contentCalendar({
          industry,
          month: new Date().getMonth() + 1,
          keyDates: [],
        });
        const result = await generateContent(prompt.system, prompt.user);
        return `📅 **内容日历**\n\n${result}`;
      }

      case 'live': {
        const liveTool = require('../../prompts/tools/live');
        const prompt = liveTool.user({ industry, product: cleaned, price: info.price || '待定', duration: 120 });
        const result = await generateContent(liveTool.system, prompt);
        return `📡 **直播话术框架**\n\n${result}`;
      }

      case 'video': {
        const videoTool = require('../../prompts/tools/video');
        const prompt = videoTool.script.user('口播', { topic: cleaned, duration: 60, style: '专业分享' });
        const result = await generateContent(videoTool.script.system, prompt);
        return `🎬 **视频脚本**\n\n${result}`;
      }

      case 'analyze': {
        const prompt = promptEngine.competitorAnalysis({
          content: cleaned.replace('分析', '').replace('竞品', '').trim(),
          industry,
        });
        const result = await generateContent(prompt.system, prompt.user);
        return `🔍 **竞品分析**\n\n${result}`;
      }

      case 'generate':
      default: {
        const prompts = promptEngine.generate({
          industry,
          platform,
          scene: 'promotion',
          inputs: info,
        });
        const result = await generateContent(prompts.system, prompts.user);
        const platformNames = { wechat: '朋友圈', xiaohongshu: '小红书', douyin: '抖音', zhihu: '知乎', gongzhonghao: '公众号' };
        return `✨ 为你生成${platformNames[platform] || ''}文案：\n\n${result}\n\n---\n💡 试试说「一键多平台」生成全平台版本`;
      }
    }
  } catch (err) {
    console.error('飞书消息处理失败:', err);
    return '😅 生成失败，请稍后重试。\n\n提示：你可以这样说——\n• @盘古 帮我写美甲店七夕促销朋友圈\n• @盘古 一键多平台 火锅店新品毛肚\n• @盘古 标题工厂 夏天防晒';
  }
}

/**
 * 生成欢迎/帮助信息
 */
function getHelpMessage() {
  return `🚀 **盘古AI内容引擎** — 你的AI内容团队

**快速上手：**

✍️ **写文案**
\`@盘古 帮我写[行业][店名][活动]朋友圈文案\`
例：@盘古 帮我写美甲店七夕8折活动朋友圈

🔄 **一键多平台**
\`@盘古 一键多平台 [内容]\`
例：@盘古 一键多平台 火锅店新品毛肚上线

💥 **爆款标题**
\`@盘古 标题工厂 [主题]\`
例：@盘古 标题工厂 夏天防晒

📅 **内容日历**
\`@盘古 内容日历 [行业]\`
例：@盘古 内容日历 美业 8月

📡 **直播话术**
\`@盘古 直播话术 [产品] [价格]\`
例：@盘古 直播话术 连衣裙 299元

🎬 **视频脚本**
\`@盘古 视频脚本 [主题]\`

🔍 **竞品分析**
\`@盘古 分析 [内容/链接]\`

---
📱 Web版: http://pangu.ai
💬 有建议？私聊 @唐僧`;
}

module.exports = { handleFeishuMessage, getHelpMessage, parseIntent, extractInfo };
