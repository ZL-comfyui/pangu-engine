import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api'

export default function Login() {
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!key.trim()) {
      setError('请输入管理员密钥')
      return
    }
    setLoading(true)
    setError('')
    try {
      await login(key.trim())
      navigate('/')
    } catch (err) {
      setError(err.message || '密钥无效，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🔮</div>
          <h1 className="text-2xl font-bold text-gray-800">盘古AI 管理后台</h1>
          <p className="text-gray-500 mt-2">输入管理员密钥进入</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={key}
              onChange={e => { setKey(e.target.value); setError(''); }}
              placeholder="管理员密钥"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-center text-lg tracking-widest"
              autoFocus
              disabled={loading}
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button type="submit" className="btn-primary w-full py-3 text-lg" disabled={loading}>
            {loading ? '验证中...' : '进入后台'}
          </button>
        </form>
      </div>
    </div>
  )
}
