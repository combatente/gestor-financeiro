import { useMemo, useState } from 'react'

const SWATCHES = [
  '#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e','#10b981','#14b8a6',
  '#06b6d4','#0ea5e9','#3b82f6','#6366f1','#8b5cf6','#a855f7','#d946ef','#ec4899',
  '#f43f5e','#94a3b8','#64748b','#475569'
]

function isHex(v: string) { return /^#([0-9A-Fa-f]{6})$/.test(v) }

export function ColorPicker({
  value,
  onChange,
  onClose,
}: {
  value?: string | null
  onChange: (hex: string) => void
  onClose?: () => void
}) {
  const [hex, setHex] = useState(value ?? '')

  const valid = useMemo(() => isHex(hex), [hex])

  function pick(c: string) {
    setHex(c)
    onChange(c)
    onClose?.()
  }

  return (
    <div className="w-64 rounded-lg border border-white/10 bg-slate-900/90 backdrop-blur p-3 shadow-xl">
      <div className="grid grid-cols-8 gap-1">
        {SWATCHES.map(c => (
          <button
            key={c}
            onClick={() => pick(c)}
            className="h-6 w-6 rounded ring-1 ring-black/20"
            style={{ background: c }}
            title={c}
          />
        ))}
      </div>

      <div className="mt-3 text-xs text-neutral-400">Personalizar (Hex)</div>
      <div className="mt-1 flex items-center gap-2">
        <input
          className="flex-1 rounded border border-white/10 bg-transparent px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-violet-500/50"
          placeholder="#64748b"
          value={hex}
          onChange={(e) => setHex(e.target.value)}
        />
        <div className="h-6 w-10 rounded ring-1 ring-black/20" style={{ background: valid ? hex : 'transparent' }} />
        <button
          disabled={!valid}
          onClick={() => pick(hex)}
          className={`rounded px-2 py-1 text-xs ${valid ? 'bg-violet-600 text-white' : 'bg-white/5 text-neutral-500 cursor-not-allowed'}`}
        >
          Aplicar
        </button>
      </div>

      <div className="mt-2 flex justify-end">
        <button onClick={onClose} className="text-xs text-neutral-400 hover:text-neutral-200">Fechar</button>
      </div>
    </div>
  )
}
