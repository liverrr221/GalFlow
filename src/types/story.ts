import type { Edge, Node } from '@xyflow/react'

export type StoryNodeKind = 'scene' | 'choice' | 'condition'

export type VariableKind = 'number' | 'boolean'
export type VariableValue = number | boolean

export interface StoryVariable {
  id: string
  name: string
  kind: VariableKind
  initialValue: VariableValue
  description: string
}

export type EffectOperation = 'add' | 'subtract' | 'set'

export interface VariableEffect {
  id: string
  variableId: string
  operation: EffectOperation
  value: VariableValue
}

export interface ChoiceOption {
  id: string
  label: string
  effects: VariableEffect[]
}

export type ConditionOperator = '>=' | '>' | '==' | '!=' | '<' | '<='

export interface ConditionCase {
  id: string
  variableId: string
  operator: ConditionOperator
  value: VariableValue
}

export interface SceneNodeData extends Record<string, unknown> {
  kind: 'scene'
  title: string
  content: string
  fontSize: number
  effects: VariableEffect[]
}

export interface ChoiceNodeData extends Record<string, unknown> {
  kind: 'choice'
  title: string
  options: ChoiceOption[]
}

export interface ConditionNodeData extends Record<string, unknown> {
  kind: 'condition'
  title: string
  cases: ConditionCase[]
}

export type StoryNodeData = SceneNodeData | ChoiceNodeData | ConditionNodeData

export type SceneFlowNode = Node<SceneNodeData, 'scene'>
export type ChoiceFlowNode = Node<ChoiceNodeData, 'choice'>
export type ConditionFlowNode = Node<ConditionNodeData, 'condition'>
export type StoryNode = SceneFlowNode | ChoiceFlowNode | ConditionFlowNode

export interface StoryEdgeData extends Record<string, unknown> {
  optionId?: string
  optionLabel?: string
  conditionCaseId?: string
  conditionLabel?: string
}

export type StoryEdge = Edge<StoryEdgeData, 'story'>

export interface StorySnapshot {
  title: string
  variables: StoryVariable[]
  nodes: StoryNode[]
  edges: StoryEdge[]
}

export interface StoryCanvasSnapshot extends StorySnapshot {
  id: string
  updatedAt: string
}
