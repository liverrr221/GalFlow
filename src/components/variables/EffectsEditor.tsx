import { Plus, Trash2 } from 'lucide-react'
import { useI18n } from '../../i18n'
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

const NUMBER_OPERATIONS: EffectOperation[] = ['add', 'subtract', 'set']

const OPERATION_KEYS = {
  add: 'effects.addOperation',
  subtract: 'effects.subtractOperation',
  set: 'effects.setOperation',
} as const

export function EffectsEditor({
  effects,
  variables,
  onChange,
  compact = false,
}: EffectsEditorProps) {
  const { t } = useI18n()
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
            ? t('effects.noVariables')
            : t('effects.noEffects')}
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
              aria-label={t('effects.variableAria')}
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
              aria-label={t('effects.operationAria')}
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
              {(isBoolean
                ? NUMBER_OPERATIONS.slice(2)
                : NUMBER_OPERATIONS
              ).map((operation) => (
                <option key={operation} value={operation}>
                  {t(OPERATION_KEYS[operation])}
                </option>
              ))}
            </select>

            {isBoolean ? (
              <select
                className="mini-select effect-row__value"
                value={effect.value ? 'true' : 'false'}
                aria-label={t('effects.valueAria')}
                onChange={(event) =>
                  updateEffect(effect.id, {
                    value: event.target.value === 'true',
                  })
                }
              >
                <option value="true">{t('common.yes')}</option>
                <option value="false">{t('common.no')}</option>
              </select>
            ) : (
              <input
                className="mini-input effect-row__value"
                type="number"
                value={Number(effect.value)}
                aria-label={t('effects.numberAria')}
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
              title={t('effects.delete')}
              aria-label={t('effects.delete')}
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
        {t('effects.add')}
      </button>
    </div>
  )
}
