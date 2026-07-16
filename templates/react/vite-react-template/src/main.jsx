import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThunderIDProvider } from '@thunderid/react'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThunderIDProvider
      clientId={import.meta.env.VITE_THUNDERID_CLIENT_ID}
      baseUrl={import.meta.env.VITE_THUNDERID_BASE_URL}
    >
      <App />
    </ThunderIDProvider>
  </StrictMode>,
)
