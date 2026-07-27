/**
 * 盘古AI内容引擎 — SPA 前端
 */

const API = '/api';
const TOKEN_KEY = 'pangu_token';
const USER_KEY = 'pangu_user';

// ========== 页面路由 ==========
const PAGES = {
  home: renderHome,
  generate: renderGenerate,
  multiplatform: renderMultiPlatform,
  headline: renderHeadline,
  calendar: renderCalendar,
  video: renderVideo,
  live: renderLive,
  analyze: renderAnalyze,
  image: renderImage,
  history: renderHistory,
};

const PAGE_TITLES = {
  home: '🏠 首页',
  generate: '✍️ 智能生成',
  multiplatform: '🔄 一键多平台',
  headline: '💥 标题工厂',
  calendar: '📅 内容日历',
  video: '🎬 视频脚本',
  live: '📡 直播话术',
  analyze: '🔍 竞品分析',
  image: '🎨 配图生成',
  history: '📋 历史记录',
};

// ========== 状态 ==========
let currentPage = 'home';
let currentResult = '';

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
  // 导航
  document.querySelectorAll('.nav-item').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      navigate(page);
    });
  });

  // 移动端菜单
  document.getElementById('menu-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('show');
    document.getElementById('sidebar-overlay').classList.toggle('show');
  });

  // 移动端底部导航
  document.querySelectorAll('#bottom-nav .bn-item[data-page]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(item.dataset.page);
    });
  });

  // 恢复登录状态
  restoreAuth();

  // 默认首页
  navigate('home');
});

// ========== 导航 ==========
function navigate(page) {
  currentPage = page;
  document.getElementById('page-title').textContent = PAGE_TITLES[page] || page;
  
  // 激活侧边栏导航项
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const activeNav = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (activeNav) activeNav.classList.add('active');

  // 激活底部导航项
  document.querySelectorAll('#bottom-nav .bn-item[data-page]').forEach(n => n.classList.remove('active'));
  const activeBN = document.querySelector(`#bottom-nav .bn-item[data-page="${page}"]`);
  if (activeBN) activeBN.classList.add('active');

  // 渲染页面
  const container = document.getElementById('page-content');
  if (PAGES[page]) {
    container.innerHTML = PAGES[page]();
  }

  // 移动端关闭侧边栏
  closeSidebar();
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('show');
  document.getElementById('sidebar-overlay').classList.remove('show');
}

// ========== 认证 ==========
function getToken() { return localStorage.getItem(TOKEN_KEY); }
function getUser() { try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; } }
function isLoggedIn() { return !!getToken(); }

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  
  const res = await fetch(API + path, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

function restoreAuth() {
  const user = getUser();
  if (user) {
    document.getElementById('user-info').innerHTML = `
      <div class="flex items-center gap-2 justify-between p-2" style="background:var(--p-surface-alt);border-radius:var(--p-radius);">
        <div class="flex items-center gap-2 text-left">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);">${(user.name||user.phone).charAt(0)}</div>
          <div>
            <div class="text-sm font-semibold" style="color:var(--p-text);">${user.name || user.phone}</div>
            <div class="text-xs" style="color:var(--p-text-muted);">${user.planName || '免费版'}</div>
          </div>
        </div>
        <button onclick="logout()" class="p-btn p-btn-ghost text-xs">退出</button>
      </div>`;
    document.getElementById('plan-badge').textContent = user.planName || '免费版';
    document.getElementById('plan-badge').classList.remove('hidden');
  }
}

function showLogin() { document.getElementById('login-modal').classList.remove('hidden'); }
function hideLogin() { document.getElementById('login-modal').classList.add('hidden'); }

async function doLogin() {
  const phone = document.getElementById('login-phone').value.trim();
  const password = document.getElementById('login-password').value.trim();
  if (!phone || !password) return toast('请输入手机号和密码', 'error');
  
  try {
    const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ phone, password }) });
    localStorage.setItem(TOKEN_KEY, data.token);
    // 获取用户信息
    const profile = await api('/user/profile');
    localStorage.setItem(USER_KEY, JSON.stringify(profile));
    hideLogin();
    restoreAuth();
    toast('登录成功', 'success');
    navigate('home');
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function doRegister() {
  const phone = document.getElementById('login-phone').value.trim();
  const password = document.getElementById('login-password').value.trim();
  if (!phone || !password) return toast('请输入手机号和密码', 'error');
  if (password.length < 4) return toast('密码至少4位', 'error');
  
  try {
    const data = await api('/auth/register', { method: 'POST', body: JSON.stringify({ phone, password }) });
    toast('注册成功，请登录', 'success');
  } catch (e) {
    toast(e.message, 'error');
  }
}

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  document.getElementById('user-info').innerHTML = `
    <button onclick="showLogin()" class="w-full py-2.5 px-4 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition">登录 / 注册</button>`;
  document.getElementById('plan-badge').classList.add('hidden');
  toast('已退出登录', 'info');
}

