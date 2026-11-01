import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const ROOT = process.cwd()
const APP_DIR = path.join(ROOT, 'release', 'GalFlow-win32-x64')
const INSTALLER_PATH = path.join(
  ROOT,
  'release',
  'GalFlow-Setup-0.1.0-x64.exe',
)

function findMakensis() {
  const candidates = []

  if (process.env.MAKENSIS_PATH) {
    candidates.push(process.env.MAKENSIS_PATH)
  }

  candidates.push('C:\\Program Files (x86)\\NSIS\\makensis.exe')
  candidates.push('C:\\Program Files\\NSIS\\makensis.exe')

  const cacheRoot = path.join(
    process.env.LOCALAPPDATA ?? '',
    'electron-builder',
    'Cache',
  )
  if (fs.existsSync(cacheRoot)) {
    for (const entry of fs.readdirSync(cacheRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.startsWith('nsis-')) continue
      const nsisRoot = path.join(cacheRoot, entry.name)
      for (const child of fs.readdirSync(nsisRoot, { withFileTypes: true })) {
        if (!child.isDirectory()) continue
        candidates.push(path.join(nsisRoot, child.name, 'makensis.exe'))
        candidates.push(path.join(nsisRoot, child.name, 'Bin', 'makensis.exe'))
      }
    }
  }

  return candidates.find((candidate) => fs.existsSync(candidate))
}

if (!fs.existsSync(path.join(APP_DIR, 'GalFlow.exe'))) {
  console.error(
    '未找到 release/GalFlow-win32-x64/GalFlow.exe。请先运行 npm run desktop:build。',
  )
  process.exit(1)
}

const makensis = findMakensis()
if (!makensis) {
  console.error(
    '未找到 makensis.exe。请先运行 npm run desktop:pack:portable，或通过 MAKENSIS_PATH 指定 NSIS。',
  )
  process.exit(1)
}

if (fs.existsSync(INSTALLER_PATH)) {
  fs.rmSync(INSTALLER_PATH, { force: true })
}

console.log(`Using NSIS: ${makensis}`)
const result = spawnSync(
  makensis,
  ['/INPUTCHARSET', 'UTF8', `/DROOT=${ROOT}`, 'build/installer.nsi'],
  {
    cwd: ROOT,
    stdio: 'inherit',
  },
)

if (result.error) {
  console.error(result.error)
  process.exit(1)
}
if (result.status !== 0) {
  process.exit(result.status ?? 1)
}

const sizeMb = fs.statSync(INSTALLER_PATH).size / 1024 / 1024
console.log(
  `Installer created: ${INSTALLER_PATH} (${sizeMb.toFixed(1)} MB)`,
)
