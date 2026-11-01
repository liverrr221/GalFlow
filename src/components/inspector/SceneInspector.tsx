import { Maximize2, Trash2 } from 'lucide-react'
import { useI18n } from '../../i18n'
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
  const { t } = useI18n()
  const wordCount = countTextCharacters(node.data.content)

  const handleDelete = () => {
    if (!window.confirm(t('sceneInspector.confirmDelete'))) {
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
          {t('sceneInspector.titleLabel')}
        </label>
        <input
          id={`scene-title-${node.id}`}
          className="text-input text-input--title"
          value={node.data.title}
          maxLength={50}
          placeholder={t('sceneInspector.titlePlaceholder')}
          onChange={(event) =>
            updateScene(node.id, { title: event.target.value })
          }
        />
      </div>

      <div className="inspector__section inspector__section--editor">
        <div className="inspector__section-head">
          <span className="field-label">
            {t('sceneInspector.textLabel')}
          </span>
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
          <span className="inspector__word-count">
            {t('common.chars', { count: wordCount })}
          </span>
          <button
            type="button"
            className="text-button"
            onClick={() => onOpenFullscreen(node.id)}
          >
            <Maximize2 size={14} />
            {t('sceneInspector.fullscreen')}
          </button>
        </div>
      </div>

      <div className="inspector__section">
        <div className="inspector__section-head">
          <span className="field-label">
            {t('sceneInspector.effectsLabel')}
          </span>
          <span className="inspector__badge">
            {t('sceneInspector.effectsBadge')}
          </span>
        </div>
        <EffectsEditor
          effects={node.data.effects ?? []}
          variables={variables}
          onChange={(effects) => updateScene(node.id, { effects })}
        />
      </div>

      <div className="inspector__tip">
        <span className="inspector__tip-mark">TIP</span>
        {t('sceneInspector.tip')}
      </div>

      <div className="inspector__danger">
        <button type="button" className="danger-button" onClick={handleDelete}>
          <Trash2 size={15} />
          {t('sceneInspector.delete')}
        </button>
      </div>
    </div>
  )
}
