import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { formatDuration, formatHMS } from '../hooks/useTimer'
import type { DailyReport, WeeklyReport, MonthlyReport, PaycodeSummary } from '../types'

type Period = 'daily' | 'weekly' | 'monthly'

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function addMonths(year: number, month: number, n: number): { year: number; month: number } {
  const d = new Date(year, month - 1 + n)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

function SummaryBar({ summary, max }: { summary: PaycodeSummary; max: number }) {
  const pct = max > 0 ? (summary.total_seconds / max) * 100 : 0
  return (
    <div className="flex items-center gap-3 py-2">
      <div
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: summary.paycode.color_hex }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-white/90 truncate">{summary.paycode.name}</span>
          <span className="text-sm font-mono font-semibold ml-2 flex-shrink-0">
            {formatDuration(summary.total_seconds)}
          </span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: summary.paycode.color_hex + 'cc' }}
          />
        </div>
        {summary.dollar_total != null && (
          <p className="text-[11px] text-white/30 mt-1">${summary.dollar_total.toFixed(2)}</p>
        )}
      </div>
    </div>
  )
}

function DailyView() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const isToday = date === new Date().toISOString().slice(0, 10)

  const { data, isLoading } = useQuery<DailyReport>({
    queryKey: ['report-daily', date],
    queryFn: () => api.get(`/reports/daily?date=${date}`),
  })

  const maxSeconds = Math.max(...(data?.summaries.map((s) => s.total_seconds) ?? [0]), 1)

  return (
    <div>
      {/* Date nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setDate(addDays(date, -1))} className="btn-ghost p-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <div className="text-center">
          <p className="font-semibold text-white">
            {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
          {isToday && <p className="text-[11px] text-accent mt-0.5">Today</p>}
        </div>
        <button
          onClick={() => setDate(addDays(date, 1))}
          disabled={isToday}
          className="btn-ghost p-2 disabled:opacity-30"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-accent animate-spin" />
        </div>
      ) : (
        <div className="glass p-5">
          <div className="text-center mb-5">
            <p className="font-mono text-3xl font-semibold">{formatHMS(data?.total_seconds ?? 0)}</p>
            <p className="text-white/40 text-xs mt-1">total tracked</p>
          </div>
          {data?.summaries.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-4">No time tracked this day</p>
          ) : (
            <div className="divide-y divide-white/5">
              {data?.summaries.map((s) => (
                <SummaryBar key={s.paycode.id} summary={s} max={maxSeconds} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function WeeklyView() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))

  const { data, isLoading } = useQuery<WeeklyReport>({
    queryKey: ['report-weekly', date],
    queryFn: () => api.get(`/reports/weekly?date=${date}`),
  })

  const maxDaySeconds = Math.max(...(data?.days.map((d) => d.total_seconds) ?? [0]), 1)
  const maxSummarySeconds = Math.max(...(data?.summaries.map((s) => s.total_seconds) ?? [0]), 1)

  const prevWeek = () => setDate(addDays(date, -7))
  const nextWeek = () => setDate(addDays(date, 7))

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevWeek} className="btn-ghost p-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <div className="text-center">
          {data && (
            <p className="font-semibold text-white text-sm">
              {new Date(data.week_start + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {' – '}
              {new Date(data.week_end + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          )}
        </div>
        <button onClick={nextWeek} className="btn-ghost p-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-accent animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Day bars */}
          <div className="glass p-5">
            <p className="text-[11px] text-white/40 uppercase tracking-widest mb-3">Days</p>
            <div className="flex items-end gap-1.5 h-20">
              {data?.days.map((day, i) => {
                const pct = (day.total_seconds / maxDaySeconds) * 100
                const d = new Date(day.date + 'T00:00:00')
                const isToday = day.date === new Date().toISOString().slice(0, 10)
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end" style={{ height: 64 }}>
                      <div
                        className={`w-full rounded-t-md transition-all duration-500 ${isToday ? 'bg-accent/60' : 'bg-white/15'}`}
                        style={{ height: `${Math.max(pct, day.total_seconds > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                    <span className={`text-[9px] font-medium ${isToday ? 'text-accent' : 'text-white/30'}`}>
                      {DAYS[i]}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Total */}
          <div className="glass p-4 text-center">
            <p className="font-mono text-2xl font-semibold">{formatHMS(data?.total_seconds ?? 0)}</p>
            <p className="text-white/40 text-xs mt-1">week total</p>
          </div>

          {/* Per-paycode breakdown */}
          {(data?.summaries.length ?? 0) > 0 && (
            <div className="glass p-5">
              <p className="text-[11px] text-white/40 uppercase tracking-widest mb-3">By paycode</p>
              <div className="divide-y divide-white/5">
                {data?.summaries.map((s) => (
                  <SummaryBar key={s.paycode.id} summary={s} max={maxSummarySeconds} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function MonthlyView() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { data, isLoading } = useQuery<MonthlyReport>({
    queryKey: ['report-monthly', year, month],
    queryFn: () => api.get(`/reports/monthly?year=${year}&month=${month}`),
  })

  const maxSummarySeconds = Math.max(...(data?.summaries.map((s) => s.total_seconds) ?? [0]), 1)
  const maxDaySeconds = Math.max(...(data?.days.map((d) => d.total_seconds) ?? [0]), 1)

  const prev = () => {
    const n = addMonths(year, month, -1)
    setYear(n.year); setMonth(n.month)
  }
  const next = () => {
    const n = addMonths(year, month, 1)
    setYear(n.year); setMonth(n.month)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={prev} className="btn-ghost p-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <p className="font-semibold">{MONTH_NAMES[month - 1]} {year}</p>
        <button onClick={next} className="btn-ghost p-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-accent animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="glass p-4 text-center">
            <p className="font-mono text-2xl font-semibold">{formatHMS(data?.total_seconds ?? 0)}</p>
            <p className="text-white/40 text-xs mt-1">month total</p>
          </div>

          {/* Calendar heatmap */}
          <div className="glass p-4">
            <p className="text-[11px] text-white/40 uppercase tracking-widest mb-3">Daily heatmap</p>
            <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {['M','T','W','T','F','S','S'].map((d, i) => (
                <div key={i} className="text-[9px] text-white/30 text-center pb-1">{d}</div>
              ))}
              {/* Empty cells for day-of-week offset */}
              {data?.days && (() => {
                const firstDay = new Date(data.days[0].date + 'T00:00:00')
                const offset = (firstDay.getDay() + 6) % 7 // Monday=0
                return Array.from({ length: offset }, (_, i) => <div key={`e${i}`} />)
              })()}
              {data?.days.map((day) => {
                const pct = day.total_seconds / maxDaySeconds
                const isToday = day.date === now.toISOString().slice(0, 10)
                const alpha = day.total_seconds > 0 ? Math.max(0.15, pct) : 0
                return (
                  <div
                    key={day.date}
                    title={`${day.date}: ${formatDuration(day.total_seconds)}`}
                    className={`aspect-square rounded-md flex items-center justify-center text-[8px] font-medium ${isToday ? 'ring-1 ring-accent' : ''}`}
                    style={{
                      backgroundColor: day.total_seconds > 0 ? `rgba(10, 132, 255, ${alpha})` : 'rgba(255,255,255,0.04)',
                      color: day.total_seconds > 0 ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)',
                    }}
                  >
                    {new Date(day.date + 'T00:00:00').getDate()}
                  </div>
                )
              })}
            </div>
          </div>

          {(data?.summaries.length ?? 0) > 0 && (
            <div className="glass p-5">
              <p className="text-[11px] text-white/40 uppercase tracking-widest mb-3">By paycode</p>
              <div className="divide-y divide-white/5">
                {data?.summaries.map((s) => (
                  <SummaryBar key={s.paycode.id} summary={s} max={maxSummarySeconds} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Reports() {
  const [period, setPeriod] = useState<Period>('weekly')

  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-bold mb-4">Reports</h2>

      {/* Period switcher */}
      <div className="glass-sm flex p-1 mb-5">
        {(['daily', 'weekly', 'monthly'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-all duration-200 ${
              period === p ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {period === 'daily' && <DailyView />}
      {period === 'weekly' && <WeeklyView />}
      {period === 'monthly' && <MonthlyView />}
    </div>
  )
}
