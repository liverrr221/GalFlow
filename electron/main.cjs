const {
  app,
  BrowserWindow,
  Menu,
  dialog,
  ipcMain,
  shell,
  session,
} = require('electron')
const path = require('node:path')
const fs = require('node:fs')

const APP_ID = 'com.galflow.desktop'
const DEV_SERVER_URL = process.env.GALFLOW_DEV_SERVER_URL || ''
const SAVE_CHANNEL = 'galflow:save-file'

app.setName('GalFlow')
app.setAppUserModelId(APP_ID)

if (process.env.GALFLOW_USER_DATA) {
  app.setPath('userData', path.resolve(process.env.GALFLOW_USER_DATA))
}

let mainWindow = null

function getIconPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'icon.ico')
  }

  return path.join(__dirname, '..', 'build', 'icon.ico')
}

function registerSaveFileHandler() {
  ipcMain.handle(SAVE_CHANNEL, async (event, options) => {
    if (!options || typeof options !== 'object') {
      throw new Error('无效的保存请求')
    }

    const { filename, kind, content } = options
    if (
      typeof filename !== 'string' ||
      !['text', 'png'].includes(kind) ||
      typeof content !== 'string'
    ) {
      throw new Error('无效的保存参数')
    }
    if (content.length > 60 * 1024 * 1024) {
      throw new Error('文件过大，无法保存')
    }

    const safeName =
      path
        .basename(filename)
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
        .slice(0, 120) || 'GalFlow-file'

    const defaultDir = process.env.GALFLOW_DOWNLOAD_DIR
      ? path.resolve(process.env.GALFLOW_DOWNLOAD_DIR)
      : app.getPath('downloads')
    fs.mkdirSync(defaultDir, { recursive: true })

    let targetPath

    if (process.env.GALFLOW_DOWNLOAD_DIR) {
      targetPath = path.join(defaultDir, safeName)
    } else {
      const ownerWindow = BrowserWindow.fromWebContents(event.sender)
      const extension = path.extname(safeName).toLowerCase()
      const filters =
        extension === '.png'
          ? [{ name: 'PNG 图片', extensions: ['png'] }]
          : extension === '.json'
            ? [{ name: 'GalFlow 工程文件', extensions: ['json'] }]
            : [{ name: '文本文件', extensions: ['txt'] }]

      const result = ownerWindow
        ? await dialog.showSaveDialog(ownerWindow, {
            title: '保存分享文件',
            defaultPath: path.join(defaultDir, safeName),
            filters,
          })
        : await dialog.showSaveDialog({
            title: '保存分享文件',
            defaultPath: path.join(defaultDir, safeName),
            filters,
          })

      if (result.canceled || !result.filePath) {
        return { saved: false }
      }
      targetPath = result.filePath
    }

    let data
    if (kind === 'png') {
      const match = /^data:image\/png;base64,(.+)$/s.exec(content)
      if (!match) throw new Error('PNG 数据格式不正确')
      data = Buffer.from(match[1], 'base64')
    } else {
      data = Buffer.from(content, 'utf8')
    }

    fs.mkdirSync(path.dirname(targetPath), { recursive: true })
    fs.writeFileSync(targetPath, data)
    return { saved: true, path: targetPath }
  })
}

function createWindow() {
  const iconPath = getIconPath()
  const preloadPath = path.join(__dirname, 'preload.cjs')
  const indexPath = path.join(__dirname, '..', 'dist', 'index.html')

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    title: 'GalFlow · 剧情流程工作台',
    icon: iconPath,
    backgroundColor: '#f3eee7',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      devTools: !app.isPackaged || process.env.GALFLOW_DEVTOOLS === '1',
    },
  })

  mainWindow.removeMenu()

  if (DEV_SERVER_URL) {
    mainWindow.loadURL(DEV_SERVER_URL)
  } else if (fs.existsSync(indexPath)) {
    mainWindow.loadFile(indexPath)
  } else {
    mainWindow.loadURL(
      'data:text/html;charset=utf-8,' +
        encodeURIComponent(
          '<body style="font-family:Segoe UI,sans-serif;padding:40px;background:#f3eee7;color:#2c2732">' +
            '<h2>GalFlow 尚未构建</h2>' +
            '<p>请先运行 <code>npm run build</code>，再启动桌面应用。</p>' +
            '</body>',
        ),
    )
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainWindow.focus()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowedPrefixes = ['file://']
    if (DEV_SERVER_URL) allowedPrefixes.push(DEV_SERVER_URL)

    if (!allowedPrefixes.some((prefix) => url.startsWith(prefix))) {
      event.preventDefault()
      if (url.startsWith('http://') || url.startsWith('https://')) {
        shell.openExternal(url)
      }
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  })

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null)
    registerSaveFileHandler()

    const downloadDir = process.env.GALFLOW_DOWNLOAD_DIR
      ? path.resolve(process.env.GALFLOW_DOWNLOAD_DIR)
      : app.getPath('downloads')
    fs.mkdirSync(downloadDir, { recursive: true })
    session.defaultSession.setDownloadPath(downloadDir)

    session.defaultSession.setPermissionRequestHandler(
      (_webContents, permission, callback) => {
        const allowed = new Set([
          'clipboard-read',
          'clipboard-sanitized-write',
        ])
        callback(allowed.has(permission))
      },
    )

    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
