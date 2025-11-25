// src/main.tsx
import React from "react"
import ReactDOM from "react-dom/client"
import App from './App.tsx'
import { initTheme } from './theme'
import "./styles/globals.css"
import './styles/theme.css'

initTheme()
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

