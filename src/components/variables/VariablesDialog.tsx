import { useEffect } from 'react'
import { Hash, Plus, ToggleLeft, Trash2, Variable, X } from 'lucide-react'
import { useI18n } from '../../i18n'
import { countVariableUsage } from '../../lib/variables'
import { useStoryStore } from '../../store/useStoryStore'
import type { StoryVariable } from '../../types/story'

interface VariablesDialogProps {
  onClose: () => void
}

export function VariablesDialog({ onClose }: VariablesDialogProps) {
  const { t } = useI18n()
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
        ? t('variables.confirmDeleteUsage', { count: usage })
        : ''
    if (
      !window.confirm(
        t('variables.confirmDelete', {
          name: variable.name,
          detail,
        }),
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
            <h2 id="variables-dialog-title">{t('variables.title')}</h2>
            <p>{t('variables.subtitle')}</p>
          </div>
          <button
            type="button"
            className="icon-button icon-button--soft"
            onClick={onClose}
            aria-label={t('variables.closeAria')}
          >
            <X size={18} />
          </button>
        </header>

        <div className="variables-dialog__body">
          {variables.length === 0 && (
            <div className="variables-empty">
              <span className="variables-empty__mark">VARIABLE</span>
              <h3>{t('variables.emptyTitle')}</h3>
              <p>{t('variables.emptyText')}</p>
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
                    {isBoolean
                      ? t('variables.kindBoolean')
                      : t('variables.kindNumber')}
                  </span>
                  <span className="variable-card__usage">
                    {usage > 0
                      ? t('variables.usage', { count: usage })
                      : t('variables.unused')}
                  </span>
                </div>

                <div className="variable-card__fields">
                  <label className="variable-field variable-field--name">
                    <span>{t('variables.nameLabel')}</span>
                    <input
                      className="text-input"
                      value={variable.name}
                      maxLength={40}
                      placeholder={t('variables.namePlaceholder')}
                      onChange={(event) =>
                        updateVariable(variable.id, {
                          name: event.target.value,
                        })
                      }
                      onBlur={() => {
                        if (!variable.name.trim()) {
                          updateVariable(variable.id, {
                            name: t('variables.unnamed'),
                          })
                        }
                      }}
                    />
                  </label>

                  <label className="variable-field variable-field--initial">
                    <span>{t('variables.initialLabel')}</span>
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
                        <option value="false">{t('common.no')}</option>
                        <option value="true">{t('common.yes')}</option>
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
                    title={t('common.delete')}
                    aria-label={t('variables.deleteAria', {
                      name: variable.name,
                    })}
                    onClick={() => handleDelete(variable)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <label className="variable-field variable-field--description">
                  <span>{t('variables.descriptionLabel')}</span>
                  <input
                    className="text-input"
                    value={variable.description}
                    maxLength={120}
                    placeholder={t('variables.descriptionPlaceholder')}
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
              {t('variables.addNumber')}
            </button>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => addVariable('boolean')}
            >
              <Plus size={15} />
              {t('variables.addBoolean')}
            </button>
          </div>
        </div>

        <footer className="variables-dialog__footer">
          <span>{t('variables.footerFixed')}</span>
          <span>{t('variables.footerExport')}</span>
        </footer>
      </div>
    </div>
  )
}
