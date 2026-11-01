import { CornerDownRight, Plus, Trash2 } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useI18n } from '../../i18n'
import { OPTION_COLORS } from '../../lib/constants'
import { findEdgeForOption } from '../../lib/graph'
import { useStoryStore } from '../../store/useStoryStore'
import type { ChoiceFlowNode } from '../../types/story'
import { EffectsEditor } from '../variables/EffectsEditor'

interface ChoiceInspectorProps {
  node: ChoiceFlowNode
}

export function ChoiceInspector({ node }: ChoiceInspectorProps) {
  const { t } = useI18n()
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
    if (!window.confirm(t('choiceInspector.confirmDelete'))) {
      return
    }
    deleteNode(node.id)
  }

  return (
    <div className="inspector__body">
      <div className="inspector__section">
        <label className="field-label" htmlFor={`choice-title-${node.id}`}>
          {t('choiceInspector.titleLabel')}
        </label>
        <input
          id={`choice-title-${node.id}`}
          className="text-input text-input--title"
          value={node.data.title}
          maxLength={50}
          placeholder={t('choiceInspector.titlePlaceholder')}
          onChange={(event) =>
            updateChoiceTitle(node.id, event.target.value)
          }
        />
      </div>

      <div className="inspector__section">
        <div className="inspector__section-head">
          <span className="field-label">
            {t('choiceInspector.optionsLabel')}
          </span>
          <span className="inspector__badge">
            {t('choiceInspector.connectedCount', {
              connected: connectedCount,
              total: options.length,
            })}
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
                    placeholder={t('choiceInspector.optionPlaceholder', {
                      index: index + 1,
                    })}
                    aria-label={t('choiceInspector.optionAria', {
                      index: index + 1,
                    })}
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
                        ? t('choiceInspector.keepOne')
                        : t('choiceInspector.deleteOption')
                    }
                    aria-label={t('choiceInspector.deleteOptionAria', {
                      index: index + 1,
                    })}
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
                      {t('choiceInspector.connectsTo', {
                        type:
                          target.type === 'scene'
                            ? t('choiceInspector.targetScene')
                            : target.type === 'choice'
                              ? t('choiceInspector.targetChoice')
                              : t('choiceInspector.targetCondition'),
                        title:
                          target.data.title.trim() || t('common.untitled'),
                      })}
                    </span>
                  ) : (
                    <span>{t('choiceInspector.disconnected')}</span>
                  )}
                </div>

                <div className="option-editor__effects">
                  <span className="option-editor__effects-label">
                    {t('choiceInspector.effectsLabel')}
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
          {t('choiceInspector.addOption')}
        </button>

        <div className="inspector__tip">
          <span className="inspector__tip-mark">TIP</span>
          {t('choiceInspector.tip')}
        </div>
      </div>

      <div className="inspector__danger">
        <button type="button" className="danger-button" onClick={handleDelete}>
          <Trash2 size={15} />
          {t('choiceInspector.delete')}
        </button>
      </div>
    </div>
  )
}
