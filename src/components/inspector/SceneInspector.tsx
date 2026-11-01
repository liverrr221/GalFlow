import { Maximize2, Trash2 } from 'lucide-react'
import { countTextCharacters } from '../../lib/html'
import { useStoryStore } from '../../store/useStoryStore'
import type { SceneFlowNode } from '../../types/story'
import { FontSizeControl } from '../editor/FontSizeControl'
import { RichTextEditor } from '../editor/RichTextEditor'
import { EffectsEditor } from '../variables/EffectsEditor'

interface SceneInspectorProps {
  node: SceneFlowNode
  onOpenFullscreen: (nodeId: string) => void
}

export function SceneInspector({
  node,
  onOpenFullscreen,
}: SceneInspectorProps) {
  const variables = useStoryStore((state) => state.variables)
  const updateScene = useStoryStore((state) => state.updateScene)
  const deleteNode = useStoryStore((state) => state.deleteNode)
  const wordCount = countTextCharacters(node.data.content)

  const handleDelete = () => {
    if (!window.confirm('确定删除这个剧情块吗？与它相连的线也会一起移除。')) {
      return
    }
    deleteNode(node.id)
  }

  return (
    <div className="inspector__body">
      <div className="inspector__section">
        <label
          className="field-label"
          htmlFor={`scene-title-${node.id}`}
        >
          场景标题
        </label>
        <input
          id={`scene-title-${node.id}`}
          className="text-input text-input--title"
          value={node.data.title}
          maxLength={50}
          placeholder="这一幕叫什么？"
          onChange={(event) =>
            updateScene(node.id, { title: event.target.value })
          }
        />
      </div>

      <div className="inspector__section inspector__section--editor">
        <div className="inspector__section-head">
          <span className="field-label">剧情文本</span>
          <FontSizeControl
            value={node.data.fontSize}
            onChange={(fontSize) => updateScene(node.id, { fontSize })}
          />
        </div>

        <RichTextEditor
          nodeId={node.id}
          html={node.data.content}
          fontSize={node.data.fontSize}
          onChange={(content) => updateScene(node.id, { content })}
        />

        <div className="inspector__under-editor">
          <span className="inspector__word-count">{wordCount} 字</span>
          <button
            type="button"
            className="text-button"
            onClick={() => onOpenFullscreen(node.id)}
          >
            <Maximize2 size={14} />
            全屏编辑
          </button>
        </div>
      </div>

      <div className="inspector__section">
        <div className="inspector__section-head">
          <span className="field-label">变量变化</span>
          <span className="inspector__badge">进入此场景时</span>
        </div>
        <EffectsEditor
          effects={node.data.effects ?? []}
          variables={variables}
          onChange={(effects) => updateScene(node.id, { effects })}
        />
      </div>

      <div className="inspector__tip">
        <span className="inspector__tip-mark">TIP</span>
        双击画布上的剧情块，或点击「全屏编辑」，可以在更宽敞的页面里写作。按
        Esc 或「返回侧栏」回到右边栏。
      </div>

      <div className="inspector__danger">
        <button type="button" className="danger-button" onClick={handleDelete}>
          <Trash2 size={15} />
          删除此剧情块
        </button>
      </div>
    </div>
  )
}
