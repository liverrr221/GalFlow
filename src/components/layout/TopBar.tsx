import { useEffect, useRef, useState } from 'react'
import {
  BookOpen,
  Braces,
  Diamond,
  FileOutput,
  GitBranch,
  MoreHorizontal,
  Share2,
  SquarePlus,
  Trash2,
} from 'lucide-react'
import { useCreateNode } from '../../hooks/useCreateNode'
import { useStoryStore } from '../../store/useStoryStore'
import { CanvasSwitcher } from './CanvasSwitcher'

interface TopBarProps {
  onExport: () => void
  onShare: () => void
  onVariables: () => void
}

export function TopBar({ onExport, onShare, onVariables }: TopBarProps) {
  const title = useStoryStore((state) => state.title)
  const setTitle = useStoryStore((state) => state.setTitle)
  const loadSample = useStoryStore((state) => state.loadSample)
  const clearStory = useStoryStore((state) => state.clearStory)
  const nodeCount = useStoryStore((state) => state.nodes.length)
  const edgeCount = useStoryStore((state) => state.edges.length)
  const {
    createChoiceAtViewport,
    createConditionAtViewport,
    createSceneAtViewport,
  } = useCreateNode()

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  const handleLoadSample = () => {
    setMenuOpen(false)
    if (
      nodeCount > 0 &&
      !window.confirm('载入示例剧情会替换当前画布上的内容，确定继续吗？')
    ) {
      return
    }
    loadSample()
  }

  const handleClear = () => {
    setMenuOpen(false)
    if (
      nodeCount > 0 &&
      !window.confirm('确定清空当前画布吗？这个操作无法撤销。')
    ) {
      return
    }
    clearStory()
  }

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand__mark" aria-hidden="true">
          <span className="brand__diamond" />
          <span className="brand__dot" />
        </span>
        <span className="brand__text">
          <strong>GalFlow</strong>
          <small>剧情流程工作台</small>
        </span>
      </div>

      <div className="story-title">
        <div className="story-title__topline">
          <span className="story-title__label">STORY TITLE</span>
          <CanvasSwitcher />
        </div>
        <input
          className="story-title__input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="给这个故事起个名字"
          aria-label="剧本名称"
          maxLength={60}
        />
      </div>

      <div className="topbar__meta">
        {window.galflowDesktop?.isDesktop && (
          <span
            className="desktop-badge"
            title={`Electron ${window.galflowDesktop.electronVersion}`}
          >
            桌面版
          </span>
        )}
        <span>{nodeCount} 节点</span>
        <span className="topbar__meta-dot" />
        <span>{edgeCount} 连线</span>
      </div>

      <div className="topbar__actions">
        <button
          type="button"
          className="button button--soft topbar__add"
          onClick={createSceneAtViewport}
          title="在画布中央添加一个矩形剧情块"
        >
          <SquarePlus size={16} />
          <span>剧情块</span>
        </button>
        <button
          type="button"
          className="button button--soft topbar__add"
          onClick={createChoiceAtViewport}
          title="在画布中央添加一个菱形选项节点"
        >
          <Diamond size={16} />
          <span>选项节点</span>
        </button>
        <button
          type="button"
          className="button button--soft topbar__add"
          onClick={createConditionAtViewport}
          title="在画布中央添加一个条件分支节点"
        >
          <GitBranch size={16} />
          <span>条件</span>
        </button>
        <button
          type="button"
          className="button button--ghost topbar__variables"
          onClick={onVariables}
          title="变量管理"
          aria-label="变量管理"
        >
          <Braces size={16} />
          <span>变量</span>
        </button>
        <button
          type="button"
          className="button button--ghost topbar__share"
          onClick={onShare}
          disabled={nodeCount === 0}
          title="导出流程图图片或工程文件，分享给别人"
        >
          <Share2 size={16} />
          <span>分享</span>
        </button>
        <button
          type="button"
          className="button button--primary topbar__export"
          onClick={onExport}
          disabled={nodeCount === 0}
          title="把当前流程图整理成一份完整文本"
        >
          <FileOutput size={16} />
          <span>导出文本</span>
        </button>

        <div className="topbar-menu" ref={menuRef}>
          <button
            type="button"
            className="icon-button"
            aria-label="更多操作"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MoreHorizontal size={19} />
          </button>
          {menuOpen && (
            <div className="topbar-menu__panel" role="menu">
              <button type="button" role="menuitem" onClick={handleLoadSample}>
                <BookOpen size={15} />
                载入示例剧情
              </button>
              <button
                type="button"
                role="menuitem"
                className="is-danger"
                onClick={handleClear}
              >
                <Trash2 size={15} />
                清空画布
              </button>
              <p className="topbar-menu__note">
                所有修改都会自动保存在本机浏览器中
              </p>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
