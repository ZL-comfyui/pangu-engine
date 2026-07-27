import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { logout } from '../api'

const navItems = [
  { to: '/', icon: '📊', label: '仪表盘', end: true, color: '#6366f1' },
  { to: '/users', icon: '👥', label: '用户管理', end: false, color: '#8b5cf6' },
  { to: '/contents', icon: '📝', label: '内容管理', end: false, color: '#a855f7' },
  { to: '/config', icon: '⚙️', label: '系统配置', end: false, color: '#10b981' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleNav = () => {
    setMobileOpen(false)
  }

  return (
    <>
      {/* 移动端菜单按钮 */}
      <button
        className="lg:hidden fixed top-3 left-3 z-50 p-3 rounded-xl shadow-lg border border-gray-100"
        style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', minWidth: 44, minHeight: 44 }}
        onClick={() => setMobileOpen(true)}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* 遮罩 */}
      <div className={`mobile-overlay ${mobileOpen ? 'show' : ''}`} onClick={() => setMobileOpen(false)} />

      {/* 侧边栏 */}
      <aside className={`w-56 h-screen flex flex-col ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" 
                 style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'white'}}>
              🔮
            </div>
            <div>
              <h1 className="text-xl font-bold">盘古</h1>
              <span className="text-xs opacity-50 font-medium tracking-wide">管理后台</span>
            </div>
          </div>
          {/* 移动端关闭 */}
          <button className="lg:hidden p-2 rounded-lg hover:bg-gray-100" onClick={() => setMobileOpen(false)}
                  style={{minWidth:44,minHeight:44}}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-0.5" onClick={handleNav}>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                    style={{background: `${item.color}12`}}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <button onClick={handleLogout} className="sidebar-link w-full text-left" style={{color:'#ef4444'}}>
            <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{background:'rgba(239,68,68,0.08)'}}>🚪</span>
            <span>退出登录</span>
          </button>
        </div>
      </aside>
    </>
  )
}
