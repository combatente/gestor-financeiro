import { lazy, Suspense, useState } from "react"
import { Toaster } from "react-hot-toast"
import { useAuth } from "./hooks/useAuth"
import Layout from "./components/Layout"
import AuthForm from "./components/AuthForm"
import { CardSkeleton } from "./components/ui/Skeleton"
import type { TabId } from "./types"

const Dashboard = lazy(() => import("./components/Dashboard"))
const Transactions = lazy(() => import("./components/Transactions"))
const BankImport = lazy(() => import("./components/BankImport"))
const Budgets = lazy(() => import("./components/Budgets"))
const Categories = lazy(() => import("./components/Categories"))
const SavingsGoals = lazy(() => import("./components/SavingsGoals"))
const Investments = lazy(() => import("./components/Investments"))
const DebtManagement = lazy(() => import("./components/DebtManagement"))
const Accounts = lazy(() => import("./components/Accounts"))
const RecurringTransactions = lazy(() => import("./components/RecurringTransactions"))
const FinancialSummary = lazy(() => import("./components/FinancialSummary"))
const Reports = lazy(() => import("./components/Reports"))
const FinancialCalendar = lazy(() => import("./components/FinancialCalendar"))
const Calculators = lazy(() => import("./components/Calculators"))

function TabFallback() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  )
}

export default function App() {
  const { user, loading } = useAuth()
  const [tab, setTab] = useState<TabId>("dashboard")

  const userLike = user ? { email: user.email ?? null } : null

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'rgb(var(--bg))' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent border-[rgb(var(--brand))] animate-spin" />
          <p className="text-sm text-[rgb(var(--text-muted))]">A carregar...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'rgb(var(--bg))' }}>
        <div className="card p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">💰</div>
            <h1 className="text-2xl font-bold text-[rgb(var(--text))]">Orçamento Familiar</h1>
            <p className="text-sm text-[rgb(var(--text-muted))] mt-1">Controle total das suas finanças</p>
          </div>
          <AuthForm />
        </div>
        <Toaster position="top-right" />
      </div>
    )
  }

  return (
    <>
      <Layout tab={tab} onTabChange={(id) => setTab(id as TabId)} user={userLike}>
        <Suspense fallback={<TabFallback />}>
          {tab === "dashboard"    && <Dashboard />}
          {tab === "transactions" && <Transactions />}
          {tab === "import"       && <BankImport />}
          {tab === "budgets"      && <Budgets />}
          {tab === "categories"   && <Categories />}
          {tab === "savings"      && <SavingsGoals />}
          {tab === "investments"  && <Investments />}
          {tab === "debt"         && <DebtManagement />}
          {tab === "accounts"     && <Accounts />}
          {tab === "recurring"    && <RecurringTransactions />}
          {tab === "summary"      && <FinancialSummary />}
          {tab === "reports"      && <Reports />}
          {tab === "calendar"     && <FinancialCalendar />}
          {tab === "calculators"  && <Calculators />}
        </Suspense>
      </Layout>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgb(var(--surface))',
            color: 'rgb(var(--text))',
            border: '1px solid rgba(var(--border),var(--border-alpha))',
            borderRadius: '12px',
            fontSize: '0.875rem',
          },
          success: { iconTheme: { primary: '#86efac', secondary: 'white' } },
          error:   { iconTheme: { primary: '#fca5a5', secondary: 'white' } },
        }}
      />
    </>
  )
}
