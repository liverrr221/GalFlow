import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

const APP_URL = process.env.APP_URL ?? 'http://127.0.0.1:5173/'
const ARTIFACTS_DIR = path.resolve('.artifacts')

const browserCandidates = [
  process.env.BROWSER_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean)

const executablePath = browserCandidates.find((candidate) =>
  fs.existsSync(candidate),
)

if (!executablePath) {
  console.error('未找到 Edge/Chrome。请通过 BROWSER_PATH 指定浏览器路径。')
  process.exit(1)
}

fs.mkdirSync(ARTIFACTS_DIR, { recursive: true })

const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ['--disable-gpu'],
})

const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
})

const pageErrors = []
page.on('pageerror', (error) => pageErrors.push(error.message))
page.on('console', (message) => {
  if (message.type() === 'error') {
    console.warn(`[browser console] ${message.text()}`)
  }
})

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

try {
  console.log(`Opening ${APP_URL}`)
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' })
  await page.locator('.react-flow').waitFor({ timeout: 15_000 })
  await page.locator('.scene-node').first().waitFor({ timeout: 10_000 })
  assert(
    (await page.locator('.scene-node').count()) === 4,
    '示例剧情应包含 4 个剧情块',
  )
  assert(
    (await page.locator('.choice-node').count()) === 1,
    '示例剧情应包含 1 个选项节点',
  )

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, '01-canvas.png'),
    fullPage: true,
  })

  // Select a scene → the inspector appears only after selection.
  await page.locator('.scene-node').first().click()
  await page.locator('.inspector').waitFor()
  await page.waitForTimeout(120)
  assert(
    (await page.locator('.inspector').innerText()).includes('剧情文本'),
    '右侧检查器应显示剧情文本编辑器',
  )
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, '02-inspector.png'),
    fullPage: true,
  })

  // Double click opens the full screen editor.
  await page.locator('.scene-node').first().dblclick()
  await page.locator('.fullscreen-editor').waitFor()
  await page.locator('.rich-editor--fullscreen .rich-editor__content').waitFor()
  await page.waitForTimeout(120)
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, '03-fullscreen.png'),
    fullPage: true,
  })

  // Editing works and is reflected in the scene's word count.
  const fullscreenEditor = page.locator(
    '.rich-editor--fullscreen .rich-editor__content',
  )
  await fullscreenEditor.click()
  await page.keyboard.press('Control+End')
  await page.keyboard.type(' 这是自动化验收写入的一行。')
  assert(
    (await fullscreenEditor.innerText()).includes('这是自动化验收写入的一行'),
    '全屏编辑器应能接收输入',
  )

  // Escape collapses back to the sidebar, not to a blank canvas.
  await page.keyboard.press('Escape')
  await page.locator('.fullscreen-editor').waitFor({ state: 'detached' })
  await page.locator('.inspector').waitFor()

  // Add a choice node from the toolbar and extend its options.
  await page.locator('.topbar__add', { hasText: '选项节点' }).click()
  await page.locator('.inspector').waitFor()
  assert(
    (await page.locator('.inspector').innerText()).includes('CHOICE · 选项节点'),
    '新建选项节点后检查器应切换到选项模式',
  )
  assert(
    (await page.locator('.option-editor').count()) === 2,
    '新选项节点应默认带两个选项',
  )
  await page.getByRole('button', { name: '添加选项' }).click()
  assert(
    (await page.locator('.option-editor').count()) === 3,
    '添加选项后应出现第三个选项',
  )
  await page.waitForTimeout(120)
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, '04-choice-inspector.png'),
    fullPage: true,
  })

  // Drag one option handle to a scene's input handle to create a real edge.
  const beforeEdgeCount = await page.locator('.react-flow__edge').count()
  const sourceHandle = page
    .locator('.choice-node')
    .last()
    .locator('.choice-option')
    .last()
    .locator('.story-handle--option')
  const targetHandle = page
    .locator('.scene-node')
    .first()
    .locator('.story-handle--target')
  const sourceBox = await sourceHandle.boundingBox()
  const targetBox = await targetHandle.boundingBox()
  assert(Boolean(sourceBox && targetBox), '应能找到选项连接点与目标连接点')

  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2,
  )
  await page.mouse.down()
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height / 2,
    { steps: 12 },
  )
  await page.mouse.up()
  await page.waitForTimeout(250)

  const afterEdgeCount = await page.locator('.react-flow__edge').count()
  assert(
    afterEdgeCount === beforeEdgeCount + 1,
    '拖拽连线后应新增一条边',
  )
  assert(
    (await page.locator('.inspector').innerText()).includes('1/3 已连接'),
    '选项检查器应显示已有 1 条连接',
  )

  // Export is generated on demand and includes the graph structure.
  await page.getByRole('button', { name: /导出文本/ }).click()
  await page.locator('.export-dialog').waitFor()
  const exportText = await page.locator('.export-dialog pre').innerText()
  assert(exportText.includes('一、剧情流程'), '导出文本应包含流程大纲')
  assert(
    exportText.includes('二、场景、选项与条件正文'),
    '导出文本应包含正文清单',
  )
  assert(exportText.includes('三、结局与待补全'), '导出文本应包含结局清单')
  assert(exportText.includes('选项 C'), '导出文本应包含新增的选项')
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'export.txt'), exportText, 'utf8')
  await page.waitForTimeout(120)
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, '05-export.png'),
    fullPage: true,
  })

  await page.getByRole('button', { name: '关闭导出窗' }).click()
  await page.locator('.export-dialog').waitFor({ state: 'detached' })

  // Closing the inspector leaves only the canvas.
  await page.getByRole('button', { name: '关闭编辑栏' }).click()
  await page.locator('.inspector').waitFor({ state: 'detached' })

  assert(pageErrors.length === 0, `页面运行错误：${pageErrors.join(' | ')}`)

  console.log('Smoke test passed. Screenshots saved to .artifacts/.')
} catch (error) {
  console.error('Smoke test failed:', error)
  await page
    .screenshot({
      path: path.join(ARTIFACTS_DIR, 'failure.png'),
      fullPage: true,
    })
    .catch(() => {})
  process.exitCode = 1
} finally {
  await browser.close()
}
