import { CornerDownRight, Plus, Trash2 } from 'lucide-react'
import type { CSSProperties } from 'react'
import { OPTION_COLORS } from '../../lib/constants'
import { findEdgeForOption } from '../../lib/graph'
import { useStoryStore } from '../../store/useStoryStore'
import type { ChoiceFlowNode } from '../../types/story'
import { EffectsEditor } from '../variables/EffectsEditor'

interface ChoiceInspectorProps {
  node: ChoiceFlowNode
}

export function ChoiceInspector({ node }: ChoiceInspectorProps) {
  const nodes = useStoryStore((state) => state.nodes)
  const edges = useStoryStore((state) => state.edges)
  const variables = useStoryStore((state) => state.variables)
  const updateChoiceTitle = useStoryStore((state) => state.updateChoiceTitle)
  const addOption = useStoryStore((state) => state.addOption)
  const updateOption = useStoryStore((state) => state.updateOption)
  const updateOptionEffects = useStoryStore(
    (state) => state.updateOptionEffects,
  )
  const removeOption = useStoryStore((state) => state.removeOption)
  const deleteNode = useStoryStore((state) => state.deleteNode)

  const options = node.data.options
  const connectedCount = options.filter((option) =>
    findEdgeForOption(node.id, option.id, edges),
  ).length

  const handleDelete = () => {
    if (!window.confirm('确定删除这个选项节点吗？与它相连的线也会一起移除。')) {
      return
    }
    deleteNode(node.id)
  }

  return (
    <div className="inspector__body">
      <div className="inspector__section">
        <label className="field-label" htmlFor={`choice-title-${node.id}`}>
          选择标题
        </label>
        <input
          id={`choice-title-${node.id}`}
          className="text-input text-input--title"
          value={node.data.title}
          maxLength={50}
          placeholder="玩家正在做什么选择？"
          onChange={(event) =>
            updateChoiceTitle(node.id, event.target.value)
          }
        />
      </div>

      <div className="inspector__section">
        <div className="inspector__section-head">
          <span className="field-label">选项列表</span>
          <span className="inspector__badge">
            {connectedCount}/{options.length} 已连接
          </span>
        </div>

        <div className="option-list">
          {options.map((option, index) => {
            const edge = findEdgeForOption(node.id, option.id, edges)
            const target = edge
              ? nodes.find((item) => item.id === edge.target)
              : undefined

            return (
              <div
                key={option.id}
                className="option-editor"
                style={
                  {
                    '--option-color':
                      OPTION_COLORS[index % OPTION_COLORS.length],
                  } as CSSProperties
                }
              >
                <div className="option-editor__row">
                  <span className="option-editor__index">{index + 1}</span>
                  <input
                    className="text-input option-editor__input"
                    value={option.label}
                    maxLength={40}
                    placeholder={`选项 ${index + 1}`}
                    aria-label={`选项 ${index + 1} 名称`}
                    onChange={(event) =>
                      updateOption(node.id, option.id, event.target.value)
                    }
                  />
                  <button
                    type="button"
                    className="icon-button icon-button--tiny"
                    onClick={() => removeOption(node.id, option.id)}
                    disabled={options.length <= 1}
                    title={
                      options.length <= 1
                        ? '选项节点至少保留一个选项'
                        : '删除这个选项'
                    }
                    aria-label={`删除选项 ${index + 1}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div
                  className={`option-editor__connection${
                    target ? ' is-connected' : ''
                  }`}
                >
                  <CornerDownRight size={13} />
                  {target ? (
                    <span>
                      {`连向${
                        target.type === 'scene'
                          ? '剧情块'
                          : target.type === 'choice'
                            ? '选项节点'
                            : '条件节点'
                      }「${target.data.title.trim() || '未命名'}」`}
                    </span>
                  ) : (
                    <span>从右侧的彩色圆点拖出一条线</span>
                  )}
                </div>

                <div className="option-editor__effects">
                  <span className="option-editor__effects-label">
                    选择后变量变化
                  </span>
                  <EffectsEditor
                    compact
                    effects={option.effects ?? []}
                    variables={variables}
                    onChange={(effects) =>
                      updateOptionEffects(node.id, option.id, effects)
                    }
                  />
                </div>
              </div>
            )
          })}
        </div>

        <button
          type="button"
          className="add-option-button"
          onClick={() => addOption(node.id)}
        >
          <Plus size={15} />
          添加选项
        </button>

        <div className="inspector__tip">
          <span className="inspector__tip-mark">TIP</span>
          每个选项右侧都有一个独立的连接点。把线拖到下一个剧情块、选项节点或条件节点，就能安排这条分支的后续。选项效果会在玩家选择后立即生效。
        </div>
      </div>

      <div className="inspector__danger">
        <button type="button" className="danger-button" onClick={handleDelete}>
          <Trash2 size={15} />
          删除此选项节点
        </button>
      </div>
    </div>
  )
}
