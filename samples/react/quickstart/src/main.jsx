import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThunderIDProvider } from '@thunderid/react'
import App from './App.jsx'
import ConfigNotice from './components/ConfigNotice.jsx'
import './index.css'

const REQUIRED_ENV_VARS = ['VITE_THUNDERID_CLIENT_ID', 'VITE_THUNDERID_BASE_URL']
const missingEnvVars = REQUIRED_ENV_VARS.filter((key) => !import.meta.env[key])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {missingEnvVars.length > 0 ? (
      <ConfigNotice missing={missingEnvVars} />
    ) : (
      <ThunderIDProvider
        clientId={import.meta.env.VITE_THUNDERID_CLIENT_ID}
        baseUrl={import.meta.env.VITE_THUNDERID_BASE_URL}
      >
        <App />
      </ThunderIDProvider>
    )}
  </StrictMode>
)
