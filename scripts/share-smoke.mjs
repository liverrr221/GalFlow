import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

const APP_URL = process.env.APP_URL ?? 'http://127.0.0.1:5173/'
const ARTIFACTS = path.resolve('.artifacts', 'share')
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
const readDownload = async (download) => {
  const filePath = await download.path()
  assert(Boolean(filePath), '下载文件没有本地路径')
  return filePath
}

try {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' })
  await page.locator('.react-flow').waitFor()
  await page.locator('.scene-node').first().waitFor()

  await page.getByRole('button', { name: '分享', exact: true }).click()
  await page.locator('.share-dialog').waitFor()
  assert(
    (await page.locator('.share-card').count()) === 3,
    '分享窗口应包含图片、工程、文本三种方式',
  )
  await page.screenshot({
    path: path.join(ARTIFACTS, 'share-dialog.png'),
    fullPage: true,
  })

  // Export project JSON.
  const [projectDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '导出工程' }).click(),
  ])
  const projectPath = await readDownload(projectDownload)
  const projectText = fs.readFileSync(projectPath, 'utf8')
  const project = JSON.parse(projectText)
  assert(project.format === 'galflow-project', '工程文件格式标记不正确')
  assert(project.version === 2, '工程文件版本应为 v2')
  assert(project.variables.length === 2, '工程文件应包含两个变量')
  assert(project.nodes.length === 5, '工程文件应包含 5 个节点')
  assert(project.edges.length === 5, '工程文件应包含 5 条连线')
  assert(
    projectDownload.suggestedFilename().endsWith('.galflow.json'),
    '工程文件扩展名应正确',
  )

  // Export a full graph PNG.
  const [imageDownload] = await Promise.all([
    page.waitForEvent('download', { timeout: 60_000 }),
    page.getByRole('button', { name: '生成并下载图片' }).click(),
  ])
  const imagePath = await readDownload(imageDownload)
  const imageBuffer = fs.readFileSync(imagePath)
  fs.copyFileSync(imagePath, path.join(ARTIFACTS, 'flow-image.png'))
  assert(imageBuffer.length > 10_000, '导出的 PNG 图片过小')
  assert(
    imageBuffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ),
    '导出的文件不是有效 PNG',
  )
  assert(
    imageDownload.suggestedFilename().endsWith('.png'),
    '图片扩展名应正确',
  )
  await page.waitForTimeout(200)
  await page.screenshot({
    path: path.join(ARTIFACTS, 'share-complete.png'),
    fullPage: true,
  })

  // Import a small project file and replace the current canvas.
  const importPath = path.join(ARTIFACTS, 'import-test.galflow.json')
  const importedProject = {
    format: 'galflow-project',
    version: 1,
    title: '分享测试',
    nodes: [
      {
        id: 'imported-scene-1',
        type: 'scene',
        position: { x: 160, y: 160 },
        data: {
          kind: 'scene',
          title: '导入的场景',
          content: '<p>这段内容来自工程文件。</p>',
          fontSize: 18,
        },
      },
    ],
    edges: [],
  }
  fs.writeFileSync(importPath, JSON.stringify(importedProject), 'utf8')

  page.once('dialog', (dialog) => dialog.accept())
  await page.locator('.share-dialog input[type="file"]').setInputFiles(importPath)
  await page
    .locator('.share-dialog__notice.is-success')
    .waitFor({ timeout: 10_000 })
  assert(
    (await page.locator('.share-dialog__notice').innerText()).includes(
      '导入成功',
    ),
    '导入成功后应显示提示',
  )
  assert(
    (await page.locator('.scene-node').count()) === 1,
    '导入后画布应替换为 1 个场景节点',
  )
  assert(
    (await page.locator('.story-title__input').inputValue()) === '分享测试',
    '导入后标题应更新',
  )
  await page.waitForTimeout(300)
  await page.screenshot({
    path: path.join(ARTIFACTS, 'share-imported.png'),
    fullPage: true,
  })

  await page.getByRole('button', { name: '关闭分享窗' }).click()
  await page.locator('.share-dialog').waitFor({ state: 'detached' })

  assert(pageErrors.length === 0, `页面运行错误：${pageErrors.join(' | ')}`)
  console.log('Share smoke test passed.')
  console.log(`Screenshots: ${ARTIFACTS}`)
} catch (error) {
  console.error('Share smoke test failed:', error)
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
