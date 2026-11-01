import { Maximize2, X } from 'lucide-react'
import { useI18n } from '../../i18n'
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
  const { t } = useI18n()

  const node = nodes.find((item) => item.id === selectedNodeId)
  if (!node) return null

  const kind = node.type
  const fallbackTitle =
    kind === 'scene'
      ? t('scene.untitled')
      : kind === 'choice'
        ? t('choice.untitled')
        : t('condition.untitled')
  const title = node.data.title.trim() || fallbackTitle
  const kicker =
    kind === 'scene'
      ? t('inspector.sceneKicker')
      : kind === 'choice'
        ? t('inspector.choiceKicker')
        : t('inspector.conditionKicker')
  const label =
    kind === 'scene'
      ? t('inspector.sceneLabel')
      : kind === 'choice'
        ? t('inspector.choiceLabel')
        : t('inspector.conditionLabel')

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
              title={t('sceneInspector.fullscreen')}
              aria-label={t('sceneInspector.fullscreen')}
            >
              <Maximize2 size={16} />
            </button>
          )}
          <button
            type="button"
            className="icon-button icon-button--soft"
            onClick={() => selectNode(null)}
            title={t('inspector.closeAria')}
            aria-label={t('inspector.closeAria')}
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
