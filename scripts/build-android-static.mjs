/**
 * Build Next con output: export para Capacitor.
 * Route Handlers no pueden vivir en app/api durante export → se mueven fuera de src/app.
 */
import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const apiDir = path.join(root, 'src', 'app', 'api')
/** Fuera de app/: Next no escanea aquí como rutas */
const stashApi = path.join(root, '.stash-export-app-api')
/** Si quedó `api/` en la raíz del repo (p. ej. restore interrumpido), volver a colocarlo */
const strayRootApi = path.join(root, 'api')

function restoreIfStale() {
  if (!fs.existsSync(apiDir) && fs.existsSync(stashApi)) {
    fs.renameSync(stashApi, apiDir)
    console.log('[build-android-static] recovered src/app/api from .stash-export-app-api')
    return
  }
  if (
    !fs.existsSync(apiDir) &&
    fs.existsSync(strayRootApi) &&
    fs.existsSync(path.join(strayRootApi, 'jh-analytics'))
  ) {
    fs.renameSync(strayRootApi, apiDir)
    console.log('[build-android-static] recovered src/app/api from repo root api/')
  }
}

function stashApiAway() {
  if (fs.existsSync(apiDir)) {
    if (fs.existsSync(stashApi)) fs.rmSync(stashApi, { recursive: true })
    fs.renameSync(apiDir, stashApi)
    console.log('[build-android-static] stashed src/app/api → .stash-export-app-api')
    return true
  }
  return false
}

function restoreApi(stashed) {
  if (stashed && fs.existsSync(stashApi) && !fs.existsSync(apiDir)) {
    fs.renameSync(stashApi, apiDir)
    console.log('[build-android-static] restored src/app/api')
  }
}

restoreIfStale()

const stashed = stashApiAway()
let exitCode = 1
try {
  const env = {
    ...process.env,
    NEXT_EXPORT: 'true',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://jobshours.com',
  }
  const res = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['next', 'build'], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    env,
  })
  exitCode = res.status ?? 1
} finally {
  restoreApi(stashed)
}
process.exit(exitCode)
