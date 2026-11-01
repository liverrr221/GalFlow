import { MarkerType } from '@xyflow/react'
import { tCurrent } from '../i18n'
import { clampFontSize } from './constants'
import { createId } from './ids'
import { formatConditionCase } from './variables'
import type {
  ChoiceFlowNode,
  ChoiceOption,
  ConditionCase,
  ConditionFlowNode,
  ConditionOperator,
  EffectOperation,
  SceneFlowNode,
  StoryEdge,
  StoryNode,
  StorySnapshot,
  StoryVariable,
  VariableEffect,
  VariableKind,
  VariableValue,
} from '../types/story'

export const PROJECT_FORMAT = 'galflow-project'
export const PROJECT_VERSION = 2
export const MAX_PROJECT_FILE_BYTES = 25 * 1024 * 1024

const MAX_NODES = 1500
const MAX_EDGES = 5000
const MAX_OPTIONS = 80
const MAX_EFFECTS = 100
const MAX_CONDITIONS = 80
const MAX_VARIABLES = 200
const MAX_CONTENT_LENGTH = 2_000_000

const ALLOWED_CONTENT_TAGS = new Set([
  'p',
  'div',
  'br',
  'b',
  'strong',
  'i',
  'em',
  'u',
  's',
  'strike',
  'ul',
  'ol',
  'li',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'h4',
  'span',
])

const DROPPED_CONTENT_TAGS = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'img',
  'svg',
  'math',
  'form',
  'input',
  'textarea',
  'select',
  'button',
  'link',
  'meta',
])

const NUMBER_OPERATORS: ConditionOperator[] = [
  '>=',
  '>',
  '==',
  '!=',
  '<',
  '<=',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asFiniteNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function asBoolean(value: unknown): boolean {
  return value === true || value === 'true'
}

let purifierDocument: Document | null = null

/**
 * Imports may come from another person, so scene HTML is rebuilt with a strict
 * tag allowlist and no attributes. This is intentionally stricter than the
 * editor's own output: formatting such as bold/list survives, while scripts,
 * images, inline handlers and arbitrary CSS are discarded.
 */
function sanitizeContent(html: string): string {
  if (!html) return ''

  if (!purifierDocument) {
    purifierDocument = new DOMParser().parseFromString(
      '<!doctype html><html><body></body></html>',
      'text/html',
    )
  }

  const source = new DOMParser().parseFromString(html, 'text/html')
  const output = purifierDocument.createElement('div')
  const documentForOutput = purifierDocument

  const copyNode = (node: Node, parent: Node) => {
    if (node.nodeType === 3) {
      parent.appendChild(
        documentForOutput.createTextNode(node.nodeValue ?? ''),
      )
      return
    }
    if (node.nodeType !== 1) return

    const element = node as HTMLElement
    const tag = element.tagName.toLowerCase()
    if (DROPPED_CONTENT_TAGS.has(tag)) return

    const target = ALLOWED_CONTENT_TAGS.has(tag)
      ? parent.appendChild(documentForOutput.createElement(tag))
      : parent

    element.childNodes.forEach((child) => copyNode(child, target))
  }

  source.body.childNodes.forEach((node) => copyNode(node, output))
  return output.innerHTML
}

function safeTitle(value: unknown, fallback: string): string {
  return asString(value).trim().slice(0, 100) || fallback
}

function safeBaseName(title: string): string {
  return (
    title
      .trim()
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 48) || tCurrent('lib.untitledStory')
  )
}

