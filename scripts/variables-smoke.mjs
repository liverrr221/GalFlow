import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

const APP_URL = process.env.APP_URL ?? 'http://127.0.0.1:5173/'
const ARTIFACTS = path.resolve('.artifacts', 'variables')
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
  acceptDownloads: true,
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

  // Variable management.
  await page.getByRole('button', { name: '变量管理' }).click()
  await page.locator('.variables-dialog').waitFor()
  assert(
    (await page.locator('.variable-card').count()) === 2,
    '示例剧情应带两个变量',
  )
  await page.getByRole('button', { name: '新建数值变量' }).click()
  assert(
    (await page.locator('.variable-card').count()) === 3,
    '新建变量后应出现第三张变量卡',
  )

  const newCard = page.locator('.variable-card').last()
  await newCard.locator('.variable-field--name input').fill('勇气')
  await newCard.locator('.variable-field--initial input').fill('3')
  await newCard
    .locator('.variable-field--description input')
    .fill('面对危险时的勇气')
  await page.screenshot({
    path: path.join(ARTIFACTS, 'variables-dialog.png'),
    fullPage: true,
  })
  await page.getByRole('button', { name: '关闭变量管理' }).click()
  await page.locator('.variables-dialog').waitFor({ state: 'detached' })

  // Existing sample choice should expose its option effects.
  await page.locator('.choice-node').click()
  await page.locator('.inspector').waitFor()
  assert(
    (await page.locator('.option-editor__effects').count()) === 2,
    '两个示例选项都应显示变量变化区域',
  )
  assert(
    (await page.locator('.option-editor__effects').first().innerText()).includes(
      '好感度',
    ),
    '示例选项效果应引用好感度变量',
  )
  const firstOption = page.locator('.option-editor').first()
  const effectCountBefore = await firstOption.locator('.effect-row').count()
  await firstOption.locator('.effects-editor__add').click()
  assert(
    (await firstOption.locator('.effect-row').count()) ===
      effectCountBefore + 1,
    '点击添加变量变化后应新增一行效果',
  )
  await page.screenshot({
    path: path.join(ARTIFACTS, 'choice-effects.png'),
    fullPage: true,
  })

  // Add a condition node and inspect its rules.
  await page.locator('.topbar__add', { hasText: '条件' }).click()
  await page.locator('.condition-node').waitFor()
  await page.locator('.inspector').waitFor()
  assert(
    (await page.locator('.inspector').innerText()).includes(
      'CONDITION · 条件节点',
    ),
    '添加条件节点后应显示条件检查器',
  )
  assert(
    (await page.locator('.condition-editor').count()) === 1,
    '条件节点应默认带一条规则',
  )

  await page.getByRole('button', { name: '添加条件规则' }).click()
  assert(
    (await page.locator('.condition-editor').count()) === 2,
    '添加后应有两条条件规则',
  )
  await page.getByLabel('规则 2 变量').selectOption({ label: '收下书签' })
  assert(
    (await page.getByLabel('规则 2 值').inputValue()) === 'true',
    '切换到开关变量后应显示布尔值选择',
  )
  await page.getByLabel('规则 2 值').selectOption('false')

  // Connect the first condition branch to a scene.
  const edgeCountBefore = await page.locator('.react-flow__edge').count()
  const sourceHandle = page
    .locator('.condition-node')
    .first()
    .locator('.condition-case')
    .first()
    .locator('.story-handle--condition')
  const targetHandle = page
    .locator('.scene-node')
    .first()
    .locator('.story-handle--target')
  const sourceBox = await sourceHandle.boundingBox()
  const targetBox = await targetHandle.boundingBox()
  assert(Boolean(sourceBox && targetBox), '找不到条件分支连接点')

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
  await page.waitForTimeout(300)
  assert(
    (await page.locator('.react-flow__edge').count()) === edgeCountBefore + 1,
    '连接条件分支后应增加一条连线',
  )
  assert(
    (await page.locator('.condition-editor__connection.is-connected').count()) >
      0,
    '条件检查器应显示已连接状态',
  )

  await page.screenshot({
    path: path.join(ARTIFACTS, 'condition-inspector.png'),
    fullPage: true,
  })

  // The PNG renderer must also include condition nodes.
  await page.getByRole('button', { name: '分享', exact: true }).click()
  await page.locator('.share-dialog').waitFor()
  const [imageDownload] = await Promise.all([
    page.waitForEvent('download', { timeout: 60_000 }),
    page.getByRole('button', { name: '生成并下载图片' }).click(),
  ])
  const imagePath = await imageDownload.path()
  assert(Boolean(imagePath), '条件分支图片没有下载路径')
  const imageSize = fs.statSync(imagePath).size
  assert(imageSize > 10_000, '包含条件节点的导出图片过小')
  fs.copyFileSync(imagePath, path.join(ARTIFACTS, 'condition-image.png'))
  await page.getByRole('button', { name: '关闭分享窗' }).click()
  await page.locator('.share-dialog').waitFor({ state: 'detached' })

  // Text export should document the variable definitions and condition rules.
  await page.getByRole('button', { name: /导出文本/ }).click()
  await page.locator('.export-dialog').waitFor()
  const exported = await page.locator('.export-dialog pre').innerText()
  assert(exported.includes('变量设定'), '导出文本应包含变量设定')
  assert(exported.includes('好感度'), '导出文本应包含好感度变量')
  assert(exported.includes('勇气'), '导出文本应包含新增变量')
  assert(exported.includes('判断顺序'), '导出文本应包含条件判断顺序')
  assert(exported.includes('否则'), '导出文本应包含否则分支')
  assert(exported.includes('收下书签 = 否'), '导出文本应包含开关变量条件')
  await page.screenshot({
    path: path.join(ARTIFACTS, 'variables-export.png'),
    fullPage: true,
  })
  await page.getByRole('button', { name: '关闭导出窗' }).click()

  // Old persisted projects (v1, no variables/effects) must migrate safely.
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
          title: '旧版剧情',
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
              },
            },
          ],
          edges: [],
        },
        version: 1,
      }),
    )
  })
  await legacyPage.goto(APP_URL, { waitUntil: 'domcontentloaded' })
  await legacyPage.locator('.scene-node').waitFor()
  assert(
    (await legacyPage.locator('.story-title__input').inputValue()) ===
      '旧版剧情',
    '旧版数据迁移后标题应保留',
  )
  await legacyPage.locator('.scene-node').click()
  await legacyPage.locator('.inspector').waitFor()
  assert(
    (await legacyPage.locator('.effects-editor__empty').innerText()).includes(
      '还没有变量',
    ),
    '旧版场景迁移后应补上空变量效果',
  )
  await legacyPage.getByRole('button', { name: '变量管理' }).click()
  await legacyPage.locator('.variables-dialog').waitFor()
  assert(
    (await legacyPage.locator('.variable-card').count()) === 0,
    '旧版工程迁移后变量列表应为空',
  )
  await legacyContext.close()

  assert(pageErrors.length === 0, `页面运行错误：${pageErrors.join(' | ')}`)
  console.log('Variables smoke test passed.')
  console.log(`Screenshots: ${ARTIFACTS}`)
} catch (error) {
  console.error('Variables smoke test failed:', error)
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
