import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LandingJsonLd, RouteMeta } from './components/RouteMeta'
// Landing is the LCP-critical route: it stays in the entry chunk, never lazy.
import LandingPage from './pages/LandingPage'
// Tiny, and it must render even when lazy chunks fail to load.
import NotFoundPage from './pages/NotFoundPage'

// Everything behind the landing page is code-split out of the entry chunk.
const AppLayout = lazy(() => import('./components/AppLayout'))
const GeneratePage = lazy(() => import('./pages/GeneratePage'))
const GridPage = lazy(() => import('./pages/GridPage'))
const LibraryPage = lazy(() => import('./pages/LibraryPage'))
const RecipesPage = lazy(() => import('./pages/RecipesPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

const LANDING_DESCRIPTION =
  'Run one prompt across every model and seed at once, on your own API keys. Client-only, no backend, no account.'

function App() {
  return (
    <BrowserRouter>
      <div className="grain" aria-hidden="true" />
      <Suspense
        fallback={<div className="p-8 font-mono text-xs text-faint">developing…</div>}
      >
        <Routes>
          <Route
            path="/"
            element={
              <>
                <RouteMeta
                  title="Gridloom | Shoot the whole roll. Circle the keeper."
                  description={LANDING_DESCRIPTION}
                  canonical="https://gridloom.app/"
                />
                <LandingJsonLd />
                <LandingPage />
              </>
            }
          />
          <Route element={<AppLayout />}>
            <Route
              path="/generate"
              element={
                <>
                  <RouteMeta title="Generate | Gridloom" noindex />
                  <GeneratePage />
                </>
              }
            />
            <Route
              path="/grid"
              element={
                <>
                  <RouteMeta title="Comparison grid | Gridloom" noindex />
                  <GridPage />
                </>
              }
            />
            <Route
              path="/library"
              element={
                <>
                  <RouteMeta title="Library | Gridloom" noindex />
                  <LibraryPage />
                </>
              }
            />
            <Route
              path="/recipes"
              element={
                <>
                  <RouteMeta title="Recipes | Gridloom" noindex />
                  <RecipesPage />
                </>
              }
            />
            <Route
              path="/settings"
              element={
                <>
                  <RouteMeta title="Settings | Gridloom" noindex />
                  <SettingsPage />
                </>
              }
            />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
