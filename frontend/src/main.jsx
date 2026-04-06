import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AppProviders } from './state/providers'
import { applyThemeToDOM } from './state/themeSlice'

// Bootstrapping: Apply theme immediately from localStorage before mounting
const savedColor = localStorage.getItem('school-accent-color');
if (savedColor) {
  applyThemeToDOM(savedColor);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)
