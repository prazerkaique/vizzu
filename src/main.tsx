import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { UIProvider } from './contexts/UIContext'
import { AuthProvider } from './contexts/AuthContext'
import { HistoryProvider } from './contexts/HistoryContext'
import { ProductsProvider } from './contexts/ProductsContext'
import { ClientsProvider } from './contexts/ClientsContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UIProvider>
      <AuthProvider>
        <HistoryProvider>
          <ProductsProvider>
            <ClientsProvider>
              <App />
            </ClientsProvider>
          </ProductsProvider>
        </HistoryProvider>
      </AuthProvider>
    </UIProvider>
  </React.StrictMode>,
)