// ========== 结果弹窗 ==========
function showResult(text) {
  currentResult = text;
  document.getElementById('result-content').textContent = text;
  document.getElementById('result-modal').classList.remove('hidden');
}

function hideResult() {
  document.getElementById('result-modal').classList.add('hidden');
}

function copyResult() {
  navigator.clipboard.writeText(currentResult).then(() => toast('已复制', 'success'));
}

// ========== Toast ==========
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ========== 加载状态 ==========
function setLoading(btn, loading = true) {
  if (loading) {
    btn.dataset.origText = btn.textContent;
    btn.textContent = '⏳ 生成中...';
    btn.disabled = true;
  } else {
    btn.textContent = btn.dataset.origText || btn.textContent;
    btn.disabled = false;
  }
}

// ========== 行业/平台/场景数据 ==========
const INDUSTRIES = [
  { id: 'beauty', name: '💄 美业' },
  { id: 'restaurant', name: '🍽️ 餐饮' },
  { id: 'retail', name: '👗 零售' },
  { id: 'education', name: '📚 教培' },
  { id: 'fitness', name: '💪 健身' },
  { id: 'decoration', name: '🏠 家装' },
];

const PLATFORMS = [
  { id: 'douyin', name: '🎵 抖音' },
  { id: 'xiaohongshu', name: '📕 小红书' },
  { id: 'wechat', name: '💬 朋友圈' },
  { id: 'zhihu', name: '🤔 知乎' },
  { id: 'gongzhonghao', name: '📰 公众号' },
];

const SCENES = [
  { id: 'promotion', name: '促销活动' },
  { id: 'new_product', name: '新品上线' },
  { id: 'daily', name: '日常种草' },
  { id: 'holiday', name: '节日营销' },
];

function industryTags(selected, cls = '') {
  return INDUSTRIES.map(i => `
    <button data-industry="${i.id}" class="industry-tag px-4 py-2 rounded-lg border border-gray-200 text-sm ${i.id === selected ? 'active' : 'hover:border-primary-300'} ${cls}">${i.name}</button>
  `).join('');
}

function platformChecks(selected = [], multi = false) {
  return PLATFORMS.map(p => `
    <label class="platform-check flex items-center gap-2 p-3 rounded-lg border border-gray-200 cursor-pointer ${selected.includes(p.id) ? 'checked' : ''}">
      <input type="${multi ? 'checkbox' : 'radio'}" name="platform" value="${p.id}" ${selected.includes(p.id) ? 'checked' : ''} class="hidden">
      <span class="text-sm">${p.name}</span>
    </label>
  `).join('');
}

function sceneBtns(selected) {
  return SCENES.map(s => `
    <button data-scene="${s.id}" class="scene-btn px-4 py-2 rounded-lg border border-gray-200 text-sm ${s.id === selected ? 'active' : ''}">${s.name}</button>
  `).join('');
}

// ========== 页面渲染 ==========

