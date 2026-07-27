import { useState, useEffect } from 'react'
import { api } from '../api'
import { useNavigate } from 'react-router-dom'

const planBadge = {
  free: 'badge badge-free',
  pro: 'badge badge-pro',
  enterprise: 'badge badge-enterprise',
  whitelabel: 'badge badge-whitelabel',
}
const planNames = { free: '免费版', pro: 'Pro版', enterprise: '企业版', whitelabel: '白标版' }

export default function Users() {
  const [users, setUsers] = useState({ items: [], total: 0, page: 1, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const fetchUsers = () => {
    setLoading(true)
    api.getUsers(page, 20, search)
      .then(setUsers)
      .catch(err => { if (err.message === '认证失败') navigate('/login') })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchUsers() }, [page])

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    fetchUsers()
  }

  const handlePlanChange = async (userId, newPlan) => {
    if (!confirm(`确定将该用户套餐改为「${planNames[newPlan]}」？`)) return
    await api.updateUserPlan(userId, newPlan)
    fetchUsers()
  }

  const handleDelete = async (userId, userName) => {
    if (!confirm(`确定删除用户「${userName || userId}」？此操作不可撤销！`)) return
    await api.deleteUser(userId)
    fetchUsers()
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">👥 用户管理</h2>

      {/* 搜索 */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜索手机号或昵称..."
          className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
        />
        <button type="submit" className="btn-primary">搜索</button>
      </form>

      {/* 表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="table-th">用户</th>
              <th className="table-th">手机号</th>
              <th className="table-th">套餐</th>
              <th className="table-th">注册时间</th>
              <th className="table-th">最后登录</th>
              <th className="table-th">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="table-td text-center py-12 text-gray-400">加载中...</td></tr>
            ) : users.items.length === 0 ? (
              <tr><td colSpan={6} className="table-td text-center py-12 text-gray-400">暂无用户</td></tr>
            ) : (
              users.items.map(u => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="table-td font-medium">{u.name || '未设置'}</td>
                  <td className="table-td text-gray-500">{u.phone}</td>
                  <td className="table-td">
                    <select
                      value={u.plan}
                      onChange={e => handlePlanChange(u.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:border-indigo-500 outline-none"
                    >
                      {Object.entries(planNames).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </td>
                  <td className="table-td text-gray-500 text-xs">{u.createdAt}</td>
                  <td className="table-td text-gray-500 text-xs">{u.lastLogin || '从未登录'}</td>
                  <td className="table-td">
                    <button onClick={() => handleDelete(u.id, u.name)} className="btn-danger">删除</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {users.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">共 {users.total} 个用户</span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-ghost"
            >上一页</button>
            <span className="px-3 py-1.5 text-sm text-gray-600">{page} / {users.totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(users.totalPages, p + 1))}
              disabled={page === users.totalPages}
              className="btn-ghost"
            >下一页</button>
          </div>
        </div>
      )}
    </div>
  )
}
