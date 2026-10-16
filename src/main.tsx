import React from "react"

import ReactDOM from "react-dom/client"

import App from "./App"

import { AppProvider } from "./context/AppContext"

import { DonorPortalProvider } from "./context/DonorPortalContext"

import { ThemeProvider } from "./context/ThemeContext"

import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppProvider>
      <DonorPortalProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </DonorPortalProvider>
    </AppProvider>
  </React.StrictMode>,
)
