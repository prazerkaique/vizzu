import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { UIProvider } from './contexts/UIContext'
import { AuthProvider } from './contexts/AuthContext'
import { HistoryProvider } from './contexts/HistoryContext'
import { ProductsProvider } from './contexts/ProductsContext'
import { ClientsProvider } from './contexts/ClientsContext'
import { GenerationProvider } from './contexts/GenerationContext'
import { PlansProvider } from './contexts/PlansContext'
import { ImageViewerProvider, ImageViewer } from './components/ImageViewer'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <UIProvider>
        <ImageViewerProvider>
        <AuthProvider>
          <PlansProvider>
          <HistoryProvider>
            <ProductsProvider>
              <ClientsProvider>
                <GenerationProvider>
                  <App />
                </GenerationProvider>
              </ClientsProvider>
            </ProductsProvider>
          </HistoryProvider>
          </PlansProvider>
        </AuthProvider>
        <ImageViewer />
        </ImageViewerProvider>
      </UIProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
