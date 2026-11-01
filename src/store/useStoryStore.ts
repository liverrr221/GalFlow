import {
  MarkerType,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type XYPosition,
} from '@xyflow/react'
import { create } from 'zustand'
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from 'zustand/middleware'
import {
  APP_STORAGE_KEY,
  DEFAULT_FONT_SIZE,
  optionLetter,
} from '../lib/constants'
import { createId } from '../lib/ids'
import { createSampleStory } from '../lib/sampleStory'
import {
  createConditionForVariable,
  formatConditionCase,
} from '../lib/variables'
import type {
  ChoiceFlowNode,
  ChoiceNodeData,
  ChoiceOption,
  ConditionCase,
  ConditionFlowNode,
  ConditionNodeData,
  ConditionOperator,
  SceneNodeData,
  StoryCanvasSnapshot,
  StoryEdge,
  StoryNode,
  StorySnapshot,
  StoryVariable,
  VariableEffect,
  VariableKind,
  VariableValue,
} from '../types/story'

interface ScenePatch {
  title?: string
  content?: string
  fontSize?: number
  effects?: VariableEffect[]
}

interface VariablePatch {
  name?: string
  initialValue?: VariableValue
  description?: string
}

interface ConditionCasePatch {
  variableId?: string
  operator?: ConditionOperator
  value?: VariableValue
}

interface StoryState {
  activeCanvasId: string
  inactiveCanvases: StoryCanvasSnapshot[]
  title: string
  variables: StoryVariable[]
  nodes: StoryNode[]
  edges: StoryEdge[]
  selectedNodeId: string | null

  createCanvas: () => string
  switchCanvas: (canvasId: string) => void
  deleteCanvas: (canvasId: string) => void
  setTitle: (title: string) => void
  selectNode: (nodeId: string | null) => void
  addVariable: (kind: VariableKind) => string
  updateVariable: (variableId: string, patch: VariablePatch) => void
  deleteVariable: (variableId: string) => void
  addScene: (position: XYPosition) => string
  addChoice: (position: XYPosition) => string
  addCondition: (position: XYPosition) => string
  updateScene: (nodeId: string, patch: ScenePatch) => void
  updateChoiceTitle: (nodeId: string, title: string) => void
  addOption: (nodeId: string) => string | null
  updateOption: (nodeId: string, optionId: string, label: string) => void
  updateOptionEffects: (
    nodeId: string,
    optionId: string,
    effects: VariableEffect[],
  ) => void
  removeOption: (nodeId: string, optionId: string) => void
  updateConditionTitle: (nodeId: string, title: string) => void
  addConditionCase: (nodeId: string) => string | null
  updateConditionCase: (
    nodeId: string,
    caseId: string,
    patch: ConditionCasePatch,
  ) => void
  moveConditionCase: (
    nodeId: string,
    caseId: string,
    direction: 'up' | 'down',
  ) => void
  removeConditionCase: (nodeId: string, caseId: string) => void
  deleteNode: (nodeId: string) => void
  deleteEdge: (edgeId: string) => void
  onNodesChange: (changes: NodeChange<StoryNode>[]) => void
  onEdgesChange: (changes: EdgeChange<StoryEdge>[]) => void
  onConnect: (connection: Connection) => void
  loadSample: () => void
  importStory: (snapshot: StorySnapshot) => void
  clearStory: () => void
}

function createDebouncedStorage(delay = 350): StateStorage {
  let timer: ReturnType<typeof setTimeout> | null = null
  let queued: { name: string; value: string } | null = null

  const flush = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (!queued) return

    try {
      localStorage.setItem(queued.name, queued.value)
    } catch {
      // Storage can be unavailable in private browsing modes. The editor must
      // remain usable even when persistence is not.
    }
    queued = null
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flush)
  }

  return {
    getItem: (name) => {
      try {
        return localStorage.getItem(name)
      } catch {
        return null
      }
    },
    setItem: (name, value) => {
      queued = { name, value }
      if (timer) clearTimeout(timer)
      timer = setTimeout(flush, delay)
    },
    removeItem: (name) => {
      queued = null
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      try {
        localStorage.removeItem(name)
      } catch {
        // Ignore unavailable storage.
      }
    },
  }
}

const storyStorage = createDebouncedStorage(350)

