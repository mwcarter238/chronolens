import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../api/client'
import { useElapsedSeconds, formatHMS, formatDuration } from '../hooks/useTimer'
import type { Paycode, TimeEntryWithPaycode, DailyReport } from '../types'

function ActiveBanner({ entry }: { entry: TimeEntryWithPaycode }) {
  const elapsed = useElapsedSeconds(entry.started_at)
  const qc = useQueryClient()

  const stopMutation = useMutation({
    mutationFn: () => api.post('/entries/stop', {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['active-entry'] })
      qc.invalidateQueries({ queryKey: ['daily-report'] })
    },
  })

  return (
    <div className="glass glass-active p-5 mb-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.paycode.color_hex }}
            />
            <div
              className="absolute inset-0 rounded-full animate-ping opacity-50"
              style={{ backgroundColor: entry.paycode.color_hex }}
            />
          </div>
          <div>
            <p className="text-[11px] text-white/50 font-medium uppercase tracking-wider mb-0.5">
              Currently tracking
            </p>
            <p className="font-semibold text-white">{entry.paycode.name}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-2xl font-semibold text-accent-green">{formatHMS(elapsed)}</p>
          <button
            onClick={() => stopMutation.mutate()}
            disabled={stopMutation.isPending}
            className="text-[11px] text-white/40 hover:text-accent-red transition-colors mt-1 disabled:opacity-50"
          >
            tap to stop
          </button>
        </div>
      </div>
    </div>
  )
}

function PaycodeRow({
  paycode,
  isActive,
  todaySeconds,
  onTap,
  loading,
}: {
  paycode: Paycode
  isActive: boolean
  todaySeconds: number
  onTap: () => void
  loading: boolean
}) {
  const elapsed = useElapsedSeconds(isActive ? new Date(Date.now() - todaySeconds * 1000).toISOString() : null)
  const displaySeconds = isActive ? elapsed : todaySeconds

  return (
    <button
      onClick={onTap}
      disabled={loading}
      className={`glass glass-hover w-full text-left p-4 flex items-center gap-4 transition-all duration-200 disabled:opacity-60 ${isActive ? 'glass-active' : ''}`}
    >
      {/* Color indicator */}
      <div className="flex-shrink-0 relative">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-semibold text-sm"
          style={{ backgroundColor: paycode.color_hex + '22', border: `1.5px solid ${paycode.color_hex}44` }}
        >
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: paycode.color_hex }} />
        </div>
        {isActive && (
          <div
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#07090f]"
            style={{ backgroundColor: '#30D158' }}
          />
        )}
      </div>

      {/* Name + type */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white text-sm truncate">{paycode.name}</p>
        <p className="text-[11px] text-white/40 capitalize mt-0.5">{paycode.type}</p>
      </div>

      {/* Time */}
      <div className="text-right flex-shrink-0">
        {displaySeconds > 0 ? (
          <p className={`font-mono text-sm font-semibold ${isActive ? 'text-accent-green' : 'text-white/70'}`}>
            {formatDuration(displaySeconds)}
          </p>
        ) : (
          <p className="text-white/20 text-xs">—</p>
        )}
        <p className="text-[10px] text-white/30 mt-0.5">
          {isActive ? 'running' : 'today'}
        </p>
      </div>

      {/* Play/stop indicator */}
      <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-white/20">
        {isActive ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#30D158">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        )}
      </div>
    </button>
  )
}

export default function Dashboard() {
  const qc = useQueryClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data: activeEntry, isLoading: activeLoading } = useQuery<TimeEntryWithPaycode | null>({
    queryKey: ['active-entry'],
    queryFn: () => api.get('/entries/active'),
    refetchInterval: 10000,
  })

  const { data: paycodes = [], isLoading: paycodesLoading } = useQuery<Paycode[]>({
    queryKey: ['paycodes'],
    queryFn: () => api.get('/paycodes'),
  })

  const { data: dailyReport } = useQuery<DailyReport>({
    queryKey: ['daily-report', today],
    queryFn: () => api.get(`/reports/daily?date=${today}`),
    refetchInterval: activeEntry ? 30000 : false,
  })

  const startMutation = useMutation({
    mutationFn: (paycode_id: string) => api.post('/entries/start', { paycode_id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['active-entry'] })
      qc.invalidateQueries({ queryKey: ['daily-report'] })
    },
  })

  const todayByPaycode = Object.fromEntries(
    (dailyReport?.summaries ?? []).map((s) => [s.paycode.id, s.total_seconds]),
  )

  const totalToday = dailyReport?.total_seconds ?? 0

  if (activeLoading || paycodesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-accent animate-spin" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Date + total */}
      <div className="mb-4">
        <p className="text-white/40 text-sm">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="font-mono text-3xl font-semibold">{formatHMS(totalToday)}</span>
          <span className="text-white/40 text-sm">today</span>
        </div>
      </div>

      {/* Active timer banner */}
      {activeEntry && <ActiveBanner entry={activeEntry} />}

      {/* Paycode list */}
      {paycodes.length === 0 ? (
        <div className="glass p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
          </div>
          <p className="text-white/60 font-medium mb-1">No paycodes yet</p>
          <p className="text-white/30 text-sm">Create your first paycode to start tracking time</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] text-white/30 uppercase tracking-widest font-medium mb-1 px-1">
            Tap to start · tap again to stop
          </p>
          {paycodes.map((pc) => (
            <PaycodeRow
              key={pc.id}
              paycode={pc}
              isActive={activeEntry?.paycode_id === pc.id}
              todaySeconds={todayByPaycode[pc.id] ?? 0}
              onTap={() => startMutation.mutate(pc.id)}
              loading={startMutation.isPending}
            />
          ))}
        </div>
      )}

      {startMutation.isError && (
        <div className="mt-3 text-accent-red text-sm text-center">
          {startMutation.error instanceof ApiError ? startMutation.error.message : 'Failed to start timer'}
        </div>
      )}
    </div>
  )
}
