import { FormEvent, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import { useAuthStore } from '../stores/useAuthStore'
import type { User } from '../types'

interface InviteInfo {
  email: string
  invited_by: string
  expires_at: string
}

interface AcceptResponse {
  access_token: string
  user: User
}

type PasswordStrength = 'weak' | 'fair' | 'strong' | 'very-strong'

function checkStrength(pw: string): { strength: PasswordStrength; issues: string[] } {
  const issues: string[] = []
  if (pw.length < 12) issues.push(`At least 12 characters (${pw.length}/12)`)
  if (!/[A-Z]/.test(pw)) issues.push('One uppercase letter')
  if (!/[a-z]/.test(pw)) issues.push('One lowercase letter')
  if (!/[0-9]/.test(pw)) issues.push('One number')
  const hasSpecial = /[^A-Za-z0-9]/.test(pw)

  if (issues.length === 0 && hasSpecial && pw.length >= 16) return { strength: 'very-strong', issues: [] }
  if (issues.length === 0) return { strength: 'strong', issues: [] }
  if (issues.length <= 1) return { strength: 'fair', issues }
  return { strength: 'weak', issues }
}

const STRENGTH_LABEL: Record<PasswordStrength, string> = {
  weak: 'Weak',
  fair: 'Fair',
  strong: 'Strong',
  'very-strong': 'Very strong',
}

const STRENGTH_COLOR: Record<PasswordStrength, string> = {
  weak: '#FF453A',
  fair: '#FF9F0A',
  strong: '#30D158',
  'very-strong': '#30D158',
}

const STRENGTH_WIDTH: Record<PasswordStrength, string> = {
  weak: '25%',
  fair: '55%',
  strong: '80%',
  'very-strong': '100%',
}

export default function AcceptInvite() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [loadError, setLoadError] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { strength, issues } = checkStrength(password)

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setLoadError('No invite token found in the link.')
      return
    }
    api
      .get<InviteInfo>(`/invites/${token}`)
      .then(setInvite)
      .catch((err) => {
        setLoadError(err instanceof ApiError ? err.message : 'Invalid or expired invite link.')
      })
  }, [token])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitError('')

    if (password !== confirmPw) {
      setSubmitError('Passwords do not match.')
      return
    }
    if (issues.length > 0) {
      setSubmitError('Please meet all password requirements.')
      return
    }

    setSubmitting(true)
    try {
      const res = await api.post<AcceptResponse>(`/invites/${token}/accept`, {
        full_name: fullName.trim(),
        password,
      })
      setAuth(res.user, res.access_token)
      navigate('/')
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Error / loading states ─────────────────────────────────────────────────
  if (!invite && !loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-accent animate-spin" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass p-8 max-w-sm w-full text-center animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-accent-red/10 flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF453A" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="font-bold text-lg mb-2">Invite unavailable</h2>
          <p className="text-white/50 text-sm leading-relaxed">{loadError}</p>
          <p className="text-white/30 text-xs mt-4">Ask your admin to send a new invite link.</p>
        </div>
      </div>
    )
  }

  // ── Account setup form ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">ChronoLens</h1>
        </div>

        <div className="glass p-6">
          {/* Invite context */}
          <div className="bg-accent/8 border border-accent/20 rounded-xl px-4 py-3 mb-5">
            <p className="text-xs text-white/50">
              <span className="text-white font-medium">{invite!.invited_by}</span> invited
            </p>
            <p className="text-sm font-medium text-accent mt-0.5">{invite!.email}</p>
          </div>

          <h2 className="text-base font-semibold mb-4">Set up your account</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-white/50 font-medium mb-1 block">Full Name</label>
              <input
                className="input-glass"
                type="text"
                placeholder="Jane Smith"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoComplete="name"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs text-white/50 font-medium mb-1 block">Password</label>
              <div className="relative">
                <input
                  className="input-glass pr-10"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min 12 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    {showPw
                      ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                      : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                    }
                  </svg>
                </button>
              </div>

              {/* Strength meter */}
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: STRENGTH_WIDTH[strength], backgroundColor: STRENGTH_COLOR[strength] }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px]" style={{ color: STRENGTH_COLOR[strength] }}>
                      {STRENGTH_LABEL[strength]}
                    </span>
                  </div>
                  {issues.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {issues.map((issue) => (
                        <li key={issue} className="text-[11px] text-white/35 flex items-center gap-1.5">
                          <div className="w-1 h-1 rounded-full bg-white/25 flex-shrink-0" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs text-white/50 font-medium mb-1 block">Confirm Password</label>
              <input
                className={`input-glass ${confirmPw && confirmPw !== password ? 'border-accent-red/50' : ''}`}
                type={showPw ? 'text' : 'password'}
                placeholder="Re-enter your password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                required
                autoComplete="new-password"
              />
              {confirmPw && confirmPw !== password && (
                <p className="text-[11px] text-accent-red mt-1">Passwords don't match</p>
              )}
            </div>

            {submitError && (
              <div className="bg-accent-red/10 border border-accent-red/30 rounded-xl px-4 py-3 text-accent-red text-sm">
                {submitError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || issues.length > 0 || !fullName.trim() || password !== confirmPw}
              className="btn-accent mt-2 w-full text-center disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2 justify-center">
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                  </svg>
                  Creating account…
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
