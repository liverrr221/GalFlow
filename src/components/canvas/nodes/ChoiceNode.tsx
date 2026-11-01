import {
  Handle,
  Position,
  type NodeProps,
} from '@xyflow/react'
import { GitBranch } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useI18n } from '../../../i18n'
import { OPTION_COLORS } from '../../../lib/constants'
import type { ChoiceFlowNode } from '../../../types/story'

export function ChoiceNode({
  data,
  selected,
  isConnectable,
}: NodeProps<ChoiceFlowNode>) {
  const { t } = useI18n()
  const title = data.title.trim() || t('choice.untitled')
  const options = data.options

  return (
    <div className={`choice-node${selected ? ' is-selected' : ''}`}>
      <div className="choice-node__diamond-wrap">
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          className="story-handle story-handle--target choice-node__target"
          isConnectable={isConnectable}
        />
        <div className="choice-node__diamond">
          <div className="choice-node__diamond-inner">
            <span className="choice-node__kicker">
              <GitBranch size={11} strokeWidth={2} />
              CHOICE
            </span>
            <h3 className="choice-node__title">{title}</h3>
            <span className="choice-node__count">
              {t('choice.branchCount', { count: options.length })}
            </span>
          </div>
        </div>
      </div>

      <div className="choice-node__options">
        {options.length === 0 && (
          <span className="choice-node__empty">{t('choice.empty')}</span>
        )}

        {options.map((option, index) => (
          <div
            key={option.id}
            className="choice-option"
            style={
              {
                '--option-color': OPTION_COLORS[index % OPTION_COLORS.length],
              } as CSSProperties
            }
          >
            <span className="choice-option__index">{index + 1}</span>
            <span className="choice-option__label">
              {option.label.trim() ||
                t('choice.optionFallback', { index: index + 1 })}
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id={option.id}
              className="story-handle story-handle--option"
              isConnectable={isConnectable}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
