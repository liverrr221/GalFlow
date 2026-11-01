import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useReactFlow } from '@xyflow/react'
import {
  Download,
  FileJson,
  FileText,
  Image as ImageIcon,
  Loader2,
  Share2,
  Upload,
  X,
} from 'lucide-react'
import { downloadDataUrl, downloadText } from '../../lib/download'
import {
  buildFlowImageFileName,
  renderFlowImage,
} from '../../lib/exportImage'
import { getStoryStats } from '../../lib/graph'
import {
  MAX_PROJECT_FILE_BYTES,
  buildProjectFileName,
  parseProjectJson,
  serializeProject,
} from '../../lib/projectFile'
import { useStoryStore } from '../../store/useStoryStore'

interface ShareDialogProps {
  onClose: () => void
  onOpenTextExport: () => void
}

type BusyState = 'image' | 'project' | 'import' | null
type Notice = {
  type: 'success' | 'error' | 'info'
  text: string
} | null

export function ShareDialog({
  onClose,
  onOpenTextExport,
}: ShareDialogProps) {
  const title = useStoryStore((state) => state.title)
  const variables = useStoryStore((state) => state.variables)
  const nodes = useStoryStore((state) => state.nodes)
  const edges = useStoryStore((state) => state.edges)
  const importStory = useStoryStore((state) => state.importStory)
  const { fitView } = useReactFlow()

  const [busy, setBusy] = useState<BusyState>(null)
  const [notice, setNotice] = useState<Notice>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const stats = getStoryStats(nodes, edges)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.isComposing) onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  const handleExportImage = async () => {
    setBusy('image')
    setNotice(null)
    try {
      const image = await renderFlowImage(nodes)
      const result = await downloadDataUrl(
        image.dataUrl,
        buildFlowImageFileName(title),
      )
      if (!result.saved) {
        setNotice({ type: 'info', text: '已取消保存图片。' })
        return
      }
      setNotice({
        type: 'success',
        text: window.galflowDesktop
          ? '流程图长图已保存到你选择的位置。'
          : '流程图长图已生成并开始下载，文件在系统下载文件夹中。',
      })
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : '图片生成失败',
      })
    } finally {
      setBusy(null)
    }
  }

  const handleExportProject = async () => {
    setBusy('project')
    setNotice(null)
    try {
      const result = await downloadText(
        serializeProject({ title, variables, nodes, edges }),
        buildProjectFileName(title),
        'application/json;charset=utf-8',
      )
      if (!result.saved) {
        setNotice({ type: 'info', text: '已取消保存工程文件。' })
        return
      }
      setNotice({
        type: 'success',
        text: window.galflowDesktop
          ? '工程文件已保存。朋友在 GalFlow 中导入后即可继续编辑。'
          : '工程文件已生成。朋友在 GalFlow 中导入后即可继续编辑。',
      })
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : '工程文件生成失败',
      })
    } finally {
      setBusy(null)
    }
  }

  const handleImportClick = () => {
    setNotice(null)
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setNotice(null)

    if (file.size > MAX_PROJECT_FILE_BYTES) {
      setNotice({ type: 'error', text: '工程文件过大，无法导入' })
      return
    }

    if (
      nodes.length > 0 &&
      !window.confirm('导入工程会替换当前画布上的全部内容，确定继续吗？')
    ) {
      return
    }

    setBusy('import')
    try {
      const snapshot = parseProjectJson(await file.text())
      importStory(snapshot)
      setNotice({
        type: 'success',
        text: `导入成功：${snapshot.nodes.length} 个节点、${snapshot.edges.length} 条连线。`,
      })
      window.setTimeout(() => {
        fitView({ padding: 0.22, duration: 260 })
      }, 60)
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : '工程文件导入失败',
      })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="share-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-dialog-title"
      >
        <header className="share-dialog__header">
          <span className="share-dialog__icon">
            <Share2 size={20} />
          </span>
          <div className="share-dialog__heading">
            <h2 id="share-dialog-title">分享剧情</h2>
            <p>图片用来给别人看，工程文件用来和别人一起改。</p>
          </div>
          <button
            type="button"
            className="icon-button icon-button--soft"
            onClick={onClose}
            aria-label="关闭分享窗"
          >
            <X size={18} />
          </button>
        </header>

        <div className="share-dialog__summary">
          <span>{title.trim() || '未命名剧情'}</span>
          <span className="share-dialog__dot" />
          <span>{stats.sceneCount} 个剧情块</span>
          <span>{stats.choiceCount} 个选项节点</span>
          <span>{stats.conditionCount} 个条件节点</span>
          <span>{variables.length} 个变量</span>
          <span>{edges.length} 条连线</span>
        </div>

        <div className="share-dialog__cards">
          <article className="share-card share-card--image">
            <span className="share-card__icon">
              <ImageIcon size={20} />
            </span>
            <h3>流程图长图</h3>
            <p>
              把整张流程图渲染成高清 PNG，包含所有分支和连线。朋友不需要安装
              GalFlow，打开图片就能看懂。
            </p>
            <span className="share-card__meta">完整画布 · PNG 图片</span>
            <button
              type="button"
              className="button button--primary share-card__button"
              onClick={handleExportImage}
              disabled={busy !== null || nodes.length === 0}
            >
              {busy === 'image' ? (
                <Loader2 size={16} className="spin" />
              ) : (
                <Download size={16} />
              )}
              {busy === 'image' ? '正在生成…' : '生成并下载图片'}
            </button>
          </article>

          <article className="share-card share-card--project">
            <span className="share-card__icon">
              <FileJson size={20} />
            </span>
            <h3>工程文件</h3>
            <p>
              保存为 <code>.galflow.json</code>。对方在 GalFlow
              里导入后，节点、选项、变量、条件和连线都可以继续编辑。
            </p>
            <span className="share-card__meta">可编辑 · GalFlow 工程文件</span>
            <div className="share-card__actions">
              <button
                type="button"
                className="button button--ghost"
                onClick={handleExportProject}
                disabled={busy !== null || nodes.length === 0}
              >
                <Download size={15} />
                导出工程
              </button>
              <button
                type="button"
                className="button button--ghost"
                onClick={handleImportClick}
                disabled={busy !== null}
              >
                {busy === 'import' ? (
                  <Loader2 size={15} className="spin" />
                ) : (
                  <Upload size={15} />
                )}
                导入工程
              </button>
            </div>
            <input
              ref={fileInputRef}
              className="visually-hidden"
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
            />
          </article>

          <article className="share-card share-card--text">
            <span className="share-card__icon">
              <FileText size={20} />
            </span>
            <h3>纯文本剧本</h3>
            <p>
              导出流程大纲、场景正文和待补全清单。适合直接发给编剧伙伴阅读，或者粘贴到文档里继续写。
            </p>
            <span className="share-card__meta">可阅读 · TXT 文本</span>
            <button
              type="button"
              className="button button--ghost share-card__button"
              onClick={() => {
                onClose()
                onOpenTextExport()
              }}
              disabled={busy !== null || nodes.length === 0}
            >
              <FileText size={15} />
              打开文本导出
            </button>
          </article>
        </div>

        {notice && (
          <div
            className={`share-dialog__notice is-${notice.type}`}
            role="status"
          >
            {notice.text}
          </div>
        )}

        <footer className="share-dialog__footer">
          <span>图片适合展示，工程文件适合协作。</span>
          <span>所有文件都在本机生成，不会上传。</span>
        </footer>
      </div>
    </div>
  )
}
