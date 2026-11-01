import { useEffect, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  Layers,
  Plus,
  Trash2,
} from 'lucide-react'
import { useI18n } from '../../i18n'
import { useStoryStore } from '../../store/useStoryStore'

export function CanvasSwitcher() {
  const { t } = useI18n()
  const activeCanvasId = useStoryStore((state) => state.activeCanvasId)
  const inactiveCanvases = useStoryStore(
    (state) => state.inactiveCanvases,
  )
  const activeTitle = useStoryStore((state) => state.title)
  const activeNodes = useStoryStore((state) => state.nodes)
  const activeVariables = useStoryStore((state) => state.variables)
  const createCanvas = useStoryStore((state) => state.createCanvas)
  const switchCanvas = useStoryStore((state) => state.switchCanvas)
  const deleteCanvas = useStoryStore((state) => state.deleteCanvas)

  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const canvases = [
    {
      id: activeCanvasId,
      title: activeTitle.trim() || t('common.untitledStory'),
      nodeCount: activeNodes.length,
      variableCount: activeVariables.length,
      isActive: true,
    },
    ...inactiveCanvases.map((canvas) => ({
      id: canvas.id,
      title: canvas.title.trim() || t('common.untitledStory'),
      nodeCount: canvas.nodes.length,
      variableCount: canvas.variables.length,
      isActive: false,
    })),
  ]

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const handleCreate = () => {
    createCanvas()
    setOpen(false)
  }

  const handleSwitch = (canvasId: string, isActive: boolean) => {
    if (!isActive) switchCanvas(canvasId)
    setOpen(false)
  }

  const handleDelete = (
    canvasId: string,
    title: string,
    isActive: boolean,
  ) => {
    if (
      !window.confirm(
        isActive
          ? t('canvasSwitcher.confirmDeleteActive', { title })
          : t('canvasSwitcher.confirmDelete', { title }),
      )
    ) {
      return
    }
    deleteCanvas(canvasId)
    setOpen(false)
  }

  return (
    <div className="canvas-switcher" ref={rootRef}>
      <button
        type="button"
        className={`canvas-switcher__trigger${open ? ' is-open' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('canvasSwitcher.switchAria')}
        onClick={() => setOpen((value) => !value)}
      >
        <Layers size={13} />
        <span>{t('common.canvas')}</span>
        <span className="canvas-switcher__count">{canvases.length}</span>
        <ChevronDown size={12} className="canvas-switcher__chevron" />
      </button>
      <button
        type="button"
        className="canvas-switcher__add"
        onClick={handleCreate}
        aria-label={t('canvasSwitcher.addAria')}
        title={t('canvasSwitcher.addTitle')}
      >
        <Plus size={14} />
      </button>

      {open && (
        <div className="canvas-switcher__menu" role="menu">
          <div className="canvas-switcher__menu-head">
            <span>{t('canvasSwitcher.all')}</span>
            <span>
              {t('canvasSwitcher.count', { count: canvases.length })}
            </span>
          </div>

          <div className="canvas-switcher__list">
            {canvases.map((canvas) => (
              <div
                key={canvas.id}
                className={`canvas-switcher__item${
                  canvas.isActive ? ' is-active' : ''
                }`}
              >
                <button
                  type="button"
                  className="canvas-switcher__item-main"
                  role="menuitem"
                  onClick={() =>
                    handleSwitch(canvas.id, canvas.isActive)
                  }
                >
                  <span className="canvas-switcher__item-mark">
                    {canvas.isActive ? (
                      <Check size={13} />
                    ) : (
                      <Layers size={13} />
                    )}
                  </span>
                  <span className="canvas-switcher__item-text">
                    <strong>{canvas.title}</strong>
                    <small>
                      {t('canvasSwitcher.nodeVariableCount', {
                        nodes: canvas.nodeCount,
                        variables: canvas.variableCount,
                      })}
                    </small>
                  </span>
                </button>

                {canvases.length > 1 && (
                  <button
                    type="button"
                    className="icon-button icon-button--tiny canvas-switcher__delete"
                    title={
                      canvas.isActive
                        ? t('canvasSwitcher.deleteActiveTitle')
                        : t('canvasSwitcher.deleteTitle')
                    }
                    aria-label={t('canvasSwitcher.deleteAria', {
                      title: canvas.title,
                    })}
                    onClick={() =>
                      handleDelete(
                        canvas.id,
                        canvas.title,
                        canvas.isActive,
                      )
                    }
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            className="canvas-switcher__create"
            onClick={handleCreate}
          >
            <Plus size={14} />
            {t('canvasSwitcher.newBlank')}
          </button>
        </div>
      )}
    </div>
  )
}
