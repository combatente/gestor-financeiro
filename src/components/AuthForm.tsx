import { useState } from "react"
import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "../firebase"

export default function AuthForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  const login = async () => {
    setError(null)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (e: any) {
      setError(e.message)
    }
  }

  const register = async () => {
    setError(null)
    try {
      await createUserWithEmailAndPassword(auth, email, password)
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <div className="space-y-3">
      <input
        className="w-full border-2 rounded-lg px-3 py-2 dark:bg-slate-700"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      <input
        className="w-full border-2 rounded-lg px-3 py-2 dark:bg-slate-700"
        placeholder="Palavra-passe"
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <button onClick={login} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg">
        Entrar
      </button>
      <button onClick={register} className="w-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold py-2 rounded-lg">
        Criar Conta
      </button>
    </div>
  )
}
