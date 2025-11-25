import { useState } from "react"
import { useAuth } from "./hooks/useAuth"
import Layout from "./components/Layout"
import AuthForm from "./components/AuthForm"
import Dashboard from "./components/Dashboard"
import Transactions from "./components/Transactions"
import Budgets from "./components/Budgets"
import Categories from "./components/Categories"
import Analytics from "./components/Analytics"

// Tipo para tabs (podes mover para src/types.ts)
type TabId = "dashboard" | "transactions" | "budgets" | "categories" | "analytics"

export default function App() {
  const { user, loading } = useAuth()
  const [tab, setTab] = useState<TabId>("dashboard")

  // Adapta o objeto do Firebase Auth para o Layout
  const userLike = user ? { email: user.email ?? null } : null

  if (loading) {
    return <div className="p-8 text-center">A carregar...</div>
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="bg-white dark:bg-slate-800 shadow-lg rounded-xl p-6 w-full max-w-sm">
          <AuthForm />
        </div>
      </div>
    )
  }

  return (
    <Layout tab={tab} onTabChange={(id) => setTab(id)} user={userLike}>
      {tab === "dashboard"    && <Dashboard />}
      {tab === "transactions" && <Transactions />}
      {tab === "budgets"      && <Budgets />}
      {tab === "categories"   && <Categories />}
      {tab === "analytics"    && <Analytics />}
    </Layout>
  )
}