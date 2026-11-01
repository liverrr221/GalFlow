import { Handle, Position, type NodeProps } from '@xyflow/react'
import { GitBranch } from 'lucide-react'
import type { CSSProperties } from 'react'
import { formatConditionCase } from '../../../lib/variables'
import { useStoryStore } from '../../../store/useStoryStore'
import type { ConditionFlowNode } from '../../../types/story'

const CONDITION_COLORS = ['#3f8b80', '#c38a35', '#735acb', '#d64c79']

export function ConditionNode({
  data,
  selected,
  isConnectable,
}: NodeProps<ConditionFlowNode>) {
  const variables = useStoryStore((state) => state.variables)
  const cases = data.cases

  return (
    <div className={`condition-node${selected ? ' is-selected' : ''}`}>
      <div className="condition-node__shape-wrap">
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          className="story-handle story-handle--target condition-node__target"
          isConnectable={isConnectable}
        />
        <div className="condition-node__shape">
          <div className="condition-node__shape-inner">
            <span className="condition-node__kicker">
              <GitBranch size={11} strokeWidth={2} />
              CONDITION
            </span>
            <h3 className="condition-node__title">
              {data.title.trim() || '未命名条件'}
            </h3>
            <span className="condition-node__count">
              {cases.length} 条规则 + 否则
            </span>
          </div>
        </div>
      </div>

      <div className="condition-node__cases">
        {cases.length === 0 && (
          <span className="condition-node__empty">
            还没有条件规则，请在右侧添加
          </span>
        )}

        {cases.map((condition, index) => (
          <div
            key={condition.id}
            className="condition-case"
            style={
              {
                '--condition-color':
                  CONDITION_COLORS[index % CONDITION_COLORS.length],
              } as CSSProperties
            }
          >
            <span className="condition-case__index">{index + 1}</span>
            <span className="condition-case__label">
              {formatConditionCase(condition, variables)}
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id={condition.id}
              className="story-handle story-handle--condition"
              isConnectable={isConnectable}
            />
          </div>
        ))}

        <div className="condition-case condition-case--else">
          <span className="condition-case__index">↳</span>
          <span className="condition-case__label">否则</span>
          <Handle
            type="source"
            position={Position.Right}
            id="else"
            className="story-handle story-handle--else"
            isConnectable={isConnectable}
          />
        </div>
      </div>
    </div>
  )
}
