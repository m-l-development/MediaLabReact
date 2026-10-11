import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { createRouter } from './app/router'
import { healDone } from './app/heal'
import { createServices } from './app/services'
import { installErrorCapture } from './shared/feedback/errors'
import { langStore } from './shared/i18n/i18n'
import { initTheme } from './shared/theme/theme'
import './styles/tokens.css'
import './styles/base.css'

installErrorCapture()
initTheme()
document.documentElement.lang = langStore.get()

const router = createRouter(import.meta.env.BASE_URL)
const services = createServices(router)

const root = document.getElementById('root')
if (!root) throw new Error('Fant ikke #root i index.html')

createRoot(root).render(
  <StrictMode>
    <App services={services} />
  </StrictMode>,
)
healDone()
