import { useEffect, useMemo, useState } from 'react'

const DEFAULT_EMOJIS = [
  // Comuns gerais
  '🏷️','📁','🔖','✨','⭐','⚡','🔥','🎯','✅','❌','📈','📉','🔁','🔔','🧭','🧩',
  // Receitas
  '💼','💰','💸','🏦','🧾','💳','🪙','🏆',
  // Despesas
  '🍔','🍕','🍣','🍻','☕','🛒','🛍️','🚗','🚌','⛽','🚆','🏠','🔌','💡','🧯','📱','💻','🎮',
  // Poupança
  '🪙','🏦','🔒','🧱','🆘','🛟','🌱','📦',
  // Categorias diversas
  '🧹','🧺','🛏️','🛠️','⚙️','🎁','🎟️','📚','🎓','⚽','🏊','🎬','🎵','✈️','🧳','🏥','💊'
]

function normalize(str: string) {
  return str.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

function loadRecent() {
  try { return JSON.parse(localStorage.getItem('recentEmojis') || '[]') as string[] } catch { return [] }
}
function saveRecent(arr: string[]) {
  try { localStorage.setItem('recentEmojis', JSON.stringify(arr.slice(0, 12))) } catch {}
}

export function EmojiPicker({
  value,
  onChange,
  onClose,
}: {
  value?: string
  onChange: (emoji: string) => void
  onClose?: () => void
}) {
  const [query, setQuery] = useState('')
  const [recent, setRecent] = useState<string[]>([])

  useEffect(() => { setRecent(loadRecent()) }, [])

  const emojis = useMemo(() => {
    if (!query.trim()) return DEFAULT_EMOJIS
    const q = normalize(query)
    // pequeníssimo “alias” por texto comum
    const MAP: Record<string, string[]> = {
      comida: ['🍔','🍕','🍣','☕','🍻'],
      transporte: ['🚗','🚌','🚆','⛽'],
      casa: ['🏠','💡','🔌','🧯'],
      poupança: ['🪙','🏦','🛟'],
      rendimento: ['💼','💰','💳'],
      saúde: ['🏥','💊'],
      lazer: ['🎬','🎵','⚽','🏊'],
      viagem: ['✈️','🧳']
    }
    const aliases = Object.entries(MAP).flatMap(([k, arr]) => (normalize(k).includes(q) ? arr : []))
    // devolve aliases + todos que batem por “nome” rudimentar (sem BD de nomes)
    return Array.from(new Set([...aliases, ...DEFAULT_EMOJIS]))
  }, [query])

  function pick(e: string) {
    onChange(e)
    const next = [e, ...recent.filter(x => x !== e)]
    setRecent(next)
    saveRecent(next)
    onClose?.()
  }

  return (
    <div className="w-72 rounded-lg border border-white/10 bg-slate-900/90 backdrop-blur p-3 shadow-xl">
      <input
        autoFocus
        className="w-full rounded border border-white/10 bg-transparent px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-violet-500/50"
        placeholder="Pesquisar (ex.: transporte, casa...)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {recent.length > 0 && (
        <>
          <div className="mt-2 text-xs text-neutral-400">Recentes</div>
          <div className="mt-1 grid grid-cols-8 gap-1">
            {recent.map((e) => (
              <button
                key={`r-${e}`}
                onClick={() => pick(e)}
                className={`h-8 w-8 rounded hover:bg-white/5 ${value === e ? 'ring-2 ring-violet-500/60' : ''}`}
                title="Recent"
              >
                <span className="text-lg">{e}</span>
              </button>
            ))}
          </div>
        </>
      )}
      <div className="mt-2 text-xs text-neutral-400">Emojis</div>
      <div className="mt-1 max-h-48 overflow-auto rounded border border-white/5">
        <div className="grid grid-cols-8 gap-1 p-1">
          {emojis.map((e) => (
            <button
              key={e}
              onClick={() => pick(e)}
              className={`h-8 w-8 rounded hover:bg-white/5 ${value === e ? 'ring-2 ring-violet-500/60' : ''}`}
              title={e}
            >
              <span className="text-lg">{e}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 flex justify-end">
        <button onClick={onClose} className="text-xs text-neutral-400 hover:text-neutral-200">Fechar</button>
      </div>
    </div>
  )
}