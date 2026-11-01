import { Maximize2, X } from 'lucide-react'
import { useStoryStore } from '../../store/useStoryStore'
import { ChoiceInspector } from './ChoiceInspector'
import { ConditionInspector } from './ConditionInspector'
import { SceneInspector } from './SceneInspector'

interface InspectorPanelProps {
  onOpenFullscreen: (nodeId: string) => void
}

export function InspectorPanel({ onOpenFullscreen }: InspectorPanelProps) {
  const selectedNodeId = useStoryStore((state) => state.selectedNodeId)
  const nodes = useStoryStore((state) => state.nodes)
  const selectNode = useStoryStore((state) => state.selectNode)

  const node = nodes.find((item) => item.id === selectedNodeId)
  if (!node) return null

  const kind = node.type
  const fallbackTitle =
    kind === 'scene'
      ? '未命名场景'
      : kind === 'choice'
        ? '未命名选择'
        : '未命名条件'
  const title = node.data.title.trim() || fallbackTitle
  const kicker =
    kind === 'scene'
      ? 'SCENE · 剧情块'
      : kind === 'choice'
        ? 'CHOICE · 选项节点'
        : 'CONDITION · 条件节点'
  const label =
    kind === 'scene'
      ? '剧情块编辑栏'
      : kind === 'choice'
        ? '选项节点编辑栏'
        : '条件节点编辑栏'

  return (
    <aside className="inspector" aria-label={label}>
      <header className="inspector__header">
        <div className="inspector__heading">
          <span
            className={`inspector__kicker${
              kind === 'choice'
                ? ' inspector__kicker--choice'
                : kind === 'condition'
                  ? ' inspector__kicker--condition'
                  : ''
            }`}
          >
            {kicker}
          </span>
          <h2 className="inspector__title" title={title}>
            {title}
          </h2>
        </div>
        <div className="inspector__header-actions">
          {kind === 'scene' && (
            <button
              type="button"
              className="icon-button icon-button--soft"
              onClick={() => onOpenFullscreen(node.id)}
              title="全屏编辑"
              aria-label="全屏编辑"
            >
              <Maximize2 size={16} />
            </button>
          )}
          <button
            type="button"
            className="icon-button icon-button--soft"
            onClick={() => selectNode(null)}
            title="关闭编辑栏"
            aria-label="关闭编辑栏"
          >
            <X size={17} />
          </button>
        </div>
      </header>

      <div className="inspector__scroll">
        {kind === 'scene' ? (
          <SceneInspector
            node={node}
            onOpenFullscreen={onOpenFullscreen}
          />
        ) : kind === 'choice' ? (
          <ChoiceInspector node={node} />
        ) : (
          <ConditionInspector node={node} />
        )}
      </div>
    </aside>
  )
}