function normalizeVariables(raw: unknown): StoryVariable[] {
  if (!Array.isArray(raw)) return []

  if (raw.length > MAX_VARIABLES) {
    throw new Error(
      tCurrent('lib.tooManyVariables', { count: MAX_VARIABLES }),
    )
  }

  const seen = new Set<string>()
  const variables: StoryVariable[] = []

  raw.forEach((item, index) => {
    if (!isRecord(item)) {
      throw new Error(
        tCurrent('lib.invalidVariable', { index: index + 1 }),
      )
    }

    const kind: VariableKind =
      item.kind === 'boolean' ? 'boolean' : 'number'
    let id = asString(item.id).trim()
    if (!id) id = createId('var')
    if (seen.has(id)) {
      throw new Error(tCurrent('lib.duplicateVariableId', { id }))
    }
    seen.add(id)

    const rawValue = item.initialValue
    const initialValue: VariableValue =
      kind === 'boolean'
        ? asBoolean(rawValue)
        : asFiniteNumber(rawValue, 0)

    variables.push({
      id,
      name:
        asString(item.name).trim().slice(0, 40) ||
        tCurrent('lib.variableNumber', { count: index + 1 }),
      kind,
      initialValue,
      description: asString(item.description).trim().slice(0, 160),
    })
  })

  return variables
}

function variableById(
  variables: StoryVariable[],
  id: string,
): StoryVariable | undefined {
  return variables.find((variable) => variable.id === id)
}

function normalizeEffects(
  raw: unknown,
  variables: StoryVariable[],
): VariableEffect[] {
  if (!Array.isArray(raw)) return []

  const effects: VariableEffect[] = []
  const usedIds = new Set<string>()

  raw.slice(0, MAX_EFFECTS).forEach((item) => {
    if (!isRecord(item)) return

    const variableId = asString(item.variableId).trim()
    const variable = variableById(variables, variableId)
    if (!variable) return

    let id = asString(item.id).trim()
    if (!id || usedIds.has(id)) id = createId('effect')
    usedIds.add(id)

    let operation: EffectOperation =
      item.operation === 'subtract'
        ? 'subtract'
        : item.operation === 'add'
          ? 'add'
          : 'set'

    if (variable.kind === 'boolean') operation = 'set'

    const value: VariableValue =
      variable.kind === 'boolean'
        ? asBoolean(item.value)
        : asFiniteNumber(item.value, 0)

    effects.push({ id, variableId, operation, value })
  })

  return effects
}

function normalizeConditionCases(
  raw: unknown,
  variables: StoryVariable[],
): ConditionCase[] {
  if (!Array.isArray(raw)) return []

  const cases: ConditionCase[] = []
  const usedIds = new Set<string>()

  raw.slice(0, MAX_CONDITIONS).forEach((item) => {
    if (!isRecord(item)) return

    const variableId = asString(item.variableId).trim()
    const variable = variableById(variables, variableId)
    if (!variable) return

    let id = asString(item.id).trim()
    if (!id || usedIds.has(id)) id = createId('case')
    usedIds.add(id)

    let operator = item.operator as ConditionOperator
    let value: VariableValue

    if (variable.kind === 'boolean') {
      operator = operator === '!=' ? '!=' : '=='
      value = asBoolean(item.value)
    } else {
      if (!NUMBER_OPERATORS.includes(operator)) operator = '>='
      value = asFiniteNumber(item.value, 0)
    }

    cases.push({ id, variableId, operator, value })
  })

  return cases
}

function normalizeOptions(
  raw: unknown,
  variables: StoryVariable[],
): ChoiceOption[] {
  const source = Array.isArray(raw) ? raw.slice(0, MAX_OPTIONS) : []
  const options: ChoiceOption[] = []
  const seen = new Set<string>()

  source.forEach((item, index) => {
    const record = isRecord(item) ? item : {}
    let id = asString(record.id).trim()
    if (!id) id = createId('option')
    if (seen.has(id)) {
      throw new Error(tCurrent('lib.duplicateOptionId', { id }))
    }
    seen.add(id)

    options.push({
      id,
      label:
        asString(record.label).trim().slice(0, 60) ||
        tCurrent('lib.optionNumber', { index: index + 1 }),
      effects: normalizeEffects(record.effects, variables),
    })
  })

  if (options.length === 0) {
    options.push({
      id: createId('option'),
      label: tCurrent('lib.optionNumber', { index: 'A' }),
      effects: [],
    })
  }

  return options
}

