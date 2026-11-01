import { useEffect } from 'react'
import { Minimize2, X } from 'lucide-react'
import { countTextCharacters } from '../../lib/html'
import { useStoryStore } from '../../store/useStoryStore'
import { FontSizeControl } from '../editor/FontSizeControl'
import { RichTextEditor } from '../editor/RichTextEditor'

interface FullscreenEditorProps {
  nodeId: string
  onClose: () => void
}

export function FullscreenEditor({ nodeId, onClose }: FullscreenEditorProps) {
  const node = useStoryStore((state) =>
    state.nodes.find(
      (item) => item.id === nodeId && item.type === 'scene',
    ),
  )
  const storyTitle = useStoryStore((state) => state.title)
  const updateScene = useStoryStore((state) => state.updateScene)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.isComposing) onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    if (!node) onClose()
  }, [node, onClose])

  if (!node || node.type !== 'scene') return null

  const wordCount = countTextCharacters(node.data.content)

  return (
    <div
      className="fullscreen-editor"
      role="dialog"
      aria-modal="true"
      aria-label="全屏剧情编辑器"
    >
      <div className="fullscreen-editor__shell">
        <header className="fullscreen-editor__header">
          <div className="fullscreen-editor__identity">
            <span className="fullscreen-editor__kicker">FULLSCREEN SCENE</span>
            <span className="fullscreen-editor__story">{storyTitle}</span>
          </div>

          <div className="fullscreen-editor__actions">
            <FontSizeControl
              compact
              value={node.data.fontSize}
              onChange={(fontSize) => updateScene(node.id, { fontSize })}
            />
            <button
              type="button"
              className="button button--ghost fullscreen-editor__collapse"
              onClick={onClose}
            >
              <Minimize2 size={15} />
              返回侧栏
            </button>
            <button
              type="button"
              className="icon-button icon-button--soft"
              onClick={onClose}
              aria-label="关闭全屏编辑"
              title="关闭全屏编辑"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="fullscreen-editor__body">
          <div className="fullscreen-paper">
            <div className="fullscreen-paper__head">
              <span className="fullscreen-paper__index">SCENE</span>
              <input
                className="fullscreen-paper__title"
                value={node.data.title}
                maxLength={50}
                placeholder="这一幕叫什么？"
                aria-label="场景标题"
                onChange={(event) =>
                  updateScene(node.id, { title: event.target.value })
                }
              />
              <span className="fullscreen-paper__count">{wordCount} 字</span>
            </div>

            <RichTextEditor
              nodeId={node.id}
              html={node.data.content}
              fontSize={node.data.fontSize}
              variant="fullscreen"
              autoFocus
              placeholder="在这里写下这一幕的剧情、对白和旁白。换行、加粗、列表都可以自由使用……"
              onChange={(content) => updateScene(node.id, { content })}
            />

            <footer className="fullscreen-paper__footer">
              <span>内容会自动保存</span>
              <span>Esc 或「返回侧栏」收起全屏</span>
            </footer>
          </div>
        </div>
      </div>
    </div>
  )
}
