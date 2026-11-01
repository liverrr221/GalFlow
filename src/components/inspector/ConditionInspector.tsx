import {
  ArrowDown,
  ArrowUp,
  CornerDownRight,
  Plus,
  Trash2,
} from 'lucide-react'
import {
  createConditionForVariable,
  formatConditionCase,
  getOperatorsForVariable,
} from '../../lib/variables'
import { useStoryStore } from '../../store/useStoryStore'
import type { ConditionFlowNode } from '../../types/story'

interface ConditionInspectorProps {
  node: ConditionFlowNode
}

function targetTypeLabel(type: string): string {
  if (type === 'scene') return '剧情块'
  if (type === 'choice') return '选项节点'
  return '条件节点'
}

export function ConditionInspector({ node }: ConditionInspectorProps) {
  const nodes = useStoryStore((state) => state.nodes)
  const edges = useStoryStore((state) => state.edges)
  const variables = useStoryStore((state) => state.variables)
  const updateConditionTitle = useStoryStore(
    (state) => state.updateConditionTitle,
  )
  const addConditionCase = useStoryStore((state) => state.addConditionCase)
  const updateConditionCase = useStoryStore(
    (state) => state.updateConditionCase,
  )
  const moveConditionCase = useStoryStore(
    (state) => state.moveConditionCase,
  )
  const removeConditionCase = useStoryStore(
    (state) => state.removeConditionCase,
  )
  const deleteNode = useStoryStore((state) => state.deleteNode)

  const cases = node.data.cases

  const findTarget = (sourceHandle: string) => {
    const edge = edges.find(
      (item) =>
        item.source === node.id && item.sourceHandle === sourceHandle,
    )
    return edge ? nodes.find((item) => item.id === edge.target) : undefined
  }

  const handleDelete = () => {
    if (!window.confirm('确定删除这个条件节点吗？与它相连的线也会一起移除。')) {
      return
    }
    deleteNode(node.id)
  }

  return (
    <div className="inspector__body">
      <div className="inspector__section">
        <label className="field-label" htmlFor={`condition-title-${node.id}`}>
          条件标题
        </label>
        <input
          id={`condition-title-${node.id}`}
          className="text-input text-input--title"
          value={node.data.title}
          maxLength={50}
          placeholder="例如：好感度分支"
          onChange={(event) =>
            updateConditionTitle(node.id, event.target.value)
          }
        />
      </div>

      <div className="inspector__section">
        <div className="inspector__section-head">
          <span className="field-label">条件规则</span>
          <span className="inspector__badge">
            {cases.length} 条规则 + 否则
          </span>
        </div>

        <div className="condition-list">
          {cases.length === 0 && (
            <div className="condition-empty">
              {variables.length === 0
                ? '请先在顶栏「变量」中创建数值或开关变量。'
                : '还没有规则。添加一条规则后，从节点右侧拖线到对应剧情。'}
            </div>
          )}

          {cases.map((condition, index) => {
            const variable = variables.find(
              (item) => item.id === condition.variableId,
            )
            const operators = getOperatorsForVariable(variable)
            const target = findTarget(condition.id)
            const isBoolean = variable?.kind === 'boolean'

            return (
              <div className="condition-editor" key={condition.id}>
                <div className="condition-editor__row">
                  <span className="condition-editor__index">
                    {index + 1}
                  </span>
                  <select
                    className="mini-select condition-editor__variable"
                    value={condition.variableId}
                    aria-label={`规则 ${index + 1} 变量`}
                    onChange={(event) => {
                      const nextVariable = variables.find(
                        (item) => item.id === event.target.value,
                      )
                      if (!nextVariable) return
                      updateConditionCase(node.id, condition.id, {
                        ...createConditionForVariable(nextVariable),
                      })
                    }}
                  >
                    {variables.length === 0 && (
                      <option value="">无可用变量</option>
                    )}
                    {variables.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>

                  <select
                    className="mini-select condition-editor__operator"
                    value={condition.operator}
                    aria-label={`规则 ${index + 1} 运算符`}
                    onChange={(event) =>
                      updateConditionCase(node.id, condition.id, {
                        operator: event.target
                          .value as typeof condition.operator,
                      })
                    }
                  >
                    {operators.map((operator) => (
                      <option key={operator.value} value={operator.value}>
                        {operator.label}
                      </option>
                    ))}
                  </select>

                  {isBoolean ? (
                    <select
                      className="mini-select condition-editor__value"
                      value={condition.value ? 'true' : 'false'}
                      aria-label={`规则 ${index + 1} 值`}
                      onChange={(event) =>
                        updateConditionCase(node.id, condition.id, {
                          value: event.target.value === 'true',
                        })
                      }
                    >
                      <option value="true">是</option>
                      <option value="false">否</option>
                    </select>
                  ) : (
                    <input
                      className="mini-input condition-editor__value"
                      type="number"
                      value={Number(condition.value)}
                      aria-label={`规则 ${index + 1} 值`}
                      onChange={(event) => {
                        const value = Number(event.target.value)
                        updateConditionCase(node.id, condition.id, {
                          value: Number.isFinite(value) ? value : 0,
                        })
                      }}
                    />
                  )}

                  <div className="condition-editor__actions">
                    <button
                      type="button"
                      className="icon-button icon-button--tiny"
                      aria-label="上移规则"
                      title="上移，优先判断"
                      disabled={index === 0}
                      onClick={() =>
                        moveConditionCase(node.id, condition.id, 'up')
                      }
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button--tiny"
                      aria-label="下移规则"
                      title="下移"
                      disabled={index === cases.length - 1}
                      onClick={() =>
                        moveConditionCase(node.id, condition.id, 'down')
                      }
                    >
                      <ArrowDown size={13} />
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button--tiny"
                      aria-label="删除规则"
                      title="删除规则"
                      onClick={() =>
                        removeConditionCase(node.id, condition.id)
                      }
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div
                  className={`condition-editor__connection${
                    target ? ' is-connected' : ''
                  }`}
                >
                  <CornerDownRight size={13} />
                  <span>{formatConditionCase(condition, variables)}</span>
                  <span className="condition-editor__connection-status">
                    {target
                      ? `→ ${targetTypeLabel(target.type)}「${
                          target.data.title.trim() || '未命名'
                        }」`
                      : '尚未连接'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <button
          type="button"
          className="add-option-button"
          onClick={() => addConditionCase(node.id)}
          disabled={variables.length === 0}
        >
          <Plus size={15} />
          添加条件规则
        </button>

        <div className="condition-else">
          <div className="condition-else__head">
            <span>否则 / 其他情况</span>
            <span className="condition-else__hint">不满足以上规则时</span>
          </div>
          <div
            className={`condition-editor__connection${
              findTarget('else') ? ' is-connected' : ''
            }`}
          >
            <CornerDownRight size={13} />
            {findTarget('else') ? (
              <span>{`→ ${targetTypeLabel(
                findTarget('else')!.type,
              )}「${findTarget('else')!.data.title.trim() || '未命名'}」`}</span>
            ) : (
              <span>从节点底部的「否则」圆点拖出一条线</span>
            )}
          </div>
        </div>

        <div className="inspector__tip">
          <span className="inspector__tip-mark">TIP</span>
          条件从上到下依次判断，命中第一条就跳转；都不满足时走「否则」。变量变化可以在选项或剧情块的设置里添加。
        </div>
      </div>

      <div className="inspector__danger">
        <button type="button" className="danger-button" onClick={handleDelete}>
          <Trash2 size={15} />
          删除此条件节点
        </button>
      </div>
    </div>
  )
}