function normalizeNodes(
  rawNodes: unknown[],
  variables: StoryVariable[],
): StoryNode[] {
  if (rawNodes.length > MAX_NODES) {
    throw new Error(
      tCurrent('lib.tooManyNodes', { count: MAX_NODES }),
    )
  }

  const seenIds = new Set<string>()
  const nodes: StoryNode[] = []

  rawNodes.forEach((item, index) => {
    if (!isRecord(item)) {
      throw new Error(
        tCurrent('lib.invalidNode', { index: index + 1 }),
      )
    }

    const type = item.type
    if (type !== 'scene' && type !== 'choice' && type !== 'condition') {
      throw new Error(
        tCurrent('lib.unsupportedNode', { index: index + 1 }),
      )
    }

    let id = asString(item.id).trim()
    if (!id) id = createId(type)
    if (seenIds.has(id)) {
      throw new Error(tCurrent('lib.duplicateNodeId', { id }))
    }
    seenIds.add(id)

    const position = isRecord(item.position) ? item.position : {}
    const data = isRecord(item.data) ? item.data : {}
    const x = asFiniteNumber(position.x)
    const y = asFiniteNumber(position.y)

    if (type === 'scene') {
      const node: SceneFlowNode = {
        id,
        type: 'scene',
        position: { x, y },
        data: {
          kind: 'scene',
          title: safeTitle(
            data.title,
            tCurrent('lib.sceneNumber', { count: index + 1 }),
          ),
          content: sanitizeContent(
            asString(data.content).slice(0, MAX_CONTENT_LENGTH),
          ),
          fontSize: clampFontSize(asFiniteNumber(data.fontSize, 18)),
          effects: normalizeEffects(data.effects, variables),
        },
      }
      nodes.push(node)
      return
    }

    if (type === 'choice') {
      const node: ChoiceFlowNode = {
        id,
        type: 'choice',
        position: { x, y },
        data: {
          kind: 'choice',
          title: safeTitle(
            data.title,
            tCurrent('lib.choiceNumber', { count: index + 1 }),
          ),
          options: normalizeOptions(data.options, variables),
        },
      }
      nodes.push(node)
      return
    }

    const node: ConditionFlowNode = {
      id,
      type: 'condition',
      position: { x, y },
      data: {
        kind: 'condition',
        title: safeTitle(
          data.title,
          tCurrent('lib.conditionNumber', { count: index + 1 }),
        ),
        cases: normalizeConditionCases(data.cases, variables),
      },
    }
    nodes.push(node)
  })

  return nodes
}

