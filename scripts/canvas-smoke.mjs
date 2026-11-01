import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

const APP_URL = process.env.APP_URL ?? 'http://127.0.0.1:5173/'
const ARTIFACTS = path.resolve('.artifacts', 'canvases')
const candidates = [
  process.env.BROWSER_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean)
const executablePath = candidates.find((candidate) =>
  fs.existsSync(candidate),
)

if (!executablePath) {
  console.error('未找到 Edge/Chrome。请通过 BROWSER_PATH 指定浏览器路径。')
  process.exit(1)
}

fs.mkdirSync(ARTIFACTS, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath })
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: 'reduce',
})
const pageErrors = []
page.on('pageerror', (error) => pageErrors.push(error.message))

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

try {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' })
  await page.locator('.react-flow').waitFor()
  await page.locator('.scene-node').first().waitFor()

  assert(
    (await page.locator('.canvas-switcher__count').innerText()) === '1',
    '初始状态应只有一个画布',
  )

  // Create a second, independent canvas.
  await page.getByRole('button', { name: '新增画布' }).click()
  await page.waitForTimeout(250)
  assert(
    (await page.locator('.story-title__input').inputValue()) ===
      '未命名剧情 2',
    '新建画布应拥有独立标题',
  )
  assert(
    (await page.locator('.scene-node').count()) === 0,
    '新建画布应该是空白的',
  )
  await page.locator('.canvas-empty__card').waitFor()
  await page.getByRole('button', { name: /新建剧情块/ }).click()
  await page.waitForTimeout(200)
  assert(
    (await page.locator('.scene-node').count()) === 1,
    '新画布应能独立添加节点',
  )
  await page.locator('.story-title__input').fill('支线画布')

  await page.getByRole('button', { name: '切换画布' }).click()
  await page.locator('.canvas-switcher__menu').waitFor()
  assert(
    (await page.locator('.canvas-switcher__item').count()) === 2,
    '画布菜单应显示两个画布',
  )
  await page.screenshot({
    path: path.join(ARTIFACTS, 'canvas-menu.png'),
    fullPage: true,
  })

  // Switch back to the original canvas.
  await page
    .locator('.canvas-switcher__item', { hasText: '黄昏来信' })
    .locator('.canvas-switcher__item-main')
    .click()
  await page.waitForTimeout(250)
  assert(
    (await page.locator('.story-title__input').inputValue()) === '黄昏来信',
    '切换后应恢复第一个画布的标题',
  )
  assert(
    (await page.locator('.scene-node').count()) === 4,
    '切换后应恢复第一个画布的节点',
  )

  // Reload and make sure both canvases persist.
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.locator('.scene-node').first().waitFor()
  await page.waitForTimeout(250)
  assert(
    (await page.locator('.story-title__input').inputValue()) === '黄昏来信',
    '刷新后应停留在最后使用的画布',
  )
  await page.getByRole('button', { name: '切换画布' }).click()
  assert(
    (await page.locator('.canvas-switcher__item').count()) === 2,
    '刷新后画布列表应保留',
  )
  assert(
    (await page.locator('.canvas-switcher__item').nth(1).innerText()).includes(
      '支线画布',
    ),
    '刷新后第二个画布应保留',
  )

  // Deleting the active canvas should switch to the other one.
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '删除画布 黄昏来信' }).click()
  await page.waitForTimeout(250)
  assert(
    (await page.locator('.story-title__input').inputValue()) === '支线画布',
    '删除当前画布后应切换到另一个画布',
  )
  assert(
    (await page.locator('.scene-node').count()) === 1,
    '删除当前画布后应显示目标画布内容',
  )
  assert(
    (await page.locator('.canvas-switcher__count').innerText()) === '1',
    '删除后应只剩一个画布',
  )
  await page.screenshot({
    path: path.join(ARTIFACTS, 'canvas-after-delete.png'),
    fullPage: true,
  })

  // Old single-canvas persisted data must become canvas #1.
  const legacyContext = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
  })
  const legacyPage = await legacyContext.newPage()
  await legacyPage.addInitScript(() => {
    localStorage.setItem(
      'galflow:story:v1',
      JSON.stringify({
        state: {
          title: '旧版画布',
          variables: [],
          nodes: [
            {
              id: 'legacy-scene',
              type: 'scene',
              position: { x: 100, y: 100 },
              data: {
                kind: 'scene',
                title: '旧场景',
                content: '<p>旧版本内容</p>',
                fontSize: 18,
                effects: [],
              },
            },
          ],
          edges: [],
        },
        version: 2,
      }),
    )
  })
  await legacyPage.goto(APP_URL, { waitUntil: 'domcontentloaded' })
  await legacyPage.locator('.scene-node').waitFor()
  assert(
    (await legacyPage.locator('.canvas-switcher__count').innerText()) === '1',
    '旧版数据迁移后应显示一个画布',
  )
  assert(
    (await legacyPage.locator('.story-title__input').inputValue()) ===
      '旧版画布',
    '旧版画布标题应保留',
  )
  await legacyContext.close()

  assert(pageErrors.length === 0, `页面运行错误：${pageErrors.join(' | ')}`)
  console.log('Canvas smoke test passed.')
  console.log(`Screenshots: ${ARTIFACTS}`)
} catch (error) {
  console.error('Canvas smoke test failed:', error)
  await page
    .screenshot({
      path: path.join(ARTIFACTS, 'failure.png'),
      fullPage: true,
    })
    .catch(() => {})
  process.exitCode = 1
} finally {
  await browser.close()
}
