import { Plus, Trash2 } from 'lucide-react'
import { createId } from '../../lib/ids'
import { createEffectForVariable } from '../../lib/variables'
import type {
  EffectOperation,
  StoryVariable,
  VariableEffect,
} from '../../types/story'

interface EffectsEditorProps {
  effects: VariableEffect[]
  variables: StoryVariable[]
  onChange: (effects: VariableEffect[]) => void
  compact?: boolean
}

const NUMBER_OPERATIONS: Array<{ value: EffectOperation; label: string }> = [
  { value: 'add', label: '增加' },
  { value: 'subtract', label: '减少' },
  { value: 'set', label: '设为' },
]

export function EffectsEditor({
  effects,
  variables,
  onChange,
  compact = false,
}: EffectsEditorProps) {
  const addEffect = () => {
    const variable = variables[0]
    if (!variable) return

    onChange([
      ...effects,
      {
        id: createId('effect'),
        ...createEffectForVariable(variable),
      },
    ])
  }

  const updateEffect = (effectId: string, patch: Partial<VariableEffect>) => {
    onChange(
      effects.map((effect) =>
        effect.id === effectId ? { ...effect, ...patch } : effect,
      ),
    )
  }

  const handleVariableChange = (effect: VariableEffect, variableId: string) => {
    const variable = variables.find((item) => item.id === variableId)
    if (!variable) return

    if (variable.kind === 'boolean') {
      updateEffect(effect.id, {
        variableId,
        operation: 'set',
        value: true,
      })
      return
    }

    updateEffect(effect.id, {
      variableId,
      operation:
        effect.operation === 'add' || effect.operation === 'subtract'
          ? effect.operation
          : 'set',
      value:
        typeof effect.value === 'number' && Number.isFinite(effect.value)
          ? effect.value
          : 1,
    })
  }

  return (
    <div className={`effects-editor${compact ? ' is-compact' : ''}`}>
      {effects.length === 0 && (
        <p className="effects-editor__empty">
          {variables.length === 0
            ? '还没有变量，请先在顶栏「变量」中创建。'
            : '暂时没有变量变化。'}
        </p>
      )}

      {effects.map((effect) => {
        const variable = variables.find(
          (item) => item.id === effect.variableId,
        )
        const isBoolean = variable?.kind === 'boolean'

        return (
          <div className="effect-row" key={effect.id}>
            <select
              className="mini-select effect-row__variable"
              value={effect.variableId}
              aria-label="变量"
              onChange={(event) =>
                handleVariableChange(effect, event.target.value)
              }
            >
              {variables.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <select
              className="mini-select effect-row__operation"
              value={isBoolean ? 'set' : effect.operation}
              aria-label="操作"
              disabled={isBoolean}
              onChange={(event) =>
                updateEffect(effect.id, {
                  operation: event.target.value as EffectOperation,
                  value:
                    typeof effect.value === 'number'
                      ? effect.value
                      : 1,
                })
              }
            >
              {(isBoolean ? [NUMBER_OPERATIONS[2]] : NUMBER_OPERATIONS).map(
                (operation) => (
                  <option key={operation.value} value={operation.value}>
                    {operation.label}
                  </option>
                ),
              )}
            </select>

            {isBoolean ? (
              <select
                className="mini-select effect-row__value"
                value={effect.value ? 'true' : 'false'}
                aria-label="变量值"
                onChange={(event) =>
                  updateEffect(effect.id, {
                    value: event.target.value === 'true',
                  })
                }
              >
                <option value="true">是</option>
                <option value="false">否</option>
              </select>
            ) : (
              <input
                className="mini-input effect-row__value"
                type="number"
                value={Number(effect.value)}
                aria-label="变量数值"
                onChange={(event) => {
                  const value = Number(event.target.value)
                  updateEffect(effect.id, {
                    value: Number.isFinite(value) ? value : 0,
                  })
                }}
              />
            )}

            <button
              type="button"
              className="icon-button icon-button--tiny"
              title="删除变量变化"
              aria-label="删除变量变化"
              onClick={() =>
                onChange(effects.filter((item) => item.id !== effect.id))
              }
            >
              <Trash2 size={13} />
            </button>
          </div>
        )
      })}

      <button
        type="button"
        className="effects-editor__add"
        onClick={addEffect}
        disabled={variables.length === 0}
      >
        <Plus size={13} />
        添加变量变化
      </button>
    </div>
  )
}
