import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { VersionInfo } from './components/layout/VersionInfo';

// Log version information
const appVersion = import.meta.env.VITE_APP_VERSION || '1.0.0'
console.info(`Application Version: ${appVersion}`)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VersionInfo />
  </StrictMode>,
)
