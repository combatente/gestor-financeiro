# Gestor Financeiro (Orçamento Familiar)

Aplicação web (PWA) de gestão financeira familiar: transações, orçamentos, dívidas, poupanças, contas, transações recorrentes, importação de extratos bancários e relatórios — tudo em português (pt-PT).

## Stack

- **React 19 + TypeScript**, build com **Vite** (`rolldown-vite`)
- **Tailwind CSS v4**
- **Firebase** — Auth (email/password) + Firestore (dados em tempo real via `onSnapshot`)
- **PWA** via `vite-plugin-pwa` (instalável, cache offline com Workbox)
- **Recharts** (gráficos), **Framer Motion** (animações), **Lucide** (ícones)
- **xlsx** / **pdfjs-dist** para importação de extratos bancários, **jsPDF** para exportação de relatórios
- **Vitest** para testes unitários

## Como correr localmente

```bash
npm install
npm run dev       # servidor de desenvolvimento (http://localhost:5173)
```

É necessário um ficheiro `.env.local` com as variáveis `VITE_FIREBASE_*` (config do Firebase do projeto). Este ficheiro nunca deve ser commitado.

## Scripts

| Comando            | Descrição                                  |
| ------------------ | ------------------------------------------- |
| `npm run dev`       | Servidor de desenvolvimento (Vite)          |
| `npm run build`     | Verificação de tipos (`tsc -b`) + build de produção |
| `npm run preview`   | Pré-visualiza o build de produção           |
| `npm run test`      | Corre os testes unitários (Vitest)          |
| `npm run lint`      | Corre o ESLint                              |

## Estrutura do projeto

```
src/
  components/       # Um componente por separador (Dashboard, BankImport, Budgets, ...)
    ui/              # Primitivas de UI reutilizáveis (Button, Card, Modal, Skeleton, ...)
    charts/          # Wrapper dos gráficos Recharts
  hooks/
    useAuth.ts             # Autenticação Firebase
    useFirestore.ts        # CRUD em tempo real para transações, orçamentos, dívidas e poupanças
    useBudgetAllocation.ts # Alocação mensal 50/30/20
    useCategories.ts, useBudgets.ts, useTheme.ts
  utils/
    bankParser.ts     # Importação de extratos bancários (Excel/CSV/PDF)
    autoCategories.ts # Categorização automática por palavras-chave (comerciantes/bancos PT)
    budgetTargets.ts  # Cálculo de receita, execução por natureza e metas 50/30/20
    format.ts         # Formatação de moeda e período (pt-PT)
  types.ts            # Modelo de domínio partilhado (transações, dívidas, metas, contas, ...)
```

Os dados residem num único agregado familiar (`households/minha-carteira` no Firestore) — não é uma aplicação multi-tenant.

## Testes

```bash
npm run test
```

Cobrem atualmente as funções puras em `src/utils/` (formatação, cálculo de metas orçamentais e categorização automática).

## Deploy

Hospedagem em **Firebase Hosting** (`orcamento-familiar-4a040`), com deploy automático via GitHub Actions:

- `firebase-hosting-pull-request.yml` — testes + build + preview em cada PR
- `firebase-hosting-merge.yml` — testes + build + deploy para produção ao fazer merge em `main`
