export interface User {
  id: string
  email: string
  full_name: string
  role: string
  timezone: string
  created_at: string
}

export interface Paycode {
  id: string
  user_id: string
  name: string
  color_hex: string
  type: string
  hourly_rate: number | null
  is_pinned: boolean
  sort_order: number
  archived_at: string | null
  created_at: string
}

export interface TimeEntry {
  id: string
  user_id: string
  paycode_id: string
  started_at: string
  stopped_at: string | null
  break_seconds: number
  notes: string | null
  source: string
  created_at: string
  updated_at: string
}

export interface TimeEntryWithPaycode extends TimeEntry {
  paycode: Paycode
}

export interface PaycodeSummary {
  paycode: Paycode
  total_seconds: number
  entry_count: number
  dollar_total: number | null
}

export interface DailyReport {
  date: string
  total_seconds: number
  summaries: PaycodeSummary[]
}

export interface WeeklyDayBreakdown {
  date: string
  total_seconds: number
  summaries: PaycodeSummary[]
}

export interface WeeklyReport {
  week_start: string
  week_end: string
  total_seconds: number
  days: WeeklyDayBreakdown[]
  summaries: PaycodeSummary[]
}

export interface MonthlyReport {
  year: number
  month: number
  total_seconds: number
  days: WeeklyDayBreakdown[]
  summaries: PaycodeSummary[]
}

export const PAYCODE_COLORS = [
  '#0A84FF', '#30D158', '#FF9F0A', '#FF453A', '#BF5AF2',
  '#FF375F', '#64D2FF', '#FFD60A', '#AC8E68', '#5E5CE6',
  '#32D74B', '#FF6B6B',
]

export const PAYCODE_TYPES = [
  { value: 'regular', label: 'Regular' },
  { value: 'overtime', label: 'Overtime' },
  { value: 'pto', label: 'PTO' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'billable', label: 'Billable' },
]
