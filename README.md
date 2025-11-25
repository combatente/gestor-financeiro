
# React + TypeScript + Vite

Este template fornece uma configuração mínima para trabalhar com React no Vite com HMR e algumas regras do ESLint.

Atualmente, dois plugins oficiais estão disponíveis:

- @vitejs/plugin-react usa Babel (ou oxc quando usado com rolldown-vite) para Fast Refresh
- @vitejs/plugin-react-swc usa SWC para Fast Refresh

## React Compiler

O React Compiler não está ativado neste template devido ao impacto no desempenho de desenvolvimento e build. Para adicioná-lo, veja esta documentação.

## Expandindo a configuração do ESLint

Se estiveres a desenvolver uma aplicação de produção, recomendamos atualizar a configuração para ativar regras de lint com verificação de tipos:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      tseslint.configs.recommendedTypeChecked,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
])
