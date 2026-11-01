import {
  ArrowDown,
  ArrowUp,
  CornerDownRight,
  Plus,
  Trash2,
} from 'lucide-react'
import { useI18n } from '../../i18n'
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

export function ConditionInspector({ node }: ConditionInspectorProps) {
  const { t } = useI18n()
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

  const targetTypeLabel = (type: string) =>
    type === 'scene'
      ? t('conditionInspector.targetScene')
      : type === 'choice'
        ? t('conditionInspector.targetChoice')
        : t('conditionInspector.targetCondition')

  const findTarget = (sourceHandle: string) => {
    const edge = edges.find(
      (item) =>
        item.source === node.id && item.sourceHandle === sourceHandle,
    )
    return edge ? nodes.find((item) => item.id === edge.target) : undefined
  }

  const handleDelete = () => {
    if (!window.confirm(t('conditionInspector.confirmDelete'))) {
      return
    }
    deleteNode(node.id)
  }

  return (
    <div className="inspector__body">
      <div className="inspector__section">
        <label className="field-label" htmlFor={`condition-title-${node.id}`}>
          {t('conditionInspector.titleLabel')}
        </label>
        <input
          id={`condition-title-${node.id}`}
          className="text-input text-input--title"
          value={node.data.title}
          maxLength={50}
          placeholder={t('conditionInspector.titlePlaceholder')}
          onChange={(event) =>
            updateConditionTitle(node.id, event.target.value)
          }
        />
      </div>

      <div className="inspector__section">
        <div className="inspector__section-head">
          <span className="field-label">
            {t('conditionInspector.rulesLabel')}
          </span>
          <span className="inspector__badge">
            {t('conditionInspector.summary', { count: cases.length })}
          </span>
        </div>

        <div className="condition-list">
          {cases.length === 0 && (
            <div className="condition-empty">
              {variables.length === 0
                ? t('conditionInspector.noVariables')
                : t('conditionInspector.noRules')}
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
                    aria-label={t('conditionInspector.variableAria', {
                      index: index + 1,
                    })}
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
                      <option value="">
                        {t('conditionInspector.noVariableOption')}
                      </option>
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
                    aria-label={t('conditionInspector.operatorAria', {
                      index: index + 1,
                    })}
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
                      aria-label={t('conditionInspector.valueAria', {
                        index: index + 1,
                      })}
                      onChange={(event) =>
                        updateConditionCase(node.id, condition.id, {
                          value: event.target.value === 'true',
                        })
                      }
                    >
                      <option value="true">{t('common.yes')}</option>
                      <option value="false">{t('common.no')}</option>
                    </select>
                  ) : (
                    <input
                      className="mini-input condition-editor__value"
                      type="number"
                      value={Number(condition.value)}
                      aria-label={t('conditionInspector.valueAria', {
                        index: index + 1,
                      })}
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
                      aria-label={t('conditionInspector.moveUp')}
                      title={t('conditionInspector.moveUpTitle')}
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
                      aria-label={t('conditionInspector.moveDown')}
                      title={t('conditionInspector.moveDownTitle')}
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
                      aria-label={t('conditionInspector.deleteRule')}
                      title={t('conditionInspector.deleteRule')}
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
                      ? t('conditionInspector.connectedTo', {
                          type: targetTypeLabel(target.type),
                          title:
                            target.data.title.trim() ||
                            t('common.untitled'),
                        })
                      : t('conditionInspector.notConnected')}
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
          {t('conditionInspector.addRule')}
        </button>

        <div className="condition-else">
          <div className="condition-else__head">
            <span>{t('conditionInspector.elseTitle')}</span>
            <span className="condition-else__hint">
              {t('conditionInspector.elseHint')}
            </span>
          </div>
          <div
            className={`condition-editor__connection${
              findTarget('else') ? ' is-connected' : ''
            }`}
          >
            <CornerDownRight size={13} />
            {findTarget('else') ? (
              <span>
                {t('conditionInspector.elseConnected', {
                  type: targetTypeLabel(findTarget('else')!.type),
                  title:
                    findTarget('else')!.data.title.trim() ||
                    t('common.untitled'),
                })}
              </span>
            ) : (
              <span>{t('conditionInspector.elseDisconnected')}</span>
            )}
          </div>
        </div>

        <div className="inspector__tip">
          <span className="inspector__tip-mark">TIP</span>
          {t('conditionInspector.tip')}
        </div>
      </div>

      <div className="inspector__danger">
        <button type="button" className="danger-button" onClick={handleDelete}>
          <Trash2 size={15} />
          {t('conditionInspector.delete')}
        </button>
      </div>
    </div>
  )
}
