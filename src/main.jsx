import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

const preloadReloadKey = 'vite-preload-reload'

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  if (sessionStorage.getItem(preloadReloadKey)) {
    sessionStorage.removeItem(preloadReloadKey)
    return
  }
  sessionStorage.setItem(preloadReloadKey, 'true')
  window.location.reload()
})

window.addEventListener(
  'load',
  () => sessionStorage.removeItem(preloadReloadKey),
  { once: true }
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)