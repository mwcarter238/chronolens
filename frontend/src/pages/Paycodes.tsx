import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../api/client'
import type { Paycode } from '../types'
import { PAYCODE_COLORS, PAYCODE_TYPES } from '../types'

interface PaycodeForm {
  name: string
  color_hex: string
  type: string
  hourly_rate: string
}

const DEFAULT_FORM: PaycodeForm = {
  name: '',
  color_hex: '#0A84FF',
  type: 'regular',
  hourly_rate: '',
}

function ColorPicker({
  selected,
  onChange,
}: {
  selected: string
  onChange: (c: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {PAYCODE_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="w-7 h-7 rounded-full transition-transform"
          style={{
            backgroundColor: c,
            outline: selected === c ? `2px solid white` : 'none',
            outlineOffset: 2,
            transform: selected === c ? 'scale(1.2)' : 'scale(1)',
          }}
        />
      ))}
    </div>
  )
}

function PaycodeCard({
  paycode,
  onArchive,
}: {
  paycode: Paycode
  onArchive: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [form, setForm] = useState<PaycodeForm>({
    name: paycode.name,
    color_hex: paycode.color_hex,
    type: paycode.type,
    hourly_rate: paycode.hourly_rate?.toString() ?? '',
  })
  const [saving, setSaving] = useState(false)
  const qc = useQueryClient()

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Paycode>) => api.patch(`/paycodes/${paycode.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['paycodes'] })
      setExpanded(false)
      setSaving(false)
    },
    onError: () => setSaving(false),
  })

  const handleSave = () => {
    setSaving(true)
    updateMutation.mutate({
      name: form.name,
      color_hex: form.color_hex,
      type: form.type,
      hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : undefined,
    })
  }

  return (
    <div className="glass overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 p-4 glass-hover text-left"
      >
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: paycode.color_hex + '22', border: `1.5px solid ${paycode.color_hex}44` }}
        >
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: paycode.color_hex }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white text-sm">{paycode.name}</p>
          <p className="text-[11px] text-white/40 capitalize mt-0.5">
            {paycode.type}{paycode.hourly_rate ? ` · $${paycode.hourly_rate}/hr` : ''}
          </p>
        </div>
        {paycode.is_pinned && (
          <div className="text-accent-amber">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
        )}
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round"
          className={`text-white/30 transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-white/5 pt-4 animate-fade-in">
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-[11px] text-white/40 mb-1 block">Name</label>
              <input
                className="input-glass"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-[11px] text-white/40 mb-2 block">Color</label>
              <ColorPicker
                selected={form.color_hex}
                onChange={(c) => setForm((f) => ({ ...f, color_hex: c }))}
              />
            </div>

            <div>
              <label className="text-[11px] text-white/40 mb-1 block">Type</label>
              <select
                className="input-glass"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              >
                {PAYCODE_TYPES.map((t) => (
                  <option key={t.value} value={t.value} className="bg-[#0f1220]">
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-white/40 mb-1 block">Hourly Rate (optional)</label>
              <input
                className="input-glass"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 75.00"
                value={form.hourly_rate}
                onChange={(e) => setForm((f) => ({ ...f, hourly_rate: e.target.value }))}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="btn-accent flex-1 text-center text-sm py-2.5 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                onClick={() => onArchive(paycode.id)}
                className="glass-sm px-4 py-2.5 text-sm text-accent-red/70 hover:text-accent-red transition-colors"
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CreateModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<PaycodeForm>(DEFAULT_FORM)
  const [error, setError] = useState('')
  const qc = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (data: unknown) => api.post('/paycodes', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['paycodes'] })
      onClose()
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Failed to create paycode')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setError('')
    createMutation.mutate({
      name: form.name.trim(),
      color_hex: form.color_hex,
      type: form.type,
      hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="glass w-full max-w-sm animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h3 className="font-semibold">New Paycode</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3">
          <div>
            <label className="text-[11px] text-white/40 mb-1 block">Name</label>
            <input
              className="input-glass"
              placeholder="e.g. Development, Client A, Admin"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              autoFocus
              required
            />
          </div>

          <div>
            <label className="text-[11px] text-white/40 mb-2 block">Color</label>
            <ColorPicker
              selected={form.color_hex}
              onChange={(c) => setForm((f) => ({ ...f, color_hex: c }))}
            />
          </div>

          <div>
            <label className="text-[11px] text-white/40 mb-1 block">Type</label>
            <select
              className="input-glass"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              {PAYCODE_TYPES.map((t) => (
                <option key={t.value} value={t.value} className="bg-[#0f1220]">
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-white/40 mb-1 block">Hourly Rate (optional)</label>
            <input
              className="input-glass"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 75.00"
              value={form.hourly_rate}
              onChange={(e) => setForm((f) => ({ ...f, hourly_rate: e.target.value }))}
            />
          </div>

          {error && (
            <div className="text-accent-red text-sm bg-accent-red/10 border border-accent-red/20 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={createMutation.isPending || !form.name.trim()}
            className="btn-accent w-full text-center mt-1 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating…' : 'Create Paycode'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function Paycodes() {
  const [showCreate, setShowCreate] = useState(false)
  const qc = useQueryClient()

  const { data: paycodes = [], isLoading } = useQuery<Paycode[]>({
    queryKey: ['paycodes'],
    queryFn: () => api.get('/paycodes'),
  })

  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/paycodes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['paycodes'] }),
  })

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Paycodes</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-accent text-sm py-2 px-4"
        >
          + New
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-accent animate-spin" />
        </div>
      ) : paycodes.length === 0 ? (
        <div className="glass p-8 text-center">
          <p className="text-white/60 font-medium mb-1">No paycodes yet</p>
          <p className="text-white/30 text-sm mb-4">Create paycodes to start tracking time</p>
          <button onClick={() => setShowCreate(true)} className="btn-accent text-sm py-2.5 px-6">
            Create your first paycode
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {paycodes.map((pc) => (
            <PaycodeCard
              key={pc.id}
              paycode={pc}
              onArchive={(id) => archiveMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