const initialStory = createSampleStory()
const initialCanvasId = createId('canvas')

type CanvasCarrier = Pick<
  StoryState,
  'activeCanvasId' | 'inactiveCanvases' | 'title' | 'variables' | 'nodes' | 'edges'
>

function snapshotActiveCanvas(state: CanvasCarrier): StoryCanvasSnapshot {
  return {
    id: state.activeCanvasId,
    title: state.title,
    variables: state.variables,
    nodes: state.nodes.map((node) => ({ ...node, selected: false })),
    edges: state.edges.map((edge) => ({ ...edge, selected: false })),
    updatedAt: new Date().toISOString(),
  }
}

function nextCanvasTitle(state: CanvasCarrier): string {
  const used = new Set([
    state.title,
    ...state.inactiveCanvases.map((canvas) => canvas.title),
  ])
  let index = state.inactiveCanvases.length + 2
  let title = `未命名剧情 ${index}`

  while (used.has(title)) {
    index += 1
    title = `未命名剧情 ${index}`
  }

  return title
}

function nextNodeTitle(
  nodes: StoryNode[],
  kind: 'scene' | 'choice' | 'condition',
): string {
  const base =
    kind === 'scene' ? '场景' : kind === 'choice' ? '选择' : '条件'
  const usedTitles = new Set(nodes.map((node) => node.data.title))
  let index = nodes.filter((node) => node.type === kind).length + 1

  while (usedTitles.has(`${base} ${index}`)) index += 1
  return `${base} ${index}`
}

function nextOptionLabel(options: ChoiceOption[]): string {
  let index = options.length
  let label = `选项 ${optionLetter(index)}`

  while (options.some((option) => option.label === label)) {
    index += 1
    label = `选项 ${optionLetter(index)}`
  }

  return label
}