function renderHome() {
  return `
    <div class="max-w-5xl mx-auto animate-fade-in">
      <!-- Hero -->
      <div class="hero-gradient rounded-3xl p-10 md:p-16 mb-10 text-center text-white relative overflow-hidden">
        <div style="position:absolute;inset:0;background:radial-gradient(circle at 30% 50%,rgba(255,255,255,0.1) 0%,transparent 60%);"></div>
        <div class="relative">
          <div class="text-5xl mb-4">🔮</div>
          <h1 class="text-3xl md:text-4xl font-extrabold mb-3">盘古AI内容引擎</h1>
          <p class="text-lg opacity-90 mb-2">一站式AI内容工厂 — 文案+图片+视频+直播+数据闭环</p>
          <p class="text-sm opacity-70 mb-8">为中小微企业打造的AI内容团队，一个引擎搞定全平台</p>
          <button onclick="navigate('generate')" class="btn-generate p-btn p-btn-lg" style="background:rgba(255,255,255,0.2);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.3);color:white;font-size:1.1rem;">
            ✨ 开始生成内容
          </button>
        </div>
      </div>

      <!-- 统计 -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        ${[
          {v:'6',l:'行业深度覆盖',c:'#6366f1'},
          {v:'5',l:'平台一键适配',c:'#8b5cf6'},
          {v:'10+',l:'AI创作工具',c:'#a855f7'},
          {v:'720+',l:'Prompt组合',c:'#d946ef'},
        ].map(s=>`
          <div class="stat-card text-center">
            <div class="text-3xl font-extrabold gradient-text">${s.v}</div>
            <div class="text-sm mt-1" style="color:var(--p-text-secondary);">${s.l}</div>
          </div>`).join('')}
      </div>

      <!-- 功能卡片 -->
      <h2 class="text-xl font-bold mb-5" style="color:var(--p-text);">✨ 核心能力</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        ${[
          { icon:'✍️', title:'智能文案', desc:'6大行业×5大平台×4种场景', page:'generate', color:'#6366f1' },
          { icon:'🔄', title:'一键多平台', desc:'输入一次，5个平台同时出', page:'multiplatform', color:'#8b5cf6' },
          { icon:'💥', title:'标题工厂', desc:'1个主题→20个爆款标题', page:'headline', color:'#a855f7' },
          { icon:'📅', title:'内容日历', desc:'整月内容排期规划', page:'calendar', color:'#d946ef' },
          { icon:'🎬', title:'视频脚本', desc:'口播/带货/Vlog全类型', page:'video', color:'#ec4899' },
          { icon:'📡', title:'直播话术', desc:'开场+互动+逼单全流程', page:'live', color:'#f43f5e' },
          { icon:'🔍', title:'竞品分析', desc:'拆解爆款，提取公式', page:'analyze', color:'#f59e0b' },
          { icon:'🎨', title:'AI配图', desc:'文案→配图一键生成', page:'image', color:'#10b981' },
          { icon:'📋', title:'历史记录', desc:'查找复用已生成内容', page:'history', color:'#06b6d4' },
        ].map(c => `
          <div class="feature-card cursor-pointer" onclick="navigate('${c.page}')" style="border-top:2px solid ${c.color};">
            <div class="icon-circle" style="background:${c.color}15;">${c.icon}</div>
            <h3 class="font-bold mb-1" style="color:var(--p-text);">${c.title}</h3>
            <p class="text-sm" style="color:var(--p-text-secondary);">${c.desc}</p>
          </div>
        `).join('')}
      </div>

      <!-- 套餐 -->
      <div class="p-card" style="padding:32px;">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-bold" style="color:var(--p-text);">💰 套餐方案</h3>
          <span class="p-badge p-badge-primary">前100位首月仅199元</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          ${['免费版|¥0|每天5次|基础模板|入群即用','Pro版|¥299|100次/天|全功能+配图|性价比之选','企业版|¥999|无限生成|多账号+定制|团队协作','白标版|¥3999|无限生成|自有品牌+API|独立部署'].map((p,i) => {
            const [name, price, limit, main, tag] = p.split('|');
            const feat = i===1;
            return `<div class="plan-card${feat?' featured':''}">
              <h4 class="font-bold" style="color:var(--p-text);">${name}</h4>
              <div class="mt-3 mb-4">
                <span class="text-3xl font-extrabold gradient-text">${price}</span>
                ${price!=='¥0'?'<span class="text-sm" style="color:var(--p-text-muted);">/月</span>':''}
              </div>
              <div class="space-y-2 mb-4">
                <div class="text-sm" style="color:var(--p-text-secondary);">✦ ${limit}</div>
                <div class="text-sm" style="color:var(--p-text-secondary);">✦ ${main}</div>
                <div class="text-sm" style="color:var(--p-text-muted);">✦ ${tag}</div>
              </div>
              <button onclick="navigate('generate')" class="p-btn ${feat?'p-btn-primary':'p-btn-secondary'} w-full text-sm">
                ${price==='¥0'?'免费使用':'立即开通'}
              </button>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
}

