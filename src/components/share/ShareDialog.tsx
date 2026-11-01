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
import { useI18n } from '../../i18n'
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
  const { t } = useI18n()
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
        setNotice({ type: 'info', text: t('share.cancelledImage') })
        return
      }
      setNotice({
        type: 'success',
        text: window.galflowDesktop
          ? t('share.imageSavedDesktop')
          : t('share.imageSavedBrowser'),
      })
    } catch (error) {
      setNotice({
        type: 'error',
        text:
          error instanceof Error ? error.message : t('share.imageError'),
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
        setNotice({ type: 'info', text: t('share.cancelledProject') })
        return
      }
      setNotice({
        type: 'success',
        text: window.galflowDesktop
          ? t('share.projectSavedDesktop')
          : t('share.projectSavedBrowser'),
      })
    } catch (error) {
      setNotice({
        type: 'error',
        text:
          error instanceof Error ? error.message : t('share.projectError'),
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
      setNotice({ type: 'error', text: t('share.projectTooLarge') })
      return
    }

    if (
      nodes.length > 0 &&
      !window.confirm(t('share.confirmImport'))
    ) {
      return
    }

    setBusy('import')
    try {
      const snapshot = parseProjectJson(await file.text())
      importStory(snapshot)
      setNotice({
        type: 'success',
        text: t('share.importSuccess', {
          nodes: snapshot.nodes.length,
          edges: snapshot.edges.length,
        }),
      })
      window.setTimeout(() => {
        fitView({ padding: 0.22, duration: 260 })
      }, 60)
    } catch (error) {
      setNotice({
        type: 'error',
        text:
          error instanceof Error ? error.message : t('share.importError'),
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
            <h2 id="share-dialog-title">{t('share.title')}</h2>
            <p>{t('share.subtitle')}</p>
          </div>
          <button
            type="button"
            className="icon-button icon-button--soft"
            onClick={onClose}
            aria-label={t('share.closeAria')}
          >
            <X size={18} />
          </button>
        </header>

        <div className="share-dialog__summary">
          <span>{title.trim() || t('share.untitled')}</span>
          <span className="share-dialog__dot" />
          <span>
            {t('share.summaryScenes', { count: stats.sceneCount })}
          </span>
          <span>
            {t('share.summaryChoices', { count: stats.choiceCount })}
          </span>
          <span>
            {t('share.summaryConditions', {
              count: stats.conditionCount,
            })}
          </span>
          <span>
            {t('share.summaryVariables', { count: variables.length })}
          </span>
          <span>
            {t('share.summaryEdges', { count: edges.length })}
          </span>
        </div>

        <div className="share-dialog__cards">
          <article className="share-card share-card--image">
            <span className="share-card__icon">
              <ImageIcon size={20} />
            </span>
            <h3>{t('share.imageTitle')}</h3>
            <p>{t('share.imageDescription')}</p>
            <span className="share-card__meta">
              {t('share.imageMeta')}
            </span>
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
              {busy === 'image'
                ? t('share.imageBusy')
                : t('share.imageAction')}
            </button>
          </article>

          <article className="share-card share-card--project">
            <span className="share-card__icon">
              <FileJson size={20} />
            </span>
            <h3>{t('share.projectTitle')}</h3>
            <p>{t('share.projectDescription')}</p>
            <span className="share-card__meta">
              {t('share.projectMeta')}
            </span>
            <div className="share-card__actions">
              <button
                type="button"
                className="button button--ghost"
                onClick={handleExportProject}
                disabled={busy !== null || nodes.length === 0}
              >
                <Download size={15} />
                {t('share.projectExport')}
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
                {t('share.projectImport')}
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
            <h3>{t('share.textTitle')}</h3>
            <p>{t('share.textDescription')}</p>
            <span className="share-card__meta">{t('share.textMeta')}</span>
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
              {t('share.textAction')}
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
          <span>{t('share.footerTip')}</span>
          <span>{t('share.footerLocal')}</span>
        </footer>
      </div>
    </div>
  )
}
