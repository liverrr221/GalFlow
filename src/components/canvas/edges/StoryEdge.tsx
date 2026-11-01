import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react'
import { useI18n } from '../../../i18n'
import { formatConditionCase } from '../../../lib/variables'
import { useStoryStore } from '../../../store/useStoryStore'
import type { StoryEdge } from '../../../types/story'

export function StoryEdgeComponent({
  id,
  source,
  sourceHandleId,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  selected,
  data,
}: EdgeProps<StoryEdge>) {
  const sourceNode = useStoryStore((state) =>
    state.nodes.find((node) => node.id === source),
  )
  const variables = useStoryStore((state) => state.variables)
  const { t } = useI18n()

  let labelText = ''

  if (sourceNode?.type === 'choice') {
    labelText =
      sourceNode.data.options.find(
        (option) => option.id === sourceHandleId,
      )?.label ?? data?.optionLabel ?? ''
  } else if (sourceNode?.type === 'condition') {
    if (sourceHandleId === 'else') {
      labelText = t('edge.else')
    } else {
      const condition = sourceNode.data.cases.find(
        (item) => item.id === sourceHandleId,
      )
      labelText = condition
        ? formatConditionCase(condition, variables)
        : data?.conditionLabel ?? ''
    }
  }

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 18,
    offset: 28,
  })

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        interactionWidth={20}
        style={{
          stroke: selected ? '#d64c79' : '#c3b3aa',
          strokeWidth: selected ? 2.3 : 1.7,
          transition: 'stroke 150ms ease, stroke-width 150ms ease',
        }}
      />
      {labelText && (
        <EdgeLabelRenderer>
          <div
            className="edge-option-label"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {labelText}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
