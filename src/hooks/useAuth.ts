// src/hooks/useAuth.ts
import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth } from '../firebase'
import type { User } from 'firebase/auth'

/** Representação do utilizador para o resto da app */
export type AuthUser = { uid: string; email: string | null }

/** Representação mínima que o Layout consome */
export type AuthUserLike = { email: string | null }

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Evita setState após unmount
    let mounted = true

    const unsub = onAuthStateChanged(auth, (u: User | null) => {
      if (!mounted) return
      setUser(u ? { uid: u.uid, email: u.email } : null)
      setLoading(false)
    })

    return () => {
      mounted = false
      unsub()
    }
  }, [])

  // Forma que o Layout consome (email opcional)
  const userLike: AuthUserLike | null = useMemo(
    () => (user ? { email: user.email } : null),
    [user]
  )

  // Helpers (opcionais) para login/registo/logout
  async function signIn(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    return cred.user
  }

  async function signUp(email: string, password: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    return cred.user
  }

  async function doSignOut() {
    await signOut(auth)
  }

  const isAuthenticated = !!user

  return {
    /** Utilizador detalhado */
    user,
    /** Utilizador minimal para o Layout */
    userLike,
    /** A carregar estado inicial */
    loading,
    /** Conveniências */
    signIn,
    signUp,
    signOut: doSignOut,
    isAuthenticated,
  }
}
