import { useState, useEffect } from 'react'
import { api } from '../api'

const planNames = { free: '免费版', pro: 'Pro版', enterprise: '企业版', whitelabel: '白标版' }

export default function Config() {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // AI 配置
  const [model, setModel] = useState('')
  const [useOpenClaw, setUseOpenClaw] = useState(false)
  const [comfyuiUrl, setComfyuiUrl] = useState('')

  // 白标配置
  const [wl, setWl] = useState(null)
  const [wlSaving, setWlSaving] = useState(false)
  const [wlMsg, setWlMsg] = useState('')

  useEffect(() => {
    api.getConfig().then(data => {
      setConfig(data)
      setModel(data.model)
      setUseOpenClaw(data.useOpenClaw === 'true')
      setComfyuiUrl(data.comfyuiUrl || '')
      setWl(data.whitelabel || {})
    }).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMsg('')
    try {
      await api.updateConfig({ model, useOpenClaw, comfyuiUrl })
      setMsg('✅ 配置已保存到 .env 文件，重启服务后生效')
      setTimeout(() => setMsg(''), 5000)
    } catch (err) {
      setMsg('❌ ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleWlSave = async () => {
    setWlSaving(true)
    setWlMsg('')
    try {
      await api.updateWhitelabel(wl)
      setWlMsg('✅ 白标配置已保存到 .env 文件')
      setTimeout(() => setWlMsg(''), 3000)
    } catch (err) {
      setWlMsg('❌ ' + err.message)
    } finally {
      setWlSaving(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin text-3xl">⏳</div></div>
  if (!config) return <div className="text-red-500">加载失败</div>

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">⚙️ 系统配置</h2>

      {/* 套餐配置 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">💎 套餐方案</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(config.plans).map(([key, plan]) => (
            <div key={key} className="border border-gray-200 rounded-xl p-4 hover:border-indigo-200 transition-colors">
              <h4 className="font-semibold text-gray-800">{plan.name}</h4>
              <p className="text-2xl font-bold text-indigo-600 mt-2">
                {plan.price === 0 ? '免费' : `¥${plan.price}/月`}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                每日限额：{plan.dailyLimit === Infinity ? '无限' : `${plan.dailyLimit}次`}
              </p>
              <ul className="mt-3 space-y-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="text-xs text-gray-600 flex items-center gap-1">
                    <span className="text-green-500">✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* AI 模型配置 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">🤖 AI 模型配置</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-600 w-32">DeepSeek 模型：</label>
            <input
              type="text" value={model} onChange={e => setModel(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none w-64"
            />
            <span className="text-xs text-gray-400">deepseek-chat / deepseek-reasoner</span>
          </div>
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-600 w-32">OpenClaw 代理：</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={useOpenClaw} onChange={e => setUseOpenClaw(e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
            <span className="text-xs text-gray-400">通过 OpenClaw 网关代理 AI 请求</span>
          </div>
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-600 w-32">ComfyUI 地址：</label>
            <input
              type="text" value={comfyuiUrl} onChange={e => setComfyuiUrl(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none w-64"
            />
          </div>
          <div className="flex items-center gap-4 pt-2">
            <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {saving ? '保存中...' : '保存配置'}
            </button>
            <span className="text-xs text-amber-600">⚠️ 配置保存后需重启服务才能生效</span>
          </div>
          {msg && <p className={`mt-2 text-sm ${msg.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>{msg}</p>}
        </div>
      </div>

      {/* 白标版配置 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">🏷️ 白标版品牌定制</h3>
        <p className="text-sm text-gray-500 mb-4">
          白标版客户可自定义品牌名称、Logo、配色等。配置保存后，白标版客户的前端会自动应用这些设置。
        </p>
        {wl && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 block mb-1">品牌名称</label>
              <input
                type="text" value={wl.brandName || ''} onChange={e => setWl({ ...wl, brandName: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                placeholder="盘古AI"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">品牌 Logo URL</label>
              <input
                type="text" value={wl.brandLogo || ''} onChange={e => setWl({ ...wl, brandLogo: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">主色调</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color" value={wl.primaryColor || '#4F46E5'} onChange={e => setWl({ ...wl, primaryColor: e.target.value })}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <input
                  type="text" value={wl.primaryColor || ''} onChange={e => setWl({ ...wl, primaryColor: e.target.value })}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                  placeholder="#4F46E5"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">辅助色</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color" value={wl.secondaryColor || '#7C3AED'} onChange={e => setWl({ ...wl, secondaryColor: e.target.value })}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <input
                  type="text" value={wl.secondaryColor || ''} onChange={e => setWl({ ...wl, secondaryColor: e.target.value })}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                  placeholder="#7C3AED"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">自定义域名</label>
              <input
                type="text" value={wl.customDomain || ''} onChange={e => setWl({ ...wl, customDomain: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                placeholder="ai.yourcompany.com"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">联系邮箱</label>
              <input
                type="email" value={wl.contactEmail || ''} onChange={e => setWl({ ...wl, contactEmail: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                placeholder="support@yourcompany.com"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-gray-600 block mb-1">自定义页脚</label>
              <input
                type="text" value={wl.customFooter || ''} onChange={e => setWl({ ...wl, customFooter: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                placeholder="Powered by 盘古AI内容引擎"
              />
            </div>
          </div>
        )}
        <div className="flex items-center gap-4 mt-4">
          <button onClick={handleWlSave} disabled={wlSaving} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors">
            {wlSaving ? '保存中...' : '保存白标配置'}
          </button>
          {wlMsg && <p className={`text-sm ${wlMsg.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>{wlMsg}</p>}
        </div>
        {/* 白标版部署说明 */}
        <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-100">
          <h4 className="font-semibold text-purple-800 mb-2">📖 白标版独立部署方案</h4>
          <ol className="text-sm text-purple-700 space-y-1 list-decimal list-inside">
            <li>在管理后台将客户套餐升级为「白标版」</li>
            <li>配置上方品牌定制信息（名称、Logo、配色、域名）</li>
            <li>为客户部署独立实例：复制项目目录 → 修改 .env 中的品牌配置 → 绑定客户域名</li>
            <li>白标版客户的前端 <code className="bg-purple-200 px-1 rounded text-xs">/api/whitelabel/config</code> 接口会自动返回其品牌配置</li>
            <li>前端可通过此接口动态加载品牌名称、Logo、主题色，无需修改代码</li>
          </ol>
        </div>
      </div>

      {/* 平台与行业 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">📱 支持平台</h3>
          <div className="flex flex-wrap gap-2">
            {config.platforms.map(p => (
              <span key={p} className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full">{p}</span>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">🏭 覆盖行业</h3>
          <div className="flex flex-wrap gap-2">
            {config.industries.map(i => (
              <span key={i} className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full">{i}</span>
            ))}
          </div>
        </div>
      </div>

      {/* 运行信息 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">🖥️ 运行信息</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">后端端口：</span><span className="text-gray-800 ml-2">{config.port}</span></div>
          <div><span className="text-gray-500">管理面板：</span><span className="text-gray-800 ml-2">18791</span></div>
          <div><span className="text-gray-500">数据库：</span><span className="text-gray-800 ml-2">SQLite (pangu.db)</span></div>
          <div><span className="text-gray-500">日志目录：</span><span className="text-gray-800 ml-2">E:\盘古AI内容引擎\logs\</span></div>
          <div><span className="text-gray-500">环境配置：</span><span className="text-gray-800 ml-2">{config.envFileExists ? '✅ .env 已加载' : '⚠️ 未找到'}</span></div>
          <div><span className="text-gray-500">部署位置：</span><span className="text-gray-800 ml-2">E:\盘古AI内容引擎</span></div>
        </div>
      </div>
    </div>
  )
}