function renderGenerate() {
  const loggedIn = isLoggedIn();
  return `
    <div class="max-w-3xl mx-auto animate-fade-in">
      <div class="p-card" style="padding:28px;">
        <div class="flex items-center gap-2 mb-6">
          <span class="text-2xl">✍️</span>
          <h3 class="text-lg font-bold" style="color:var(--p-text);">智能文案生成</h3>
        </div>
        
        <div class="mb-5">
          <label class="block text-sm font-semibold mb-2" style="color:var(--p-text);">选择行业</label>
          <div class="flex flex-wrap gap-2" id="gen-industry">${industryTags('beauty')}</div>
        </div>

        <div class="highlight-box mb-5">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold mb-2" style="color:var(--p-text);">发布平台</label>
              <div class="flex flex-wrap gap-2" id="gen-platform">${platformChecks(['wechat'])}</div>
            </div>
            <div>
              <label class="block text-sm font-semibold mb-2" style="color:var(--p-text);">内容场景</label>
              <div class="flex flex-wrap gap-2" id="gen-scene">${sceneBtns('promotion')}</div>
            </div>
          </div>
        </div>

        <div class="space-y-3">
          <input id="gen-name" class="p-input" placeholder="门店/品牌名 · 如：美肌美容院">
          <input id="gen-service" class="p-input" placeholder="业务/产品 · 如：面部护理">
          <input id="gen-promotion" class="p-input" placeholder="活动/促销内容 · 如：新客体验价99元">
          <div class="grid grid-cols-2 gap-3">
            <input id="gen-price" class="p-input" placeholder="价格 · 如：99元">
            <input id="gen-period" class="p-input" placeholder="活动时间 · 如：7.26-8.2">
          </div>
        </div>

        <button id="gen-btn" onclick="handleGenerate()" class="p-btn p-btn-primary btn-generate w-full mt-5" style="padding:14px;font-size:1.05rem;">
          ✨ 生成文案
        </button>
        ${!loggedIn ? '<p class="text-xs text-center mt-3" style="color:var(--p-text-muted);">未登录使用免费试用模式（每日限5次）</p>' : ''}
      </div>
    </div>`;
}

function renderMultiPlatform() {
  return `
    <div class="max-w-3xl mx-auto animate-fade-in">
      <div class="p-card" style="padding:28px;">
        <div class="flex items-center gap-2 mb-2"><span class="text-2xl">🔄</span><h3 class="text-lg font-bold" style="color:var(--p-text);">一键多平台改写</h3></div>
        <p class="text-sm mb-6" style="color:var(--p-text-secondary);">输入一次核心信息，同时生成朋友圈/小红书/抖音/知乎/公众号5个平台的版本</p>
        
        <div class="mb-5"><label class="block text-sm font-semibold mb-2" style="color:var(--p-text);">选择行业</label><div class="flex flex-wrap gap-2" id="mp-industry">${industryTags('restaurant')}</div></div>
        <div class="mb-5"><label class="block text-sm font-semibold mb-2" style="color:var(--p-text);">目标平台（可多选）</label><div class="flex flex-wrap gap-2" id="mp-platform">${platformChecks(['wechat','xiaohongshu','douyin'], true)}</div></div>
        <div class="mb-5"><label class="block text-sm font-semibold mb-2" style="color:var(--p-text);">内容场景</label><div class="flex flex-wrap gap-2" id="mp-scene">${sceneBtns('promotion')}</div></div>
        
        <div class="space-y-3">
          <input id="mp-name" class="p-input" placeholder="门店/品牌名">
          <textarea id="mp-service" class="p-textarea" rows="3" placeholder="描述你的产品/活动/促销..."></textarea>
          <div class="grid grid-cols-2 gap-3">
            <input id="mp-price" class="p-input" placeholder="价格">
            <input id="mp-period" class="p-input" placeholder="时间">
          </div>
        </div>

        <button id="mp-btn" onclick="handleMultiPlatform()" class="p-btn p-btn-primary w-full mt-5" style="padding:14px;font-size:1.05rem;background:linear-gradient(135deg,#8b5cf6,#a855f7);">
          🔥 一键生成全平台文案
        </button>
      </div>
    </div>`;
}

function renderHeadline() {
  return `
    <div class="max-w-3xl mx-auto animate-fade-in">
      <div class="p-card" style="padding:28px;">
        <div class="flex items-center gap-2 mb-6"><span class="text-2xl">💥</span><h3 class="text-lg font-bold" style="color:var(--p-text);">爆款标题工厂</h3></div>
        <div class="mb-5"><label class="block text-sm font-semibold mb-2" style="color:var(--p-text);">内容主题</label><input id="hl-topic" class="p-input" placeholder="如：夏天防晒护肤"></div>
        <div class="mb-5"><label class="block text-sm font-semibold mb-2" style="color:var(--p-text);">目标平台</label><div class="flex flex-wrap gap-2" id="hl-platform">${platformChecks(['xiaohongshu'])}</div></div>
        <div class="mb-5">
          <label class="block text-sm font-semibold mb-2" style="color:var(--p-text);">生成数量 · <span id="hl-count-val" class="gradient-text font-bold">20</span> 个</label>
          <input id="hl-count" type="range" min="5" max="30" value="20" class="w-full accent-indigo-500" oninput="document.getElementById('hl-count-val').textContent=this.value">
        </div>
        <button id="hl-btn" onclick="handleHeadline()" class="p-btn p-btn-primary w-full" style="padding:14px;font-size:1.05rem;">💥 生成爆款标题</button>
      </div>
    </div>`;
}

