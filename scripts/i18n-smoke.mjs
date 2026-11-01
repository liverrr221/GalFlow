import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

const APP_URL = process.env.APP_URL ?? 'http://127.0.0.1:5173/'
const ARTIFACTS = path.resolve('.artifacts', 'i18n')
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
  await page.locator('.scene-node').first().waitFor()

  // Switch the UI to English from the settings menu.
  await page.getByRole('button', { name: '更多操作' }).click()
  await page.locator('.language-switch').waitFor()
  await page.screenshot({
    path: path.join(ARTIFACTS, 'language-menu-zh.png'),
    fullPage: true,
  })
  await page.getByRole('button', { name: 'English' }).click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)

  assert(
    (await page.locator('.brand__text small').innerText()) ===
      'Story Flow Workbench',
    '切换到 English 后副标题应更新',
  )
  assert(
    (await page.locator('html').getAttribute('lang')) === 'en',
    '英文界面应更新 html lang',
  )
  for (const name of [
    'Scene',
    'Choice',
    'Condition',
    'Share',
    'Export Text',
  ]) {
    assert(
      (await page.getByRole('button', { name, exact: true }).count()) > 0,
      `英文顶栏缺少按钮：${name}`,
    )
  }
  assert(
    (await page.getByRole('button', { name: 'Manage variables' }).count()) > 0,
    '英文顶栏缺少变量按钮',
  )
  assert(
    (await page.locator('.canvas-status').innerText()).includes('Autosaved'),
    '英文画布状态应显示 Autosaved',
  )

  await page.locator('.scene-node').first().click()
  await page.locator('.inspector').waitFor()
  const inspectorText = await page.locator('.inspector').innerText()
  assert(inspectorText.includes('SCENE · Scene'), '检查器标题未翻译')
  assert(inspectorText.includes('Scene title'), '场景标题未翻译')
  assert(inspectorText.includes('Scene text'), '剧情文本未翻译')
  assert(inspectorText.includes('Variable changes'), '变量变化未翻译')
  assert(inspectorText.includes('Delete this scene'), '删除按钮未翻译')
  await page.screenshot({
    path: path.join(ARTIFACTS, 'en-inspector.png'),
    fullPage: true,
  })

  await page.locator('.choice-node').click()
  await page.locator('.inspector').waitFor()
  const choiceInspectorText = await page.locator('.inspector').innerText()
  assert(
    choiceInspectorText.includes('CHOICE · Choice'),
    '选项检查器标题未翻译',
  )
  assert(choiceInspectorText.includes('Options'), '选项列表未翻译')
  assert(
    choiceInspectorText.includes('Variable changes after selection'),
    '选项变量变化未翻译',
  )

  await page.locator('.topbar__add', { hasText: 'Condition' }).click()
  await page.waitForTimeout(200)
  const conditionInspectorText = await page.locator('.inspector').innerText()
  assert(
    conditionInspectorText.includes('CONDITION · Condition'),
    '条件检查器标题未翻译',
  )
  assert(
    conditionInspectorText.includes('Condition rules'),
    '条件规则未翻译',
  )
  assert(
    conditionInspectorText.includes('Add condition rule'),
    '添加条件规则按钮未翻译',
  )

  // New nodes created in English should receive English default titles.
  await page.locator('.topbar__add', { hasText: 'Scene' }).click()
  await page.waitForTimeout(200)
  const titleInput = page
    .locator('.inspector input.text-input--title')
    .first()
  assert(
    (await titleInput.inputValue()) === 'Scene 5',
    '英文模式新建场景应使用英文默认标题',
  )

  await page.getByRole('button', { name: 'Manage variables' }).click()
  await page.locator('.variables-dialog').waitFor()
  assert(
    (await page.locator('.variables-dialog').innerText()).includes('Variables'),
    '变量管理标题未翻译',
  )
  assert(
    (await page.getByRole('button', { name: 'New number variable' }).count()) >
      0,
    '变量管理按钮未翻译',
  )
  await page.getByRole('button', { name: 'Close variable manager' }).click()

  await page.getByRole('button', { name: 'Share', exact: true }).click()
  await page.locator('.share-dialog').waitFor()
  const shareText = await page.locator('.share-dialog').innerText()
  assert(shareText.includes('Share Story'), '分享窗口标题未翻译')
  assert(shareText.includes('Flowchart image'), '流程图卡片未翻译')
  assert(shareText.includes('Project file'), '工程文件卡片未翻译')
  assert(shareText.includes('Plain-text script'), '文本卡片未翻译')
  await page.getByRole('button', { name: 'Close share dialog' }).click()

  await page.getByRole('button', { name: 'Export Text' }).click()
  await page.locator('.export-dialog').waitFor()
  const exported = await page.locator('.export-dialog pre').innerText()
  assert(exported.includes('1. Story Flow'), '英文导出缺少流程大纲标题')
  assert(
    exported.includes('2. Scenes, Choices, and Conditions'),
    '英文导出缺少正文标题',
  )
  assert(exported.includes('Variables'), '英文导出缺少变量设定')
  assert(
    (await page.locator('.export-dialog').innerText()).includes(
      'Export Story Text',
    ),
    '导出窗口标题未翻译',
  )
  await page.screenshot({
    path: path.join(ARTIFACTS, 'en-export.png'),
    fullPage: true,
  })
  await page.getByRole('button', { name: 'Close export dialog' }).click()

  // Language choice should survive a reload.
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.locator('.scene-node').first().waitFor()
  assert(
    (await page.locator('.brand__text small').innerText()) ===
      'Story Flow Workbench',
    '刷新后应保留 English',
  )

  await page.getByRole('button', { name: 'More actions' }).click()
  await page.getByRole('button', { name: '中文' }).click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
  assert(
    (await page.locator('.brand__text small').innerText()) ===
      '剧情流程工作台',
    '切回中文后副标题应恢复',
  )
  assert(
    (await page.getByRole('button', { name: '导出文本' }).count()) > 0,
    '切回中文后顶栏按钮应恢复中文',
  )
  await page.screenshot({
    path: path.join(ARTIFACTS, 'zh-after-switch.png'),
    fullPage: true,
  })

  assert(pageErrors.length === 0, `页面运行错误：${pageErrors.join(' | ')}`)
  console.log('i18n smoke test passed.')
  console.log(`Screenshots: ${ARTIFACTS}`)
} catch (error) {
  console.error('i18n smoke test failed:', error)
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