function normalizeVariableValue(
  variable: StoryVariable,
  value: VariableValue,
): VariableValue {
  if (variable.kind === 'boolean') return Boolean(value)
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function normalizeConditionCase(
  condition: ConditionCase,
  variables: StoryVariable[],
): ConditionCase {
  const variable = variables.find(
    (candidate) => candidate.id === condition.variableId,
  )
  if (!variable) return condition

  if (variable.kind === 'boolean') {
    return {
      ...condition,
      operator: condition.operator === '!=' ? '!=' : '==',
      value: Boolean(condition.value),
    }
  }

  const operators: ConditionOperator[] = [
    '>=',
    '>',
    '==',
    '!=',
    '<',
    '<=',
  ]
  const number = Number(condition.value)

  return {
    ...condition,
    operator: operators.includes(condition.operator)
      ? condition.operator
      : '>=',
    value: Number.isFinite(number) ? number : 0,
  }
}

export const useStoryStore = create<StoryState>()(
  persist(
    (set, get) => ({
      activeCanvasId: initialCanvasId,
      inactiveCanvases: [],
      title: initialStory.title,
      variables: initialStory.variables,
      nodes: initialStory.nodes,
      edges: initialStory.edges,
      selectedNodeId: null,

      createCanvas: () => {
        const state = get()
        const current = snapshotActiveCanvas(state)
        const canvasId = createId('canvas')

        set({
          activeCanvasId: canvasId,
          inactiveCanvases: [current, ...state.inactiveCanvases],
          title: nextCanvasTitle(state),
          variables: [],
          nodes: [],
          edges: [],
          selectedNodeId: null,
        })
        return canvasId
      },

      switchCanvas: (canvasId) => {
        const state = get()
        if (canvasId === state.activeCanvasId) return
        const target = state.inactiveCanvases.find(
          (canvas) => canvas.id === canvasId,
        )
        if (!target) return

        const current = snapshotActiveCanvas(state)
        set({
          activeCanvasId: target.id,
          inactiveCanvases: [
            current,
            ...state.inactiveCanvases.filter(
              (canvas) => canvas.id !== target.id,
            ),
          ],
          title: target.title,
          variables: target.variables,
          nodes: target.nodes.map((node) => ({
            ...node,
            selected: false,
          })),
          edges: target.edges.map((edge) => ({
            ...edge,
            selected: false,
          })),
          selectedNodeId: null,
        })
      },

      deleteCanvas: (canvasId) => {
        const state = get()
        if (
          !state.inactiveCanvases.some(
            (canvas) => canvas.id === canvasId,
          ) &&
          canvasId !== state.activeCanvasId
        ) {
          return
        }

        if (canvasId === state.activeCanvasId) {
          if (state.inactiveCanvases.length === 0) return
          const [target, ...rest] = state.inactiveCanvases
          set({
            activeCanvasId: target.id,
            inactiveCanvases: rest,
            title: target.title,
            variables: target.variables,
            nodes: target.nodes.map((node) => ({
              ...node,
              selected: false,
            })),
            edges: target.edges.map((edge) => ({
              ...edge,
              selected: false,
            })),
            selectedNodeId: null,
          })
          return
        }

        set({
          inactiveCanvases: state.inactiveCanvases.filter(
            (canvas) => canvas.id !== canvasId,
          ),
        })
      },

      setTitle: (title) => set({ title }),

      selectNode: (nodeId) =>
        set((state) => ({
          selectedNodeId: nodeId,
          nodes: state.nodes.map((node) => ({
            ...node,
            selected: node.id === nodeId,
          })),
        })),

      addVariable: (kind) => {
        const id = createId('var')
        const usedNames = new Set(
          get().variables.map((variable) => variable.name),
        )
        let index = get().variables.length + 1
        let name = `变量 ${index}`

        while (usedNames.has(name)) {
          index += 1
          name = `变量 ${index}`
        }

        const variable: StoryVariable = {
          id,
          name,
          kind,
          initialValue: kind === 'boolean' ? false : 0,
          description: '',
        }

        set((state) => ({
          variables: [...state.variables, variable],
        }))
        return id
      },

      updateVariable: (variableId, patch) =>
        set((state) => ({
          variables: state.variables.map((variable) => {
            if (variable.id !== variableId) return variable
            const next = { ...variable, ...patch }
            if (patch.initialValue !== undefined) {
              next.initialValue = normalizeVariableValue(
                variable,
                patch.initialValue,
              )
            }
            return next
          }),
        })),

      deleteVariable: (variableId) =>
        set((state) => {
          const removedCasesByNode = new Map<string, Set<string>>()

          const nodes = state.nodes.map((node) => {
            if (node.type === 'scene') {
              return {
                ...node,
                data: {
                  ...node.data,
                  effects: node.data.effects.filter(
                    (effect) => effect.variableId !== variableId,
                  ),
                },
              }
            }

            if (node.type === 'choice') {
              return {
                ...node,
                data: {
                  ...node.data,
                  options: node.data.options.map((option) => ({
                    ...option,
                    effects: option.effects.filter(
                      (effect) => effect.variableId !== variableId,
                    ),
                  })),
                },
              }
            }

            const removed = new Set(
              node.data.cases
                .filter(
                  (condition) => condition.variableId === variableId,
                )
                .map((condition) => condition.id),
            )
            if (removed.size > 0) {
              removedCasesByNode.set(node.id, removed)
            }

            return {
              ...node,
              data: {
                ...node.data,
                cases: node.data.cases.filter(
                  (condition) => condition.variableId !== variableId,
                ),
              },
            }
          })

          return {
            variables: state.variables.filter(
              (variable) => variable.id !== variableId,
            ),
            nodes,
            edges: state.edges.filter((edge) => {
              const removed = removedCasesByNode.get(edge.source)
              return !removed?.has(edge.sourceHandle ?? '')
            }),
          }
        }),

      addScene: (position) => {
        const id = createId('scene')
        const node: StoryNode = {
          id,
          type: 'scene',
          position,
          selected: true,
          data: {
            kind: 'scene',
            title: nextNodeTitle(get().nodes, 'scene'),
            content: '',
            fontSize: DEFAULT_FONT_SIZE,
            effects: [],
          },
        }

        set((state) => ({
          nodes: [
            ...state.nodes.map((item) => ({ ...item, selected: false })),
            node,
          ],
          selectedNodeId: id,
        }))
        return id
      },

      addChoice: (position) => {
        const id = createId('choice')
        const optionAId = createId('option')
        const optionBId = createId('option')

        const node: ChoiceFlowNode = {
          id,
          type: 'choice',
          position,
          selected: true,
          data: {
            kind: 'choice',
            title: nextNodeTitle(get().nodes, 'choice'),
            options: [
              { id: optionAId, label: '选项 A', effects: [] },
              { id: optionBId, label: '选项 B', effects: [] },
            ],
          },
        }

        set((state) => ({
          nodes: [
            ...state.nodes.map((item) => ({ ...item, selected: false })),
            node,
          ],
          selectedNodeId: id,
        }))
        return id
      },

      addCondition: (position) => {
        const id = createId('condition')
        const firstVariable = get().variables[0]
        const cases: ConditionCase[] = firstVariable
          ? [
              {
                id: createId('case'),
                ...createConditionForVariable(firstVariable),
              },
            ]
          : []

        const node: ConditionFlowNode = {
          id,
          type: 'condition',
          position,
          selected: true,
          data: {
            kind: 'condition',
            title: nextNodeTitle(get().nodes, 'condition'),
            cases,
          },
        }

        set((state) => ({
          nodes: [
            ...state.nodes.map((item) => ({ ...item, selected: false })),
            node,
          ],
          selectedNodeId: id,
        }))
        return id
      },

      updateScene: (nodeId, patch) =>
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === nodeId && node.type === 'scene'
              ? {
                  ...node,
                  data: { ...node.data, ...patch } satisfies SceneNodeData,
                }
              : node,
          ),
        })),

      updateChoiceTitle: (nodeId, title) =>
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === nodeId && node.type === 'choice'
              ? {
                  ...node,
                  data: { ...node.data, title } satisfies ChoiceNodeData,
                }
              : node,
          ),
        })),

      addOption: (nodeId) => {
        const node = get().nodes.find(
          (item): item is ChoiceFlowNode =>
            item.id === nodeId && item.type === 'choice',
        )
        if (!node) return null

        const optionId = createId('option')
        set((state) => ({
          nodes: state.nodes.map((item) =>
            item.id === nodeId && item.type === 'choice'
              ? {
                  ...item,
                  data: {
                    ...item.data,
                    options: [
                      ...item.data.options,
                      {
                        id: optionId,
                        label: nextOptionLabel(item.data.options),
                        effects: [],
                      },
                    ],
                  },
                }
              : item,
          ),
        }))
        return optionId
      },

      updateOption: (nodeId, optionId, label) =>
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === nodeId && node.type === 'choice'
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    options: node.data.options.map((option) =>
                      option.id === optionId ? { ...option, label } : option,
                    ),
                  },
                }
              : node,
          ),
          edges: state.edges.map((edge) =>
            edge.source === nodeId && edge.sourceHandle === optionId
              ? {
                  ...edge,
                  data: { ...edge.data, optionLabel: label },
                }
              : edge,
          ),
        })),

      updateOptionEffects: (nodeId, optionId, effects) =>
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === nodeId && node.type === 'choice'
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    options: node.data.options.map((option) =>
                      option.id === optionId
                        ? { ...option, effects }
                        : option,
                    ),
                  },
                }
              : node,
          ),
        })),

      removeOption: (nodeId, optionId) =>
        set((state) => {
          const node = state.nodes.find(
            (item): item is ChoiceFlowNode =>
              item.id === nodeId && item.type === 'choice',
          )
          if (!node || node.data.options.length <= 1) return state

          return {
            nodes: state.nodes.map((item) =>
              item.id === nodeId && item.type === 'choice'
                ? {
                    ...item,
                    data: {
                      ...item.data,
                      options: item.data.options.filter(
                        (option) => option.id !== optionId,
                      ),
                    },
                  }
                : item,
            ),
            edges: state.edges.filter(
              (edge) =>
                !(
                  edge.source === nodeId &&
                  edge.sourceHandle === optionId
                ),
            ),
          }
        }),

      updateConditionTitle: (nodeId, title) =>
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === nodeId && node.type === 'condition'
              ? {
                  ...node,
                  data: { ...node.data, title } satisfies ConditionNodeData,
                }
              : node,
          ),
        })),

      addConditionCase: (nodeId) => {
        const node = get().nodes.find(
          (item): item is ConditionFlowNode =>
            item.id === nodeId && item.type === 'condition',
        )
        if (!node) return null

        const lastVariableId = node.data.cases.at(-1)?.variableId
        const variable =
          get().variables.find(
            (candidate) => candidate.id === lastVariableId,
          ) ?? get().variables[0]
        if (!variable) return null

        const caseId = createId('case')
        set((state) => ({
          nodes: state.nodes.map((item) =>
            item.id === nodeId && item.type === 'condition'
              ? {
                  ...item,
                  data: {
                    ...item.data,
                    cases: [
                      ...item.data.cases,
                      {
                        id: caseId,
                        ...createConditionForVariable(variable),
                      },
                    ],
                  },
                }
              : item,
          ),
        }))
        return caseId
      },

      updateConditionCase: (nodeId, caseId, patch) =>
        set((state) => ({
          nodes: state.nodes.map((node) => {
            if (node.id !== nodeId || node.type !== 'condition') return node

            return {
              ...node,
              data: {
                ...node.data,
                cases: node.data.cases.map((condition) =>
                  condition.id === caseId
                    ? normalizeConditionCase(
                        { ...condition, ...patch },
                        state.variables,
                      )
                    : condition,
                ),
              },
            }
          }),
        })),

      moveConditionCase: (nodeId, caseId, direction) =>
        set((state) => ({
          nodes: state.nodes.map((node) => {
            if (node.id !== nodeId || node.type !== 'condition') return node

            const index = node.data.cases.findIndex(
              (condition) => condition.id === caseId,
            )
            const target = direction === 'up' ? index - 1 : index + 1
            if (index < 0 || target < 0 || target >= node.data.cases.length) {
              return node
            }

            const cases = [...node.data.cases]
            ;[cases[index], cases[target]] = [cases[target], cases[index]]

            return { ...node, data: { ...node.data, cases } }
          }),
        })),

      removeConditionCase: (nodeId, caseId) =>
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === nodeId && node.type === 'condition'
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    cases: node.data.cases.filter(
                      (condition) => condition.id !== caseId,
                    ),
                  },
                }
              : node,
          ),
          edges: state.edges.filter(
            (edge) =>
              !(edge.source === nodeId && edge.sourceHandle === caseId),
          ),
        })),

      deleteNode: (nodeId) =>
        set((state) => ({
          nodes: state.nodes.filter((node) => node.id !== nodeId),
          edges: state.edges.filter(
            (edge) => edge.source !== nodeId && edge.target !== nodeId,
          ),
          selectedNodeId:
            state.selectedNodeId === nodeId ? null : state.selectedNodeId,
        })),

      deleteEdge: (edgeId) =>
        set((state) => ({
          edges: state.edges.filter((edge) => edge.id !== edgeId),
        })),

      onNodesChange: (changes) =>
        set((state) => {
          const removedIds = new Set(
            changes
              .filter((change) => change.type === 'remove')
              .map((change) => change.id),
          )
          const nextNodes = applyNodeChanges<StoryNode>(
            changes,
            state.nodes,
          )

          if (removedIds.size === 0) {
            return { nodes: nextNodes }
          }

          return {
            nodes: nextNodes,
            edges: state.edges.filter(
              (edge) =>
                !removedIds.has(edge.source) && !removedIds.has(edge.target),
            ),
            selectedNodeId:
              state.selectedNodeId && removedIds.has(state.selectedNodeId)
                ? null
                : state.selectedNodeId,
          }
        }),

      onEdgesChange: (changes) =>
        set((state) => ({
          edges: applyEdgeChanges<StoryEdge>(changes, state.edges),
        })),

      onConnect: (connection) => {
        const { source, target, sourceHandle } = connection
        if (!source || !target || source === target) return

        const state = get()
        const sourceNode = state.nodes.find((node) => node.id === source)
        const targetNode = state.nodes.find((node) => node.id === target)
        if (!sourceNode || !targetNode) return

        let optionLabel: string | undefined
        let optionId: string | undefined
        let conditionCaseId: string | undefined
        let conditionLabel: string | undefined

        if (sourceNode.type === 'choice') {
          const option = sourceNode.data.options.find(
            (item) => item.id === sourceHandle,
          )
          if (!option) return
          optionId = option.id
          optionLabel = option.label
        }

        if (sourceNode.type === 'condition') {
          if (sourceHandle === 'else') {
            conditionCaseId = 'else'
            conditionLabel = '否则'
          } else {
            const condition = sourceNode.data.cases.find(
              (item) => item.id === sourceHandle,
            )
            if (!condition) return
            conditionCaseId = condition.id
            conditionLabel = formatConditionCase(
              condition,
              state.variables,
            )
          }
        }

        const edgesWithoutOldConnection = state.edges.filter((edge) => {
          if (edge.source !== source) return true
          if (sourceNode.type === 'scene') return false
          return edge.sourceHandle !== sourceHandle
        })

        const newEdge: StoryEdge = {
          id: createId('edge'),
          source,
          target,
          sourceHandle,
          targetHandle: connection.targetHandle,
          type: 'story',
          data: {
            optionId,
            optionLabel,
            conditionCaseId,
            conditionLabel,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 18,
            height: 18,
            color: '#b9a9a0',
          },
        }

        set({ edges: addEdge(newEdge, edgesWithoutOldConnection) })
      },

      loadSample: () => {
        const sample = createSampleStory()
        set({
          title: sample.title,
          variables: sample.variables,
          nodes: sample.nodes,
          edges: sample.edges,
          selectedNodeId: null,
        })
      },

      importStory: (snapshot) =>
        set({
          title: snapshot.title,
          variables: snapshot.variables,
          nodes: snapshot.nodes.map((node) => ({
            ...node,
            selected: false,
          })),
          edges: snapshot.edges.map((edge) => ({
            ...edge,
            selected: false,
          })),
          selectedNodeId: null,
        }),

      clearStory: () =>
        set({
          title: '未命名剧情',
          variables: [],
          nodes: [],
          edges: [],
          selectedNodeId: null,
        }),
    }),
    {
      name: APP_STORAGE_KEY,
      version: 3,
      storage: createJSONStorage(() => storyStorage),
      migrate: (persistedState, version) => {
        const state = persistedState as Partial<StoryState> & {
          nodes?: StoryNode[]
          variables?: StoryVariable[]
          inactiveCanvases?: StoryCanvasSnapshot[]
        }

        if (!state || typeof state !== 'object') {
          return persistedState as StoryState
        }

        let variables = Array.isArray(state.variables)
          ? state.variables
          : []
        let nodes = Array.isArray(state.nodes) ? state.nodes : []

        if (version < 2) {
          nodes = nodes.map((node) => {
            if (node.type === 'scene') {
              const data = node.data as SceneNodeData & {
                effects?: VariableEffect[]
              }
              return {
                ...node,
                data: {
                  ...data,
                  effects: Array.isArray(data.effects) ? data.effects : [],
                },
              }
            }

            if (node.type === 'choice') {
              return {
                ...node,
                data: {
                  ...node.data,
                  options: node.data.options.map((option) => ({
                    ...option,
                    effects: Array.isArray(option.effects)
                      ? option.effects
                      : [],
                  })),
                },
              }
            }

            return node
          })
        }

        const activeCanvasId =
          typeof state.activeCanvasId === 'string' &&
          state.activeCanvasId.trim()
            ? state.activeCanvasId
            : createId('canvas')

        const inactiveCanvases = Array.isArray(state.inactiveCanvases)
          ? state.inactiveCanvases.map((canvas) => ({
              ...canvas,
              nodes: canvas.nodes.map((node) => ({
                ...node,
                selected: false,
              })),
              edges: canvas.edges.map((edge) => ({
                ...edge,
                selected: false,
              })),
            }))
          : []

        return {
          ...state,
          activeCanvasId,
          inactiveCanvases,
          variables,
          nodes,
        } as StoryState
      },
      partialize: (state) => ({
        activeCanvasId: state.activeCanvasId,
        inactiveCanvases: state.inactiveCanvases.map((canvas) => ({
          ...canvas,
          nodes: canvas.nodes.map((node) => ({
            ...node,
            selected: false,
          })),
          edges: canvas.edges.map((edge) => ({
            ...edge,
            selected: false,
          })),
        })),
        title: state.title,
        variables: state.variables,
        nodes: state.nodes.map((node) => ({ ...node, selected: false })),
        edges: state.edges.map((edge) => ({ ...edge, selected: false })),
      }),
    },
  ),
)

export function getStorySnapshot(): StorySnapshot {
  const { title, variables, nodes, edges } = useStoryStore.getState()
  return { title, variables, nodes, edges }
}
