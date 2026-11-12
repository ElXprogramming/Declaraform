import '@fontsource-variable/lexend';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { validateClientEnv } from './utils/security';
import { purgeLegacyPiiStorage } from './hooks/useBrowserStorage';

// Startup security checks: verify no private secrets are bundled and scrub any legacy drafts from permanent localStorage
validateClientEnv();
purgeLegacyPiiStorage();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);