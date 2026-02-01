import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { UIProvider } from './contexts/UIContext'
import { AuthProvider } from './contexts/AuthContext'
import { HistoryProvider } from './contexts/HistoryContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UIProvider>
      <AuthProvider>
        <HistoryProvider>
          <App />
        </HistoryProvider>
      </AuthProvider>
    </UIProvider>
  </React.StrictMode>,
)