function renderCalendar() {
  return `
    <div class="max-w-3xl mx-auto animate-fade-in">
      <div class="p-card" style="padding:28px;">
        <div class="flex items-center gap-2 mb-6"><span class="text-2xl">📅</span><h3 class="text-lg font-bold" style="color:var(--p-text);">内容日历生成</h3></div>
        <div class="mb-5"><label class="block text-sm font-semibold mb-2" style="color:var(--p-text);">行业</label><div class="flex flex-wrap gap-2" id="cal-industry">${industryTags('beauty')}</div></div>
        <div class="mb-5"><label class="block text-sm font-semibold mb-2" style="color:var(--p-text);">月份</label><input id="cal-month" type="number" min="1" max="12" value="${new Date().getMonth()+1}" class="p-input"></div>
        <div class="mb-5"><label class="block text-sm font-semibold mb-2" style="color:var(--p-text);">特殊节点（逗号分隔）</label><input id="cal-dates" class="p-input" placeholder="如：七夕, 周年庆, 会员日"></div>
        <button id="cal-btn" onclick="handleCalendar()" class="p-btn p-btn-primary w-full" style="padding:14px;font-size:1.05rem;">📅 生成内容日历</button>
      </div>
    </div>`;
}

function renderVideo() {
  return `
    <div class="max-w-3xl mx-auto animate-fade-in">
      <div class="p-card" style="padding:28px;">
        <div class="flex items-center gap-2 mb-6"><span class="text-2xl">🎬</span><h3 class="text-lg font-bold" style="color:var(--p-text);">视频脚本生成</h3></div>
        <div class="mb-5"><label class="block text-sm font-semibold mb-2" style="color:var(--p-text);">脚本类型</label>
          <div class="flex gap-2" id="vid-type">
            <button data-vtype="口播" class="scene-btn active">口播</button>
            <button data-vtype="带货" class="scene-btn">带货</button>
            <button data-vtype="Vlog" class="scene-btn">Vlog</button>
          </div></div>
        <div class="mb-5"><label class="block text-sm font-semibold mb-2" style="color:var(--p-text);">主题</label><input id="vid-topic" class="p-input" placeholder="如：新店开业探店"></div>
        <div class="grid grid-cols-2 gap-3 mb-5">
          <div><label class="block text-sm font-semibold mb-2" style="color:var(--p-text);">时长（秒）</label><input id="vid-duration" type="number" value="60" class="p-input"></div>
          <div><label class="block text-sm font-semibold mb-2" style="color:var(--p-text);">风格</label><select id="vid-style" class="p-input"><option>专业分享</option><option>轻松幽默</option><option>情感共鸣</option><option>硬核干货</option></select></div></div>
        <button id="vid-btn" onclick="handleVideo()" class="p-btn p-btn-primary w-full" style="padding:14px;font-size:1.05rem;">🎬 生成视频脚本</button>
      </div>
    </div>`;
}

function renderLive() {
  return `
    <div class="max-w-3xl mx-auto animate-fade-in">
      <div class="p-card" style="padding:28px;">
        <div class="flex items-center gap-2 mb-6"><span class="text-2xl">📡</span><h3 class="text-lg font-bold" style="color:var(--p-text);">直播话术框架</h3></div>
        <div class="mb-5"><label class="block text-sm font-semibold mb-2" style="color:var(--p-text);">行业</label><div class="flex flex-wrap gap-2" id="live-industry">${industryTags('retail')}</div></div>
        <div class="mb-5"><label class="block text-sm font-semibold mb-2" style="color:var(--p-text);">主打产品</label><input id="live-product" class="p-input" placeholder="如：夏季连衣裙新款"></div>
        <div class="grid grid-cols-2 gap-3 mb-5">
          <div><label class="block text-sm font-semibold mb-2" style="color:var(--p-text);">价格</label><input id="live-price" class="p-input" placeholder="299元"></div>
          <div><label class="block text-sm font-semibold mb-2" style="color:var(--p-text);">时长（分钟）</label><input id="live-duration" type="number" value="120" class="p-input"></div></div>
        <button id="live-btn" onclick="handleLive()" class="p-btn p-btn-primary w-full" style="padding:14px;font-size:1.05rem;">📡 生成直播话术</button>
      </div>
    </div>`;
}

