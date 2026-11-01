import { Handle, Position, type NodeProps } from '@xyflow/react'
import { FileText, Maximize2 } from 'lucide-react'
import { countTextCharacters, htmlToPreview } from '../../../lib/html'
import type { SceneFlowNode } from '../../../types/story'

export function SceneNode({
  data,
  selected,
  isConnectable,
}: NodeProps<SceneFlowNode>) {
  const title = data.title.trim() || '未命名场景'
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
        <span className="scene-node__count">{characterCount} 字</span>
      </div>

      <h3 className="scene-node__title">{title}</h3>

      <p className={`scene-node__preview${preview ? '' : ' is-empty'}`}>
        {preview || '点击后在右侧写下这一幕的剧情、对白和旁白……'}
      </p>

      <div className="scene-node__footer">
        <span className="scene-node__meta">
          <FileText size={12} strokeWidth={1.9} />
          剧情块
        </span>
        <span className="scene-node__hint">
          <Maximize2 size={11} strokeWidth={2} />
          双击展开
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
