import { useState } from 'react'
import { Check, Pencil } from 'lucide-react'

type Props = {
  usdToEur: number
  saving: boolean
  onSave: (rate: number) => Promise<void>
}

export function FxRateEditor({ usdToEur, saving, onSave }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(usdToEur))
  const [err, setErr] = useState('')

  async function handleSave() {
    const rate = Number(value.replace(',', '.'))
    if (!Number.isFinite(rate) || rate <= 0) {
      setErr('Taxa inválida.')
      return
    }
    setErr('')
    await onSave(rate)
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-2 text-xs text-[rgb(var(--text-muted))]">
      <span>Taxa USD→EUR:</span>
      {editing ? (
        <>
          <input
            className="input py-1 px-2 w-20 text-xs"
            inputMode="decimal"
            value={value}
            onChange={e => setValue(e.target.value.replace(/[^0-9,.]/g, ''))}
            autoFocus
          />
          <button className="btn btn-ghost btn-sm p-1" onClick={handleSave} disabled={saving} aria-label="Guardar">
            <Check size={14} />
          </button>
          {err && <span className="text-rose-400">{err}</span>}
        </>
      ) : (
        <button
          className="inline-flex items-center gap-1 font-semibold text-[rgb(var(--text))] hover:text-[rgb(var(--brand))]"
          onClick={() => { setValue(String(usdToEur)); setEditing(true) }}
        >
          1 USD = {usdToEur.toFixed(4)} EUR
          <Pencil size={11} />
        </button>
      )}
    </div>
  )
}