function renderAnalyze() {
  return `
    <div class="max-w-3xl mx-auto animate-fade-in">
      <div class="p-card" style="padding:28px;">
        <div class="flex items-center gap-2 mb-6"><span class="text-2xl">🔍</span><h3 class="text-lg font-bold" style="color:var(--p-text);">竞品爆款分析</h3></div>
        <div class="mb-5"><label class="block text-sm font-semibold mb-2" style="color:var(--p-text);">行业</label><div class="flex flex-wrap gap-2" id="ana-industry">${industryTags('beauty')}</div></div>
        <div class="mb-5"><label class="block text-sm font-semibold mb-2" style="color:var(--p-text);">粘贴竞品内容或链接</label><textarea id="ana-content" class="p-textarea" rows="4" placeholder="粘贴竞品文案、文章或链接..."></textarea></div>
        <button id="ana-btn" onclick="handleAnalyze()" class="p-btn p-btn-primary w-full" style="padding:14px;font-size:1.05rem;">🔍 开始分析</button>
      </div>
    </div>`;
}

function renderImage() {
  return `
    <div class="max-w-3xl mx-auto animate-fade-in">
      <div class="p-card" style="padding:28px;">
        <div class="flex items-center gap-2 mb-6"><span class="text-2xl">🎨</span><h3 class="text-lg font-bold" style="color:var(--p-text);">AI配图Prompt生成</h3></div>
        <div class="mb-5"><label class="block text-sm font-semibold mb-2" style="color:var(--p-text);">文案内容</label><textarea id="img-content" class="p-textarea" rows="3" placeholder="粘贴你的文案，AI将生成配图Prompt..."></textarea></div>
        <div class="mb-5"><label class="block text-sm font-semibold mb-2" style="color:var(--p-text);">视觉风格</label><select id="img-style" class="p-input"><option value="modern">现代简约</option><option value="warm">温馨暖调</option><option value="luxury">高端奢华</option><option value="fresh">清新自然</option><option value="cool">科技感</option></select></div>
        <button id="img-btn" onclick="handleImage()" class="p-btn p-btn-primary w-full" style="padding:14px;font-size:1.05rem;">🎨 生成配图Prompt</button>
        <p class="text-xs text-center mt-3" style="color:var(--p-text-muted);">生成的Prompt可用于ComfyUI / Stable Diffusion / Midjourney</p>
      </div>
    </div>`;
}

function renderHistory() {
  if (!isLoggedIn()) return '<div class="empty-state"><div class="empty-icon">🔐</div><p>请先登录后查看历史记录</p></div>';
  return `
    <div class="max-w-4xl mx-auto animate-fade-in">
      <div class="p-card" style="padding:28px;">
        <div class="flex items-center gap-2 mb-4"><span class="text-2xl">📋</span><h3 class="text-lg font-bold" style="color:var(--p-text);">历史记录</h3></div>
        <input id="hist-search" class="p-input mb-4" placeholder="搜索历史内容..." onkeyup="handleHistorySearch()">
        <div id="hist-list" class="space-y-2"><div class="loading-shimmer" style="height:80px;"></div></div>
        <div id="hist-pagination" class="flex justify-center gap-2 mt-4"></div>
      </div>
    </div>`;
}

// ========== 事件处理 ==========

function getSelectedRadio(name) {
  const checked = document.querySelector(`input[name="${name}"]:checked`);
  return checked ? checked.value : null;
}

function getSelectedChecks(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(i => i.value);
}

function getActiveBtn(parentId, cls) {
  const el = document.querySelector(`#${parentId} .${cls}.active`);
  return el ? el.dataset[Object.keys(el.dataset)[0]] : null;
}

