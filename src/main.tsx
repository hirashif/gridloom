import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { LazyMotion, MotionConfig } from 'motion/react'
// Self-hosted fonts (no CDN calls — keys never leave the browser, neither do font requests).
// Newsreader (display) is served from /fonts (see @font-face in index.css) so index.html can preload it.
import '@fontsource/instrument-sans/400.css'
import '@fontsource/instrument-sans/500.css'
import '@fontsource/instrument-sans/600.css'
import '@fontsource/instrument-sans/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/600.css'
import '@fontsource/caveat/500.css'
import '@fontsource/caveat/600.css'
import '@fontsource/caveat/700.css'
import './index.css'
import App from './App.tsx'
import Toaster from './components/Toaster.tsx'

const loadFeatures = () => import('./lib/motion-features').then((m) => m.default)

// Demo data: always in dev; on production builds only when asked for with
// ?demo (e.g. preview walkthroughs, screenshots). Dynamic import keeps the
// seed code out of the normal bundle path; seeding is idempotent.
if (import.meta.env.DEV || new URLSearchParams(window.location.search).has('demo')) {
  void import('./lib/dev-seed').then((m) => m.seedDemoData())
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">
        <App />
        <Toaster />
      </MotionConfig>
    </LazyMotion>
  </StrictMode>,
)
