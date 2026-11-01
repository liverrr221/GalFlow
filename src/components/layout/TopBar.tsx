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
import { useI18n } from '../../i18n'
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
  const { language, setLanguage, t } = useI18n()
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
      !window.confirm(t('topbar.confirmLoadSample'))
    ) {
      return
    }
    loadSample()
  }

  const handleClear = () => {
    setMenuOpen(false)
    if (
      nodeCount > 0 &&
      !window.confirm(t('topbar.confirmClear'))
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
          <small>{t('topbar.subtitle')}</small>
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
          placeholder={t('topbar.storyTitlePlaceholder')}
          aria-label={t('topbar.storyTitleAria')}
          maxLength={60}
        />
      </div>

      <div className="topbar__meta">
        {window.galflowDesktop?.isDesktop && (
          <span
            className="desktop-badge"
            title={`Electron ${window.galflowDesktop.electronVersion}`}
          >
            {t('topbar.desktopBadge')}
          </span>
        )}
        <span>{t('common.nodeCount', { count: nodeCount })}</span>
        <span className="topbar__meta-dot" />
        <span>{t('common.edgeCount', { count: edgeCount })}</span>
      </div>

      <div className="topbar__actions">
        <button
          type="button"
          className="button button--soft topbar__add"
          onClick={createSceneAtViewport}
          title={t('topbar.addSceneTitle')}
        >
          <SquarePlus size={16} />
          <span>{t('topbar.addScene')}</span>
        </button>
        <button
          type="button"
          className="button button--soft topbar__add"
          onClick={createChoiceAtViewport}
          title={t('topbar.addChoiceTitle')}
        >
          <Diamond size={16} />
          <span>{t('topbar.addChoice')}</span>
        </button>
        <button
          type="button"
          className="button button--soft topbar__add"
          onClick={createConditionAtViewport}
          title={t('topbar.addConditionTitle')}
        >
          <GitBranch size={16} />
          <span>{t('topbar.addCondition')}</span>
        </button>
        <button
          type="button"
          className="button button--ghost topbar__variables"
          onClick={onVariables}
          title={t('topbar.variablesTitle')}
          aria-label={t('topbar.variablesTitle')}
        >
          <Braces size={16} />
          <span>{t('topbar.variables')}</span>
        </button>
        <button
          type="button"
          className="button button--ghost topbar__share"
          onClick={onShare}
          disabled={nodeCount === 0}
          title={t('topbar.shareTitle')}
        >
          <Share2 size={16} />
          <span>{t('topbar.share')}</span>
        </button>
        <button
          type="button"
          className="button button--primary topbar__export"
          onClick={onExport}
          disabled={nodeCount === 0}
          title={t('topbar.exportTitle')}
        >
          <FileOutput size={16} />
          <span>{t('topbar.export')}</span>
        </button>

        <div className="topbar-menu" ref={menuRef}>
          <button
            type="button"
            className="icon-button"
            aria-label={t('topbar.more')}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MoreHorizontal size={19} />
          </button>
          {menuOpen && (
            <div className="topbar-menu__panel" role="menu">
              <div className="topbar-menu__language">
                <p className="topbar-menu__label">{t('topbar.language')}</p>
                <div className="language-switch">
                  <button
                    type="button"
                    className={language === 'zh' ? 'is-active' : ''}
                    aria-pressed={language === 'zh'}
                    onClick={() => setLanguage('zh')}
                  >
                    中文
                  </button>
                  <button
                    type="button"
                    className={language === 'en' ? 'is-active' : ''}
                    aria-pressed={language === 'en'}
                    onClick={() => setLanguage('en')}
                  >
                    English
                  </button>
                </div>
                <p className="topbar-menu__note topbar-menu__note--tight">
                  {t('topbar.languageHint')}
                </p>
              </div>
              <div className="topbar-menu__divider" />
              <button type="button" role="menuitem" onClick={handleLoadSample}>
                <BookOpen size={15} />
                {t('topbar.loadSample')}
              </button>
              <button
                type="button"
                role="menuitem"
                className="is-danger"
                onClick={handleClear}
              >
                <Trash2 size={15} />
                {t('topbar.clearCanvas')}
              </button>
              <p className="topbar-menu__note">
                {t('topbar.autosaveFooter')}
              </p>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
