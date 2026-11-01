import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Copy, Download, FileOutput, X } from 'lucide-react'
import { downloadText } from '../../lib/download'
import { buildStoryText, buildTextFileName } from '../../lib/exportStory'
import { getStoryStats } from '../../lib/graph'
import { useStoryStore } from '../../store/useStoryStore'

interface ExportDialogProps {
  onClose: () => void
}

export function ExportDialog({ onClose }: ExportDialogProps) {
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
      }),
    [title, variables, nodes, edges, generatedAt],
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
        buildTextFileName(title),
        'text/plain;charset=utf-8',
      )
      if (result.saved) setDownloaded(true)
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : '文本文件保存失败',
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
            <h2 id="export-dialog-title">导出剧情文本</h2>
            <p>根据当前画布生成，只在需要时整理成完整的一份文本。</p>
          </div>
          <button
            type="button"
            className="icon-button icon-button--soft"
            onClick={onClose}
            aria-label="关闭导出窗"
          >
            <X size={18} />
          </button>
        </header>

        <div className="export-dialog__stats">
          <span>
            <strong>{stats.sceneCount}</strong> 个场景
          </span>
          <span>
            <strong>{stats.choiceCount}</strong> 个选择
          </span>
          <span>
            <strong>{stats.conditionCount}</strong> 个条件
          </span>
          <span>
            <strong>{variables.length}</strong> 个变量
          </span>
          <span>
            <strong>{stats.endingCount}</strong> 个结局
          </span>
          <span>
            <strong>{stats.unconnectedOptionCount}</strong> 个待连接选项
          </span>
          <span>
            <strong>{textCharacterCount}</strong> 字
          </span>
        </div>

        <div className="export-dialog__preview">
          <div className="export-dialog__preview-bar">
            <span>纯文本预览</span>
            <span>流程大纲 + 场景正文 + 结局清单</span>
          </div>
          <pre>{text}</pre>
        </div>

        <footer className="export-dialog__footer">
          <span className="export-dialog__hint">
            下载后即可用任意文本编辑器打开。
          </span>
          <div className="export-dialog__actions">
            <button
              type="button"
              className="button button--ghost"
              onClick={handleCopy}
              aria-live="polite"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? '已复制' : '复制文本'}
            </button>
            <button
              type="button"
              className="button button--primary"
              onClick={handleDownload}
            >
              {downloaded ? <Check size={16} /> : <Download size={16} />}
              {downloaded ? '已保存' : '下载 .txt'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
