import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api, ApiError } from '../api/client'
import { useAuthStore } from '../stores/useAuthStore'

const NAV = [
  {
    to: '/',
    label: 'Timesheet',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    to: '/reports',
    label: 'Reports',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    to: '/paycodes',
    label: 'Paycodes',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" />
      </svg>
    ),
  },
]

function UserMenu() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [inviteError, setInviteError] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
        setShowInviteForm(false)
        setInviteStatus('idle')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const inviteMutation = useMutation({
    mutationFn: (email: string) => api.post('/invites', { email }),
    onSuccess: () => {
      setInviteStatus('success')
      setInviteEmail('')
    },
    onError: (err) => {
      setInviteStatus('error')
      setInviteError(err instanceof ApiError ? err.message : 'Failed to send invite')
    },
  })

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviteStatus('idle')
    setInviteError('')
    inviteMutation.mutate(inviteEmail.trim())
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initials = user?.full_name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div ref={menuRef} className="relative">
      {/* Trigger */}
      <button
        onClick={() => {
          setOpen((v) => !v)
          setShowInviteForm(false)
          setInviteStatus('idle')
        }}
        className="flex items-center gap-2 glass-sm px-3 py-1.5 glass-hover rounded-xl"
      >
        <div className="w-6 h-6 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-[10px] font-bold text-accent">
          {initials}
        </div>
        <span className="text-white/70 text-sm hidden sm:block max-w-[120px] truncate">
          {user?.full_name}
        </span>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          className={`text-white/30 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-72 rounded-2xl overflow-hidden z-50 animate-fade-in"
          style={{
            background: 'rgba(15, 18, 30, 0.97)',
            border: '1px solid rgba(255,255,255,0.14)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
          }}
        >
          {/* User info */}
          <div className="px-4 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-sm font-semibold text-white">{user?.full_name}</p>
            <p className="text-xs text-white/50 mt-0.5">{user?.email}</p>
          </div>

          {!showInviteForm ? (
            <>
              {/* Invite item */}
              <button
                onClick={() => { setShowInviteForm(true); setInviteStatus('idle') }}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors text-sm"
                style={{ background: 'transparent' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div className="w-8 h-8 rounded-xl bg-accent/15 flex items-center justify-center text-accent flex-shrink-0">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="19" y1="8" x2="19" y2="14" />
                    <line x1="22" y1="11" x2="16" y2="11" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-white">Invite new user</p>
                  <p className="text-white/50 text-xs mt-0.5">Send a 24-hour invite link</p>
                </div>
              </button>

              <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />

              {/* Sign out */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors text-sm"
                style={{ background: 'transparent' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,69,58,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,69,58,0.12)' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FF453A" strokeWidth="2" strokeLinecap="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </div>
                <span className="font-semibold text-accent-red">Sign out</span>
              </button>
            </>
          ) : inviteStatus === 'success' ? (
            <div className="px-4 py-6 text-center">
              <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(48,209,88,0.12)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#30D158" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="font-semibold text-white text-sm">Invite sent!</p>
              <p className="text-white/50 text-xs mt-1">The link expires in 24 hours.</p>
              <button
                onClick={() => { setShowInviteForm(false); setInviteStatus('idle') }}
                className="mt-3 text-accent text-xs hover:underline"
              >
                Send another
              </button>
            </div>
          ) : (
            /* Invite form */
            <form onSubmit={handleInvite} className="p-4">
              <p className="text-xs text-white/60 mb-3 leading-relaxed">
                Enter the email address of the person you want to invite. They'll receive a link valid for 24 hours.
              </p>
              <input
                type="email"
                className="input-glass text-sm mb-2"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                autoFocus
                required
              />
              {inviteStatus === 'error' && (
                <p className="text-accent-red text-xs mb-2">{inviteError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowInviteForm(false)}
                  className="flex-1 py-2 rounded-xl text-sm text-white/60 hover:text-white transition-colors font-medium"
                  style={{ background: 'rgba(255,255,255,0.07)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteMutation.isPending}
                  className="btn-accent flex-1 text-center text-sm py-2 disabled:opacity-50"
                >
                  {inviteMutation.isPending ? 'Sending…' : 'Send Invite'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top header */}
      <header className="sticky top-0 z-40 px-4 pt-4 pb-2">
        <div className="glass-sm flex items-center justify-between px-4 py-2.5 max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <span className="font-semibold text-sm tracking-tight">ChronoLens</span>
          </div>

          <UserMenu />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 py-4 max-w-2xl mx-auto w-full pb-28">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-40 px-4 pb-6">
        <div className="glass flex items-center justify-around py-2 max-w-sm mx-auto">
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
            >
              {({ isActive }) => (
                <>
                  {icon(isActive)}
                  <span className="text-[10px] font-medium">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
