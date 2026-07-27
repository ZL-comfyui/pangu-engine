import { useState, useEffect } from 'react'
import { api } from '../api'
import { useNavigate } from 'react-router-dom'

const typeNames = {
  single: '单次生成',
  'multi-platform': '多平台改写',
  headline: '爆款标题',
  calendar: '内容日历',
}

export default function Contents() {
  const [contents, setContents] = useState({ items: [], total: 0, page: 1, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const navigate = useNavigate()

  const fetchContents = () => {
    setLoading(true)
    api.getContents(page, 20, search)
      .then(setContents)
      .catch(err => { if (err.message === '认证失败') navigate('/login') })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchContents() }, [page])

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    fetchContents()
  }

  const handleDelete = async (id) => {
    if (!confirm('确定删除此内容？')) return
    await api.deleteContent(id)
    fetchContents()
  }

  const truncate = (str, len = 80) => {
    if (!str) return ''
    // 如果是JSON对象字符串，尝试提取可读内容
    try {
      const obj = JSON.parse(str)
      if (typeof obj === 'object') {
        const vals = Object.values(obj).filter(v => typeof v === 'string')
        if (vals.length) str = vals[0]
      }
    } catch {}
    return str.length > len ? str.slice(0, len) + '...' : str
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">📝 内容管理</h2>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜索内容关键词..."
          className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
        />
        <button type="submit" className="btn-primary">搜索</button>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="table-th">类型</th>
              <th className="table-th">用户</th>
              <th className="table-th">内容预览</th>
              <th className="table-th">时间</th>
              <th className="table-th">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="table-td text-center py-12 text-gray-400">加载中...</td></tr>
            ) : contents.items.length === 0 ? (
              <tr><td colSpan={5} className="table-td text-center py-12 text-gray-400">暂无内容</td></tr>
            ) : (
              contents.items.map(c => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="table-td">
                    <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">
                      {typeNames[c.type] || c.type}
                    </span>
                  </td>
                  <td className="table-td text-xs text-gray-500">
                    {c.userName || c.userPhone || c.userId?.slice(0, 8)}
                  </td>
                  <td className="table-td">
                    <button
                      onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                      className="text-gray-600 hover:text-indigo-600 text-left text-sm max-w-md truncate block"
                    >
                      {truncate(c.result)}
                    </button>
                  </td>
                  <td className="table-td text-xs text-gray-400">{c.createdAt}</td>
                  <td className="table-td">
                    <button onClick={() => handleDelete(c.id)} className="btn-danger">删除</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 展开内容详情 */}
      {expanded && (() => {
        const c = contents.items.find(i => i.id === expanded)
        if (!c) return null
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">内容详情</h3>
              <button onClick={() => setExpanded(null)} className="btn-ghost">✕ 关闭</button>
            </div>
            <pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 p-4 rounded-lg max-h-96 overflow-auto">
              {c.result}
            </pre>
          </div>
        )
      })()}

      {contents.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">共 {contents.total} 条内容</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost">上一页</button>
            <span className="px-3 py-1.5 text-sm text-gray-600">{page} / {contents.totalPages}</span>
            <button onClick={() => setPage(p => Math.min(contents.totalPages, p + 1))} disabled={page === contents.totalPages} className="btn-ghost">下一页</button>
          </div>
        </div>
      )}
    </div>
  )
}
