import { useState, useEffect } from 'react'
import { api, logout } from '../api'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.getDashboard()
      .then(setData)
      .catch(err => {
        if (err.message === '认证失败') navigate('/login')
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin text-3xl">⏳</div></div>
  if (!data) return <div className="text-red-500">加载失败</div>

  const stats = [
    { label: '总用户', value: data.totalUsers, icon: '👥', color: 'bg-blue-50 text-blue-600' },
    { label: '总内容', value: data.totalContent, icon: '📝', color: 'bg-green-50 text-green-600' },
    { label: '今日生成', value: data.todayUsage, icon: '⚡', color: 'bg-amber-50 text-amber-600' },
    { label: '今日活跃', value: data.todayActiveUsers, icon: '🔥', color: 'bg-purple-50 text-purple-600' },
  ]

  const planNames = { free: '免费版', pro: 'Pro版', enterprise: '企业版', whitelabel: '白标版' }
  const planColors = { free: 'bg-gray-100', pro: 'bg-blue-100', enterprise: 'bg-purple-100', whitelabel: 'bg-amber-100' }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">📊 仪表盘</h2>
        <span className="text-sm text-gray-400">
          {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
        </span>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">{s.label}</p>
                <p className="text-3xl font-extrabold text-gray-800 mt-1">{s.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${s.color}`}>
                {s.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 近7日用量 */}
        <div className="stat-card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">📈 近7日生成用量</h3>
          {data.dailyStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.dailyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="生成次数" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-12">暂无数据</p>
          )}
        </div>

        {/* 套餐分布 */}
        <div className="stat-card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">💎 套餐分布</h3>
          <div className="space-y-3">
            {Object.entries(planNames).map(([key, name]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-indigo-500 h-2 rounded-full"
                      style={{ width: `${data.totalUsers ? (data.planStats[key] / data.totalUsers * 100) : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700 w-8 text-right">{data.planStats[key]}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">💰 本月预估收入</span>
              <span className="text-xl font-bold text-green-600">¥{data.revenue.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
