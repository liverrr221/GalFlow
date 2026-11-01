import fs from 'node:fs'
import path from 'node:path'
import { _electron as electron } from 'playwright-core'

const ROOT = process.cwd()
const ARTIFACTS = path.join(ROOT, '.artifacts')
const USER_DATA = path.join(ARTIFACTS, 'electron-user-data')
const DOWNLOAD_DIR = path.join(ARTIFACTS, 'electron-downloads')
const electronPath = path.join(
  ROOT,
  'node_modules',
  'electron',
  'dist',
  'electron.exe',
)

fs.mkdirSync(ARTIFACTS, { recursive: true })
fs.rmSync(USER_DATA, { recursive: true, force: true })
fs.rmSync(DOWNLOAD_DIR, { recursive: true, force: true })
fs.mkdirSync(DOWNLOAD_DIR, { recursive: true })

const waitForFile = async (extension, timeout = 30_000) => {
  const started = Date.now()
  while (Date.now() - started < timeout) {
    const match = fs
      .readdirSync(DOWNLOAD_DIR)
      .find((name) => name.endsWith(extension))
    if (match) {
      const fullPath = path.join(DOWNLOAD_DIR, match)
      if (fs.statSync(fullPath).size > 0) return fullPath
    }
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  throw new Error(`下载目录中没有找到 ${extension} 文件`)
}

if (!fs.existsSync(electronPath)) {
  console.error(`Electron executable not found: ${electronPath}`)
  process.exit(1)
}

const launchEnv = { ...process.env, GALFLOW_USER_DATA: USER_DATA }
launchEnv.GALFLOW_DOWNLOAD_DIR = DOWNLOAD_DIR
delete launchEnv.ELECTRON_RUN_AS_NODE

const app = await electron.launch({
  executablePath: electronPath,
  args: ['.', '--no-sandbox'],
  cwd: ROOT,
  env: launchEnv,
  timeout: 60_000,
})

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

try {
  const window = await app.firstWindow({ timeout: 30_000 })
  await window.waitForLoadState('domcontentloaded')
  await window.locator('.react-flow').waitFor({ timeout: 20_000 })
  await window.waitForTimeout(400)

  assert(
    (await window.title()).includes('GalFlow'),
    `独立窗口标题不正确：${await window.title()}`,
  )

  const desktopInfo = await window.evaluate(() => window.galflowDesktop)
  assert(desktopInfo?.isDesktop === true, 'preload 未注入桌面环境标识')
  assert(
    (await window.locator('.desktop-badge').innerText()) === '桌面版',
    '桌面版标识没有显示',
  )

  assert(
    (await window.locator('.scene-node').count()) === 4,
    '桌面窗口没有正确加载示例剧情',
  )

  await window.locator('.scene-node').first().click()
  await window.locator('.inspector').waitFor()
  assert(
    (await window.locator('.inspector').innerText()).includes('剧情文本'),
    '桌面窗口的右侧检查器未出现',
  )

  await window.waitForTimeout(200)
  await window.screenshot({
    path: path.join(ARTIFACTS, 'desktop-window.png'),
    fullPage: true,
  })

  // Variable manager is available in the desktop build too.
  await window.getByRole('button', { name: '变量管理' }).click()
  await window.locator('.variables-dialog').waitFor()
  assert(
    (await window.locator('.variable-card').count()) === 2,
    '桌面版示例剧情应包含两个变量',
  )
  await window.getByRole('button', { name: '关闭变量管理' }).click()
  await window.locator('.variables-dialog').waitFor({ state: 'detached' })

  // Verify sharing works inside the packaged Electron environment.
  await window.getByRole('button', { name: '分享', exact: true }).click()
  await window.locator('.share-dialog').waitFor()
  await window.getByRole('button', { name: '导出工程' }).click()
  await waitForFile('.galflow.json')

  await window.getByRole('button', { name: '生成并下载图片' }).click()
  await window
    .locator('.share-dialog__notice.is-success')
    .waitFor({ timeout: 60_000 })
  await waitForFile('.png', 60_000)

  await window.waitForTimeout(200)
  await window.screenshot({
    path: path.join(ARTIFACTS, 'desktop-share.png'),
    fullPage: true,
  })
  await window.getByRole('button', { name: '关闭分享窗' }).click()
  await window.locator('.share-dialog').waitFor({ state: 'detached' })

  // Canvas management also works in the packaged desktop app.
  await window.getByRole('button', { name: '新增画布' }).click()
  await window.waitForTimeout(250)
  assert(
    (await window.locator('.story-title__input').inputValue()) ===
      '未命名剧情 2',
    '桌面版新增画布后应切换为空白画布',
  )
  assert(
    (await window.locator('.scene-node').count()) === 0,
    '桌面版新画布应为空',
  )
  await window.getByRole('button', { name: '切换画布' }).click()
  await window
    .locator('.canvas-switcher__item', { hasText: '黄昏来信' })
    .locator('.canvas-switcher__item-main')
    .click()
  await window.waitForTimeout(250)
  assert(
    (await window.locator('.scene-node').count()) === 4,
    '桌面版切换画布后应恢复原内容',
  )

  console.log(`Electron desktop window OK (Electron ${desktopInfo.electronVersion})`)
  console.log(`Screenshot: ${path.join(ARTIFACTS, 'desktop-window.png')}`)
} catch (error) {
  console.error('Electron smoke test failed:', error)
  process.exitCode = 1
} finally {
  await app.close()
}
