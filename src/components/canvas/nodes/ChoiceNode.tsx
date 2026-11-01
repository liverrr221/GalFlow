import {
  Handle,
  Position,
  type NodeProps,
} from '@xyflow/react'
import { GitBranch } from 'lucide-react'
import type { CSSProperties } from 'react'
import { OPTION_COLORS } from '../../../lib/constants'
import type { ChoiceFlowNode } from '../../../types/story'

export function ChoiceNode({
  data,
  selected,
  isConnectable,
}: NodeProps<ChoiceFlowNode>) {
  const title = data.title.trim() || '未命名选择'
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
            <span className="choice-node__count">{options.length} 条分支</span>
          </div>
        </div>
      </div>

      <div className="choice-node__options">
        {options.length === 0 && (
          <span className="choice-node__empty">在右侧添加选项</span>
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
              {option.label.trim() || `选项 ${index + 1}`}
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
