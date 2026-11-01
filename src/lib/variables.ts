import { currentLanguage } from '../i18n'
import { translate, type Language } from '../i18n/translations'
import type {
  ConditionCase,
  ConditionOperator,
  StoryNode,
  StoryVariable,
  VariableEffect,
  VariableValue,
} from '../types/story'

export const CONDITION_OPERATORS: Array<{
  value: ConditionOperator
  label: string
  booleanOnly?: boolean
  numberOnly?: boolean
}> = [
  { value: '>=', label: '≥', numberOnly: true },
  { value: '>', label: '>', numberOnly: true },
  { value: '==', label: '=' },
  { value: '!=', label: '≠' },
  { value: '<', label: '<', numberOnly: true },
  { value: '<=', label: '≤', numberOnly: true },
]

export function getOperatorsForVariable(variable?: StoryVariable) {
  if (!variable || variable.kind === 'number') return CONDITION_OPERATORS
  return CONDITION_OPERATORS.filter(
    (operator) => !operator.numberOnly && !operator.booleanOnly,
  )
}

export function isBooleanVariable(
  variable: StoryVariable | undefined,
): variable is StoryVariable & { kind: 'boolean' } {
  return variable?.kind === 'boolean'
}

export function formatVariableValue(
  variable: StoryVariable | undefined,
  value: VariableValue,
  language: Language = currentLanguage(),
): string {
  const tr = (key: 'lib.boolTrue' | 'lib.boolFalse') =>
    translate(language, key)
  if (variable?.kind === 'boolean') {
    return value ? tr('lib.boolTrue') : tr('lib.boolFalse')
  }
  return String(value)
}

export function formatVariableInitialValue(
  variable: StoryVariable,
  language?: Language,
): string {
  return formatVariableValue(variable, variable.initialValue, language)
}

export function findVariable(
  variables: StoryVariable[],
  id: string,
): StoryVariable | undefined {
  return variables.find((variable) => variable.id === id)
}

export function formatEffect(
  effect: VariableEffect,
  variables: StoryVariable[],
  language: Language = currentLanguage(),
): string {
  const variable = findVariable(variables, effect.variableId)
  if (!variable) return translate(language, 'lib.unknownVariable')

  if (variable.kind === 'boolean') {
    return `${variable.name} = ${translate(
      language,
      effect.value ? 'lib.boolTrue' : 'lib.boolFalse',
    )}`
  }

  if (effect.operation === 'add') {
    return `${variable.name} +${effect.value}`
  }
  if (effect.operation === 'subtract') {
    return `${variable.name} -${Math.abs(Number(effect.value))}`
  }
  return `${variable.name} = ${effect.value}`
}

export function formatEffectList(
  effects: VariableEffect[],
  variables: StoryVariable[],
  language: Language = currentLanguage(),
): string {
  if (effects.length === 0) return ''
  return effects
    .map((effect) => formatEffect(effect, variables, language))
    .join(translate(language, 'lib.listSeparator'))
}

export function formatConditionCase(
  condition: ConditionCase,
  variables: StoryVariable[],
  language: Language = currentLanguage(),
): string {
  const variable = findVariable(variables, condition.variableId)
  if (!variable) return translate(language, 'lib.unsetVariable')

  const operator =
    CONDITION_OPERATORS.find((item) => item.value === condition.operator)
      ?.label ?? condition.operator

  if (variable.kind === 'boolean') {
    if (condition.operator === '!=') {
      return `${variable.name} ≠ ${translate(
        language,
        condition.value ? 'lib.boolTrue' : 'lib.boolFalse',
      )}`
    }
    return `${variable.name} = ${translate(
      language,
      condition.value ? 'lib.boolTrue' : 'lib.boolFalse',
    )}`
  }

  return `${variable.name} ${operator} ${condition.value}`
}

export function createEffectForVariable(
  variable: StoryVariable,
): Omit<VariableEffect, 'id'> {
  if (variable.kind === 'boolean') {
    return { variableId: variable.id, operation: 'set', value: true }
  }
  return { variableId: variable.id, operation: 'add', value: 1 }
}

export function createConditionForVariable(
  variable: StoryVariable,
): Omit<ConditionCase, 'id'> {
  if (variable.kind === 'boolean') {
    return {
      variableId: variable.id,
      operator: '==',
      value: true,
    }
  }
  return {
    variableId: variable.id,
    operator: '>=',
    value: 1,
  }
}

export function countVariableUsage(
  variableId: string,
  nodes: StoryNode[],
): number {
  let count = 0

  nodes.forEach((node) => {
    if (node.type === 'scene') {
      count += node.data.effects.filter(
        (effect) => effect.variableId === variableId,
      ).length
      return
    }

    if (node.type === 'choice') {
      node.data.options.forEach((option) => {
        count += option.effects.filter(
          (effect) => effect.variableId === variableId,
        ).length
      })
      return
    }

    count += node.data.cases.filter(
      (condition) => condition.variableId === variableId,
    ).length
  })

  return count
}
