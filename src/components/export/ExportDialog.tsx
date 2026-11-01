import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Copy, Download, FileOutput, X } from 'lucide-react'
import { useI18n } from '../../i18n'
import { downloadText } from '../../lib/download'
import { buildStoryText, buildTextFileName } from '../../lib/exportStory'
import { getStoryStats } from '../../lib/graph'
import { useStoryStore } from '../../store/useStoryStore'

interface ExportDialogProps {
  onClose: () => void
}

export function ExportDialog({ onClose }: ExportDialogProps) {
  const { language, t } = useI18n()
  const title = useStoryStore((state) => state.title)
  const variables = useStoryStore((state) => state.variables)
  const nodes = useStoryStore((state) => state.nodes)
  const edges = useStoryStore((state) => state.edges)
  const [generatedAt] = useState(() => new Date())
  const [copied, setCopied] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stats = useMemo(() => getStoryStats(nodes, edges), [nodes, edges])
  const text = useMemo(
    () =>
      buildStoryText({
        title,
        variables,
        nodes,
        edges,
        generatedAt,
        language,
      }),
    [title, variables, nodes, edges, generatedAt, language],
  )
  const textCharacterCount = text.replace(/\s/g, '').length

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
      if (copyTimer.current) clearTimeout(copyTimer.current)
    }
  }, [onClose])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      textarea.remove()
    }

    setCopied(true)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopied(false), 1800)
  }

  const handleDownload = async () => {
    try {
      const result = await downloadText(
        text,
        buildTextFileName(title, language),
        'text/plain;charset=utf-8',
      )
      if (result.saved) setDownloaded(true)
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : t('export.saveError'),
      )
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
        className="export-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-dialog-title"
      >
        <header className="export-dialog__header">
          <span className="export-dialog__icon">
            <FileOutput size={20} />
          </span>
          <div className="export-dialog__heading">
            <h2 id="export-dialog-title">{t('export.title')}</h2>
            <p>{t('export.subtitle')}</p>
          </div>
          <button
            type="button"
            className="icon-button icon-button--soft"
            onClick={onClose}
            aria-label={t('export.closeAria')}
          >
            <X size={18} />
          </button>
        </header>

        <div className="export-dialog__stats">
          <span>
            {t('export.scenes', { count: stats.sceneCount })}
          </span>
          <span>
            {t('export.choices', { count: stats.choiceCount })}
          </span>
          <span>
            {t('export.conditions', { count: stats.conditionCount })}
          </span>
          <span>
            {t('export.variables', { count: variables.length })}
          </span>
          <span>
            {t('export.endings', { count: stats.endingCount })}
          </span>
          <span>
            {t('export.unconnected', {
              count: stats.unconnectedOptionCount,
            })}
          </span>
          <span>
            {t('export.characters', { count: textCharacterCount })}
          </span>
        </div>

        <div className="export-dialog__preview">
          <div className="export-dialog__preview-bar">
            <span>{t('export.preview')}</span>
            <span>{t('export.previewMeta')}</span>
          </div>
          <pre>{text}</pre>
        </div>

        <footer className="export-dialog__footer">
          <span className="export-dialog__hint">
            {t('export.footer')}
          </span>
          <div className="export-dialog__actions">
            <button
              type="button"
              className="button button--ghost"
              onClick={handleCopy}
              aria-live="polite"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? t('export.copied') : t('export.copy')}
            </button>
            <button
              type="button"
              className="button button--primary"
              onClick={handleDownload}
            >
              {downloaded ? <Check size={16} /> : <Download size={16} />}
              {downloaded ? t('export.downloaded') : t('export.download')}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
