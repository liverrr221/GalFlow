import { useEffect, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  Layers,
  Plus,
  Trash2,
} from 'lucide-react'
import { useStoryStore } from '../../store/useStoryStore'

export function CanvasSwitcher() {
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
      title: activeTitle.trim() || '未命名剧情',
      nodeCount: activeNodes.length,
      variableCount: activeVariables.length,
      isActive: true,
    },
    ...inactiveCanvases.map((canvas) => ({
      id: canvas.id,
      title: canvas.title.trim() || '未命名剧情',
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
          ? `确定删除当前画布「${title}」吗？删除后会切换到另一个画布。`
          : `确定删除画布「${title}」吗？`,
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
        aria-label="切换画布"
        onClick={() => setOpen((value) => !value)}
      >
        <Layers size={13} />
        <span>画布</span>
        <span className="canvas-switcher__count">{canvases.length}</span>
        <ChevronDown size={12} className="canvas-switcher__chevron" />
      </button>
      <button
        type="button"
        className="canvas-switcher__add"
        onClick={handleCreate}
        aria-label="新增画布"
        title="新增空白画布"
      >
        <Plus size={14} />
      </button>

      {open && (
        <div className="canvas-switcher__menu" role="menu">
          <div className="canvas-switcher__menu-head">
            <span>所有画布</span>
            <span>{canvases.length} 个</span>
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
                      {canvas.nodeCount} 节点 · {canvas.variableCount} 变量
                    </small>
                  </span>
                </button>

                {canvases.length > 1 && (
                  <button
                    type="button"
                    className="icon-button icon-button--tiny canvas-switcher__delete"
                    title={
                      canvas.isActive
                        ? '删除当前画布并切换到另一个画布'
                        : '删除画布'
                    }
                    aria-label={`删除画布 ${canvas.title}`}
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
            新建空白画布
          </button>
        </div>
      )}
    </div>
  )
}