function normalizeEdges(
  rawEdges: unknown[],
  nodes: StoryNode[],
  variables: StoryVariable[],
): StoryEdge[] {
  if (rawEdges.length > MAX_EDGES) {
    throw new Error(
      tCurrent('lib.tooManyEdges', { count: MAX_EDGES }),
    )
  }

  const nodeMap = new Map(nodes.map((node) => [node.id, node]))
  const usedEdgeIds = new Set<string>()
  const usedSourceConnections = new Set<string>()
  const edges: StoryEdge[] = []

  rawEdges.forEach((item, index) => {
    if (!isRecord(item)) {
      throw new Error(
        tCurrent('lib.invalidEdge', { index: index + 1 }),
      )
    }

    const sourceId = asString(item.source).trim()
    const targetId = asString(item.target).trim()
    const sourceNode = nodeMap.get(sourceId)
    const targetNode = nodeMap.get(targetId)

    if (!sourceNode || !targetNode) {
      throw new Error(
        tCurrent('lib.edgeMissingNode', { index: index + 1 }),
      )
    }
    if (sourceId === targetId) {
      throw new Error(
        tCurrent('lib.edgeSelf', { index: index + 1 }),
      )
    }

    let sourceHandle = asString(item.sourceHandle).trim() || null
    let optionLabel: string | undefined
    let conditionLabel: string | undefined
    let optionId: string | undefined
    let conditionCaseId: string | undefined

    if (sourceNode.type === 'choice') {
      const option = sourceNode.data.options.find(
        (candidate) => candidate.id === sourceHandle,
      )
      if (!option) {
        throw new Error(
          tCurrent('lib.edgeMissingOption', { index: index + 1 }),
        )
      }
      sourceHandle = option.id
      optionId = option.id
      optionLabel = option.label
    } else if (sourceNode.type === 'condition') {
      if (sourceHandle === 'else') {
        conditionCaseId = 'else'
        conditionLabel = tCurrent('lib.else')
      } else {
        const condition = sourceNode.data.cases.find(
          (candidate) => candidate.id === sourceHandle,
        )
        if (!condition) {
          throw new Error(
            tCurrent('lib.edgeMissingCondition', {
              index: index + 1,
            }),
          )
        }
        conditionCaseId = condition.id
        conditionLabel = formatConditionCase(condition, variables)
      }
    } else {
      sourceHandle = 'out'
    }

    const connectionKey = `${sourceId}\u0000${sourceHandle ?? ''}`
    if (usedSourceConnections.has(connectionKey)) {
      throw new Error(tCurrent('lib.duplicateConnection'))
    }
    usedSourceConnections.add(connectionKey)

    let edgeId = asString(item.id).trim()
    if (!edgeId) edgeId = createId('edge')
    if (usedEdgeIds.has(edgeId)) {
      throw new Error(tCurrent('lib.duplicateEdgeId', { id: edgeId }))
    }
    usedEdgeIds.add(edgeId)

    edges.push({
      id: edgeId,
      source: sourceId,
      target: targetId,
      sourceHandle,
      targetHandle: 'in',
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
    })
  })

  return edges
}

export function parseProjectJson(text: string): StorySnapshot {
  if (text.length > MAX_PROJECT_FILE_BYTES) {
    throw new Error(tCurrent('lib.projectTooLarge'))
  }

  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error(tCurrent('lib.invalidJson'))
  }

  if (!isRecord(raw)) {
    throw new Error(tCurrent('lib.invalidProjectRoot'))
  }

  if (raw.format != null && raw.format !== PROJECT_FORMAT) {
    throw new Error(tCurrent('lib.notGalFlowProject'))
  }

  if (
    typeof raw.version === 'number' &&
    raw.version > PROJECT_VERSION
  ) {
    throw new Error(
      tCurrent('lib.projectTooNew', { version: raw.version }),
    )
  }

  if (!Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) {
    throw new Error(tCurrent('lib.projectMissingData'))
  }

  const variables = normalizeVariables(raw.variables)
  const nodes = normalizeNodes(raw.nodes, variables)
  const edges = normalizeEdges(raw.edges, nodes, variables)

  return {
    title:
      asString(raw.title).trim().slice(0, 120) ||
      tCurrent('lib.importedStory'),
    variables,
    nodes,
    edges,
  }
}

export function serializeProject(snapshot: StorySnapshot): string {
  const project = {
    format: PROJECT_FORMAT,
    version: PROJECT_VERSION,
    app: 'GalFlow',
    exportedAt: new Date().toISOString(),
    title: snapshot.title.trim() || tCurrent('lib.untitledStory'),
    variables: snapshot.variables,
    nodes: snapshot.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data,
    })),
    edges: snapshot.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle ?? null,
      targetHandle: edge.targetHandle ?? 'in',
      type: 'story',
      data: edge.data ?? {},
    })),
  }

  return `${JSON.stringify(project, null, 2)}\n`
}

export function buildProjectFileName(title: string): string {
  return `${safeBaseName(title)}_${tCurrent(
    'lib.projectFileNameSuffix',
  )}.galflow.json`
}
