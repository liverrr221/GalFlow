import fs from 'node:fs'
import path from 'node:path'
import { packager } from '@electron/packager'

const ROOT = process.cwd()
const STAGING = path.join(ROOT, '.artifacts', 'desktop-staging')
const RELEASE = path.join(ROOT, 'release')
const ICON = path.join(ROOT, 'build', 'icon.ico')

const rootPackage = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'),
)
const electronPackage = JSON.parse(
  fs.readFileSync(
    path.join(ROOT, 'node_modules', 'electron', 'package.json'),
    'utf8',
  ),
)

function copyDir(from, to) {
  fs.cpSync(from, to, { recursive: true, force: true })
}

if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) {
  console.error('缺少 dist/index.html，请先运行 npm run build。')
  process.exit(1)
}

fs.rmSync(STAGING, { recursive: true, force: true })
fs.mkdirSync(STAGING, { recursive: true })

copyDir(path.join(ROOT, 'dist'), path.join(STAGING, 'dist'))
copyDir(path.join(ROOT, 'electron'), path.join(STAGING, 'electron'))

fs.writeFileSync(
  path.join(STAGING, 'package.json'),
  `${JSON.stringify(
    {
      name: 'galflow',
      productName: 'GalFlow',
      version: rootPackage.version,
      description: rootPackage.description,
      author: 'GalFlow',
      main: 'electron/main.cjs',
    },
    null,
    2,
  )}\n`,
)

fs.mkdirSync(RELEASE, { recursive: true })

const outputPaths = await packager({
  dir: STAGING,
  out: RELEASE,
  name: 'GalFlow',
  executableName: 'GalFlow',
  electronVersion: electronPackage.version,
  platform: 'win32',
  arch: 'x64',
  icon: ICON,
  appVersion: rootPackage.version,
  buildVersion: rootPackage.version,
  appCopyright: 'Copyright © 2026 GalFlow',
  asar: true,
  overwrite: true,
  prune: false,
  extraResource: [ICON],
  win32metadata: {
    CompanyName: 'GalFlow',
    FileDescription: 'GalFlow 剧情流程工作台',
    ProductName: 'GalFlow',
    InternalName: 'GalFlow',
    OriginalFilename: 'GalFlow.exe',
  },
  quiet: false,
})

console.log('Desktop app built:')
outputPaths.forEach((outputPath) => console.log(`  ${outputPath}`))
