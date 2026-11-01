import { useEffect } from 'react'
import { Hash, Plus, ToggleLeft, Trash2, Variable, X } from 'lucide-react'
import { countVariableUsage } from '../../lib/variables'
import { useStoryStore } from '../../store/useStoryStore'
import type { StoryVariable } from '../../types/story'

interface VariablesDialogProps {
  onClose: () => void
}

export function VariablesDialog({ onClose }: VariablesDialogProps) {
  const variables = useStoryStore((state) => state.variables)
  const nodes = useStoryStore((state) => state.nodes)
  const addVariable = useStoryStore((state) => state.addVariable)
  const updateVariable = useStoryStore((state) => state.updateVariable)
  const deleteVariable = useStoryStore((state) => state.deleteVariable)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.isComposing) onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  const handleDelete = (variable: StoryVariable) => {
    const usage = countVariableUsage(variable.id, nodes)
    const detail =
      usage > 0
        ? `它正被 ${usage} 处选项、剧情块或条件引用，删除后这些设置也会一起移除。`
        : ''
    if (
      !window.confirm(
        `确定删除变量「${variable.name}」吗？${detail}`,
      )
    ) {
      return
    }
    deleteVariable(variable.id)
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="variables-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="variables-dialog-title"
      >
        <header className="variables-dialog__header">
          <span className="variables-dialog__icon">
            <Variable size={20} />
          </span>
          <div className="variables-dialog__heading">
            <h2 id="variables-dialog-title">变量管理</h2>
            <p>
              好感度、flag、路线状态都放在这里。变量可以在选项或剧情块中改变，也可以用条件节点判断。
            </p>
          </div>
          <button
            type="button"
            className="icon-button icon-button--soft"
            onClick={onClose}
            aria-label="关闭变量管理"
          >
            <X size={18} />
          </button>
        </header>

        <div className="variables-dialog__body">
          {variables.length === 0 && (
            <div className="variables-empty">
              <span className="variables-empty__mark">VARIABLE</span>
              <h3>还没有定义变量</h3>
              <p>
                先创建一个「好感度」数值变量，或一个「是否见过她」开关变量，然后在选项、剧情块和条件节点里使用它。
              </p>
            </div>
          )}

          {variables.map((variable) => {
            const usage = countVariableUsage(variable.id, nodes)
            const isBoolean = variable.kind === 'boolean'

            return (
              <article className="variable-card" key={variable.id}>
                <div className="variable-card__top">
                  <span
                    className={`variable-card__kind${
                      isBoolean ? ' is-boolean' : ''
                    }`}
                  >
                    {isBoolean ? (
                      <ToggleLeft size={13} />
                    ) : (
                      <Hash size={13} />
                    )}
                    {isBoolean ? '开关' : '数值'}
                  </span>
                  <span className="variable-card__usage">
                    {usage > 0 ? `被引用 ${usage} 次` : '尚未使用'}
                  </span>
                </div>

                <div className="variable-card__fields">
                  <label className="variable-field variable-field--name">
                    <span>变量名称</span>
                    <input
                      className="text-input"
                      value={variable.name}
                      maxLength={40}
                      placeholder="例如：好感度"
                      onChange={(event) =>
                        updateVariable(variable.id, {
                          name: event.target.value,
                        })
                      }
                      onBlur={() => {
                        if (!variable.name.trim()) {
                          updateVariable(variable.id, {
                            name: '未命名变量',
                          })
                        }
                      }}
                    />
                  </label>

                  <label className="variable-field variable-field--initial">
                    <span>初始值</span>
                    {isBoolean ? (
                      <select
                        className="text-input"
                        value={variable.initialValue ? 'true' : 'false'}
                        onChange={(event) =>
                          updateVariable(variable.id, {
                            initialValue: event.target.value === 'true',
                          })
                        }
                      >
                        <option value="false">否</option>
                        <option value="true">是</option>
                      </select>
                    ) : (
                      <input
                        className="text-input"
                        type="number"
                        value={Number(variable.initialValue)}
                        onChange={(event) => {
                          const value = Number(event.target.value)
                          updateVariable(variable.id, {
                            initialValue: Number.isFinite(value) ? value : 0,
                          })
                        }}
                      />
                    )}
                  </label>

                  <button
                    type="button"
                    className="icon-button icon-button--tiny variable-card__delete"
                    title="删除变量"
                    aria-label={`删除变量 ${variable.name}`}
                    onClick={() => handleDelete(variable)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <label className="variable-field variable-field--description">
                  <span>用途说明</span>
                  <input
                    className="text-input"
                    value={variable.description}
                    maxLength={120}
                    placeholder="例如：女主对男主的好感度"
                    onChange={(event) =>
                      updateVariable(variable.id, {
                        description: event.target.value,
                      })
                    }
                  />
                </label>
              </article>
            )
          })}

          <div className="variables-dialog__add">
            <button
              type="button"
              className="button button--primary"
              onClick={() => addVariable('number')}
            >
              <Plus size={15} />
              新建数值变量
            </button>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => addVariable('boolean')}
            >
              <Plus size={15} />
              新建开关变量
            </button>
          </div>
        </div>

        <footer className="variables-dialog__footer">
          <span>变量类型创建后固定；需要改变类型时请新建一个变量。</span>
          <span>所有变量会随工程文件一起导出。</span>
        </footer>
      </div>
    </div>
  )
}