// 通用绑定：导航后执行
function bindEvents(page) {
  // 行业标签
  document.querySelectorAll('.industry-tag').forEach(btn => {
    btn.onclick = function() {
      this.parentElement.querySelectorAll('.industry-tag').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
    };
  });

  // 平台选择
  document.querySelectorAll('.platform-check').forEach(label => {
    const input = label.querySelector('input');
    label.onclick = function(e) {
      if (input.type === 'radio') {
        this.parentElement.querySelectorAll('.platform-check').forEach(l => l.classList.remove('checked'));
        input.checked = true;
      } else {
        input.checked = !input.checked;
      }
      this.classList.toggle('checked', input.checked);
    };
  });

  // 场景按钮
  document.querySelectorAll('.scene-btn').forEach(btn => {
    btn.onclick = function() {
      this.parentElement.querySelectorAll('.scene-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
    };
  });
}

// 重写 navigate 添加事件绑定
const _origNavigate = navigate;
navigate = function(page) {
  _origNavigate(page);
  setTimeout(() => bindEvents(page), 100);
  
  // 加载历史
  if (page === 'history' && isLoggedIn()) {
    setTimeout(loadHistory, 200);
  }
};

// ========== API 操作 ==========

async function handleGenerate() {
  const btn = document.getElementById('gen-btn');
  setLoading(btn, true);

  const industry = getActiveBtn('gen-industry', 'industry-tag') || 'beauty';
  const platform = getSelectedRadio('platform') || 'wechat';
  const scene = getActiveBtn('gen-scene', 'scene-btn') || 'promotion';
  
  const inputs = {
    name: document.getElementById('gen-name').value || '商家',
    service: document.getElementById('gen-service').value || '产品服务',
    promotion: document.getElementById('gen-promotion').value || '',
    price: document.getElementById('gen-price').value || '',
    period: document.getElementById('gen-period').value || '',
    originalPrice: '',
    address: '',
  };

  try {
    const endpoint = isLoggedIn() ? '/generate' : '/trial/generate';
    const data = await api(endpoint, {
      method: 'POST',
      body: JSON.stringify({ industry, platform, scene, inputs }),
    });
    showResult(data.result);
  } catch (e) {
    toast(e.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

async function handleMultiPlatform() {
  const btn = document.getElementById('mp-btn');
  setLoading(btn, true);

  const industry = getActiveBtn('mp-industry', 'industry-tag') || 'restaurant';
  const platforms = getSelectedChecks('platform');
  const scene = getActiveBtn('mp-scene', 'scene-btn') || 'promotion';
  
  const inputs = {
    name: document.getElementById('mp-name').value || '商家',
    service: document.getElementById('mp-service').value || '产品服务',
    promotion: document.getElementById('mp-service').value || '',
    price: document.getElementById('mp-price').value || '',
    period: document.getElementById('mp-period').value || '',
  };

  if (!isLoggedIn()) {
    toast('多平台功能需登录使用', 'error');
    setLoading(btn, false);
    return showLogin();
  }

  try {
    const data = await api('/generate/multi-platform', {
      method: 'POST',
      body: JSON.stringify({ industry, scene, inputs, targetPlatforms: platforms }),
    });
    
    const platformNames = { wechat: '💬 朋友圈', xiaohongshu: '📕 小红书', douyin: '🎵 抖音', zhihu: '🤔 知乎', gongzhonghao: '📰 公众号' };
    let result = '🚀 一键多平台文案\n' + '='.repeat(30) + '\n\n';
    
    for (const [plat, content] of Object.entries(data.results)) {
      result += `### ${platformNames[plat] || plat}\n${content}\n\n${'='.repeat(30)}\n\n`;
    }
    
    showResult(result);
  } catch (e) {
    toast(e.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

async function handleHeadline() {
  const btn = document.getElementById('hl-btn');
  setLoading(btn, true);

  const topic = document.getElementById('hl-topic').value.trim();
  if (!topic) { toast('请输入主题', 'error'); setLoading(btn, false); return; }
  
  try {
    const endpoint = isLoggedIn() ? '/tools/headline' : '/trial/generate';
    const data = await api(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        topic,
        count: parseInt(document.getElementById('hl-count').value) || 20,
        platform: getSelectedRadio('platform') || 'xiaohongshu',
        ...(isLoggedIn() ? {} : { industry: 'retail', platform: getSelectedRadio('platform') || 'xiaohongshu', scene: 'promotion', inputs: { name: topic, service: topic } })
      }),
    });
    showResult(data.result);
  } catch (e) {
    toast(e.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

async function handleCalendar() {
  const btn = document.getElementById('cal-btn');
  setLoading(btn, true);
  if (!isLoggedIn()) { toast('请先登录', 'error'); setLoading(btn, false); return showLogin(); }

  try {
    const data = await api('/tools/calendar', {
      method: 'POST',
      body: JSON.stringify({
        industry: getActiveBtn('cal-industry', 'industry-tag') || 'beauty',
        month: parseInt(document.getElementById('cal-month').value) || new Date().getMonth() + 1,
        keyDates: document.getElementById('cal-dates').value.split(',').map(s => s.trim()).filter(Boolean),
      }),
    });
    showResult(data.result);
  } catch (e) {
    toast(e.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

async function handleVideo() {
  const btn = document.getElementById('vid-btn');
  setLoading(btn, true);
  if (!isLoggedIn()) { toast('请先登录', 'error'); setLoading(btn, false); return showLogin(); }

  try {
    const data = await api('/tools/video', {
      method: 'POST',
      body: JSON.stringify({
        type: getActiveBtn('vid-type', 'scene-btn') || '口播',
        topic: document.getElementById('vid-topic').value.trim(),
        duration: parseInt(document.getElementById('vid-duration').value) || 60,
        style: document.getElementById('vid-style').value,
      }),
    });
    showResult(data.result);
  } catch (e) {
    toast(e.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

async function handleLive() {
  const btn = document.getElementById('live-btn');
  setLoading(btn, true);
  if (!isLoggedIn()) { toast('请先登录', 'error'); setLoading(btn, false); return showLogin(); }

  try {
    const data = await api('/tools/live', {
      method: 'POST',
      body: JSON.stringify({
        industry: getActiveBtn('live-industry', 'industry-tag') || 'retail',
        product: document.getElementById('live-product').value.trim(),
        price: document.getElementById('live-price').value.trim(),
        duration: parseInt(document.getElementById('live-duration').value) || 120,
      }),
    });
    showResult(data.result);
  } catch (e) {
    toast(e.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

async function handleAnalyze() {
  const btn = document.getElementById('ana-btn');
  setLoading(btn, true);
  if (!isLoggedIn()) { toast('请先登录', 'error'); setLoading(btn, false); return showLogin(); }

  try {
    const data = await api('/tools/analyze', {
      method: 'POST',
      body: JSON.stringify({
        content: document.getElementById('ana-content').value.trim(),
        industry: getActiveBtn('ana-industry', 'industry-tag') || 'beauty',
      }),
    });
    showResult(data.result);
  } catch (e) {
    toast(e.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

async function handleImage() {
  const btn = document.getElementById('img-btn');
  setLoading(btn, true);
  if (!isLoggedIn()) { toast('请先登录', 'error'); setLoading(btn, false); return showLogin(); }

  try {
    const data = await api('/tools/image-prompt', {
      method: 'POST',
      body: JSON.stringify({
        content: document.getElementById('img-content').value.trim(),
        style: document.getElementById('img-style').value,
      }),
    });
    showResult(data.result);
  } catch (e) {
    toast(e.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

let histPage = 1;

async function loadHistory(page = 1) {
  histPage = page;
  try {
    const data = await api(`/history?page=${page}&limit=15`);
    const list = document.getElementById('hist-list');
    
    if (!data.items.length) {
      list.innerHTML = '<div class="text-center py-8 text-gray-400">暂无内容，快去生成吧 ✨</div>';
      return;
    }
    
    list.innerHTML = data.items.map(item => {
      const d = item.data || {};
      const preview = (item.result || '').substring(0, 100).replace(/\n/g, ' ');
      const typeMap = {
        'single': '✍️ 文案',
        'multi-platform': '🔄 多平台',
        'headline': '💥 标题',
        'calendar': '📅 日历',
      };
      const typeLabel = typeMap[item.type] || '📝 ' + item.type;
      
      return `
        <div class="p-4 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition" onclick="showResult(${JSON.stringify(item.result).replace(/"/g, '&quot;')})">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-medium text-primary-500">${typeLabel}</span>
            <span class="text-xs text-gray-400">${new Date(item.createdAt).toLocaleString('zh-CN')}</span>
          </div>
          <p class="text-sm text-gray-600 truncate">${preview}...</p>
        </div>`;
    }).join('');

    // 分页
    const pag = document.getElementById('hist-pagination');
    pag.innerHTML = '';
    if (data.totalPages > 1) {
      for (let p = 1; p <= data.totalPages; p++) {
        pag.innerHTML += `<button onclick="loadHistory(${p})" class="px-3 py-1 rounded-lg text-sm ${p === page ? 'bg-primary-500 text-white' : 'bg-gray-100'}">${p}</button>`;
      }
    }
  } catch (e) {
    document.getElementById('hist-list').innerHTML = '<div class="text-center py-8 text-red-400">加载失败: ' + e.message + '</div>';
  }
}

async function handleHistorySearch() {
  const q = document.getElementById('hist-search').value.trim();
  if (!q) { loadHistory(1); return; }
  
  try {
    const items = await api('/history/search?q=' + encodeURIComponent(q));
    const list = document.getElementById('hist-list');
    if (!items.length) {
      list.innerHTML = '<div class="text-center py-8 text-gray-400">没有找到相关内容</div>';
      return;
    }
    list.innerHTML = items.map(item => {
      const preview = (item.result || '').substring(0, 100).replace(/\n/g, ' ');
      return `
        <div class="p-4 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition" onclick="showResult(${JSON.stringify(item.result).replace(/"/g, '&quot;')})">
          <span class="text-xs text-gray-400">${new Date(item.createdAt).toLocaleString('zh-CN')}</span>
          <p class="text-sm text-gray-600 truncate mt-1">${preview}...</p>
        </div>`;
    }).join('');
    document.getElementById('hist-pagination').innerHTML = '';
  } catch (e) {
    toast('搜索失败', 'error');
  }
}

console.log('🚀 盘古AI内容引擎 前端就绪');
