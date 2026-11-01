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
): string {
  if (variable?.kind === 'boolean') return value ? '是' : '否'
  return String(value)
}

export function formatVariableInitialValue(variable: StoryVariable): string {
  return formatVariableValue(variable, variable.initialValue)
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
): string {
  const variable = findVariable(variables, effect.variableId)
  if (!variable) return '未知变量'

  if (variable.kind === 'boolean') {
    return `${variable.name} = ${effect.value ? '是' : '否'}`
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
): string {
  if (effects.length === 0) return ''
  return effects.map((effect) => formatEffect(effect, variables)).join('、')
}

export function formatConditionCase(
  condition: ConditionCase,
  variables: StoryVariable[],
): string {
  const variable = findVariable(variables, condition.variableId)
  if (!variable) return '未设置变量'

  const operator =
    CONDITION_OPERATORS.find((item) => item.value === condition.operator)
      ?.label ?? condition.operator

  if (variable.kind === 'boolean') {
    if (condition.operator === '!=') {
      return `${variable.name} ≠ ${condition.value ? '是' : '否'}`
    }
    return `${variable.name} = ${condition.value ? '是' : '否'}`
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
