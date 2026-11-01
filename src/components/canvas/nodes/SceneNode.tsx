import { Handle, Position, type NodeProps } from '@xyflow/react'
import { FileText, Maximize2 } from 'lucide-react'
import { useI18n } from '../../../i18n'
import { countTextCharacters, htmlToPreview } from '../../../lib/html'
import type { SceneFlowNode } from '../../../types/story'

export function SceneNode({
  data,
  selected,
  isConnectable,
}: NodeProps<SceneFlowNode>) {
  const { t } = useI18n()
  const title = data.title.trim() || t('scene.untitled')
  const preview = htmlToPreview(data.content, 150)
  const characterCount = countTextCharacters(data.content)

  return (
    <article className={`scene-node${selected ? ' is-selected' : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        className="story-handle story-handle--target"
        isConnectable={isConnectable}
      />

      <div className="scene-node__topline">
        <span className="scene-node__kicker">
          <span className="scene-node__kicker-dot" />
          SCENE
        </span>
        <span className="scene-node__count">
          {t('common.chars', { count: characterCount })}
        </span>
      </div>

      <h3 className="scene-node__title">{title}</h3>

      <p className={`scene-node__preview${preview ? '' : ' is-empty'}`}>
        {preview || t('scene.placeholder')}
      </p>

      <div className="scene-node__footer">
        <span className="scene-node__meta">
          <FileText size={12} strokeWidth={1.9} />
          {t('scene.footer')}
        </span>
        <span className="scene-node__hint">
          <Maximize2 size={11} strokeWidth={2} />
          {t('scene.doubleClick')}
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="out"
        className="story-handle story-handle--source"
        isConnectable={isConnectable}
      />
    </article>
  )
}
