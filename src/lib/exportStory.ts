import { optionLetter } from './constants'
import { translate, type Language } from '../i18n/translations'
import {
  buildStoryGraphIndex,
  findEdgeForHandle,
  findEdgeForOption,
  getStoryStats,
  sortOutgoingEdges,
} from './graph'
import { htmlToPlainText } from './html'
import {
  formatConditionCase,
  formatEffectList,
  formatVariableInitialValue,
} from './variables'
import type {
  StoryEdge,
  StoryNode,
  StoryVariable,
} from '../types/story'

interface BuildStoryTextOptions {
  title: string
  nodes: StoryNode[]
  edges: StoryEdge[]
  variables?: StoryVariable[]
  generatedAt?: Date
  language?: Language
}

const DOUBLE_RULE = '═'.repeat(60)
const SINGLE_RULE = '─'.repeat(48)

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function formatDateTime(date: Date): string {
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(
    date.getDate(),
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function displayTitle(node: StoryNode, language: Language): string {
  const title = node.data.title.trim()
  if (title) return title
  if (node.type === 'scene') return translate(language, 'lib.untitledScene')
  if (node.type === 'choice') return translate(language, 'lib.untitledChoice')
  return translate(language, 'lib.untitledCondition')
}

function hasAutomaticTitle(
  node: StoryNode,
  title: string,
  language: Language,
): boolean {
  const prefix = translate(
    language,
    node.type === 'scene'
      ? 'lib.scene'
      : node.type === 'choice'
        ? 'lib.choice'
        : 'lib.condition',
  )
  return new RegExp(`^${prefix}\\s*\\d+$`).test(title)
}

function optionLabel(
  label: string,
  index: number,
  language: Language,
): string {
  const trimmed = label.trim()
  return (
    trimmed ||
    translate(language, 'lib.optionNumber', { index: optionLetter(index) })
  )
}

/**
 * Builds a human-readable, self-contained script document from the graph.
 * This function is intentionally pure: it only runs when a user asks for an
 * export and can therefore evolve without affecting the canvas experience.
 */
export function buildStoryText({
  title,
  nodes,
  edges,
  variables = [],
  generatedAt = new Date(),
  language = 'zh',
}: BuildStoryTextOptions): string {
  const tr = (
    key: Parameters<typeof translate>[1],
    params: Record<string, string | number> = {},
  ) => translate(language, key, params)
  const storyTitle = title.trim() || tr('lib.untitledStory')
  const nodeMap = new Map(nodes.map((node) => [node.id, node]))
  const index = buildStoryGraphIndex(nodes, edges, language)
  const stats = getStoryStats(nodes, edges)
  const visited = new Set<string>()
  const path = new Set<string>()
  const lines: string[] = []

  const labelOf = (node: StoryNode) =>
    index.labelById.get(node.id) ??
    (node.type === 'scene'
      ? tr('lib.scene')
      : node.type === 'choice'
        ? tr('lib.choice')
        : tr('lib.condition'))

  const reference = (node: StoryNode): string => {
    const label = labelOf(node)
    const nodeTitle = displayTitle(node, language)
    return (
      nodeTitle === label ||
      hasAutomaticTitle(node, nodeTitle, language)
    )
      ? label
      : language === 'zh'
        ? `${label}《${nodeTitle}》`
        : `${label}: ${nodeTitle}`
  }

  const heading = (node: StoryNode): string => {
    const label = labelOf(node)
    const nodeTitle = displayTitle(node, language)
    return (
      nodeTitle === label ||
      hasAutomaticTitle(node, nodeTitle, language)
    )
      ? language === 'zh'
        ? `【${label}】`
        : label
      : language === 'zh'
        ? `【${label}】${nodeTitle}`
        : `${label}: ${nodeTitle}`
  }

  const descriptionOf = (node: StoryNode): string => {
    if (node.type !== 'scene') return ''
    const effectText = formatEffectList(
      node.data.effects ?? [],
      variables,
      language,
    )
    return effectText ? `　⚙ ${effectText}` : ''
  }

  const referenceWithEffects = (node: StoryNode): string =>
    `${reference(node)}${descriptionOf(node)}`

  const targetReference = (edge: StoryEdge): string | null => {
    const target = nodeMap.get(edge.target)
    return target ? referenceWithEffects(target) : null
  }

  const renderTarget = (
    targetId: string,
    prefix: string,
    connector: string,
    isLast: boolean,
    currentPath: Set<string>,
  ) => {
    const target = nodeMap.get(targetId)
    if (!target) return

    if (currentPath.has(target.id)) {
      lines.push(
        `${prefix}${connector} ${reference(target)}　${tr('exportText.loop')}`,
      )
      return
    }

    if (visited.has(target.id)) {
      lines.push(
        `${prefix}${connector} ${reference(target)}　${tr('exportText.merge')}`,
      )
      return
    }

    visited.add(target.id)
    currentPath.add(target.id)
    lines.push(`${prefix}${connector} ${referenceWithEffects(target)}`)
    walkChildren(
      target,
      `${prefix}${isLast ? '    ' : '│   '}`,
      currentPath,
    )
    currentPath.delete(target.id)
  }

  const walkChildren = (
    node: StoryNode,
    prefix: string,
    currentPath: Set<string>,
  ) => {
    const base = `${prefix}  `

    if (node.type === 'scene') {
      const outgoing = sortOutgoingEdges(node, edges)

      if (outgoing.length === 0) {
        lines.push(`${base}${tr('exportText.endsHere')}`)
        return
      }

      outgoing.forEach((edge, edgeIndex) => {
        const isLast = edgeIndex === outgoing.length - 1
        renderTarget(
          edge.target,
          base,
          isLast ? '└─▶' : '├─▶',
          isLast,
          currentPath,
        )
      })
      return
    }

    if (node.type === 'choice') {
      const options = node.data.options

      if (options.length === 0) {
        lines.push(`${base}${tr('exportText.noOptions')}`)
        return
      }

      options.forEach((option, optionIndex) => {
        const isLast = optionIndex === options.length - 1
        const branch = isLast ? '└─' : '├─'
        const optionPrefix = `${base}${isLast ? '   ' : '│  '}`
        const label = optionLabel(option.label, optionIndex, language)
        const edge = findEdgeForOption(node.id, option.id, edges)
        const target = edge ? nodeMap.get(edge.target) : undefined
        const effectText = formatEffectList(
          option.effects ?? [],
          variables,
          language,
        )

        lines.push(
          `${base}${branch} ${optionLetter(optionIndex)}. ${label}`,
        )
        if (effectText) {
          lines.push(`${optionPrefix}⚙ ${effectText}`)
        }

        if (!target) {
          lines.push(`${optionPrefix}→ ${tr('exportText.notConnected')}`)
          return
        }

        if (currentPath.has(target.id)) {
          lines.push(
            `${optionPrefix}→ ${reference(target)}　${tr(
              'exportText.loop',
            )}`,
          )
          return
        }

        if (visited.has(target.id)) {
          lines.push(
            `${optionPrefix}→ ${reference(target)}　${tr(
              'exportText.merge',
            )}`,
          )
          return
        }

        visited.add(target.id)
        currentPath.add(target.id)
        lines.push(`${optionPrefix}→ ${referenceWithEffects(target)}`)
        walkChildren(target, `${optionPrefix}   `, currentPath)
        currentPath.delete(target.id)
      })
      return
    }

    const conditions = node.data.cases
    const branches = [
      ...conditions.map((condition, index) => ({
        key: condition.id,
        label: `${tr('lib.if')} ${formatConditionCase(
          condition,
          variables,
          language,
        )}`,
        index,
      })),
      { key: 'else', label: tr('lib.else'), index: conditions.length },
    ]

    if (conditions.length === 0) {
      lines.push(`${base}${tr('exportText.noCases')}`)
    }

    branches.forEach((branch, branchIndex) => {
      const isLast = branchIndex === branches.length - 1
      const branchPrefix = `${base}${isLast ? '   ' : '│  '}`
      const edge = findEdgeForHandle(node.id, branch.key, edges)
      const target = edge ? nodeMap.get(edge.target) : undefined

      lines.push(`${base}${isLast ? '└─' : '├─'} ${branch.label}`)

      if (!target) {
        lines.push(`${branchPrefix}→ ${tr('exportText.notConnected')}`)
        return
      }

      if (currentPath.has(target.id)) {
        lines.push(
          `${branchPrefix}→ ${reference(target)}　${tr(
            'exportText.loop',
          )}`,
        )
        return
      }

      if (visited.has(target.id)) {
        lines.push(
          `${branchPrefix}→ ${reference(target)}　${tr(
            'exportText.merge',
          )}`,
        )
        return
      }

      visited.add(target.id)
      currentPath.add(target.id)
      lines.push(`${branchPrefix}→ ${referenceWithEffects(target)}`)
      walkChildren(target, `${branchPrefix}   `, currentPath)
      currentPath.delete(target.id)
    })
  }

  const walkRoot = (node: StoryNode, rootLabel: string) => {
    visited.add(node.id)
    path.add(node.id)
    lines.push(`◆ ${rootLabel}${referenceWithEffects(node)}`)
    walkChildren(node, '   ', path)
    path.delete(node.id)
  }

  lines.push(`《${storyTitle}》`)
  lines.push(tr('exportText.title'))
  lines.push(
    tr('exportText.generated', {
      date: formatDateTime(generatedAt),
      nodes: nodes.length,
      edges: edges.length,
    }),
  )
  lines.push('')

  if (variables.length > 0) {
    lines.push(DOUBLE_RULE)
    lines.push(tr('exportText.variableSection'))
    lines.push(DOUBLE_RULE)
    lines.push('')

    variables.forEach((variable) => {
      const kind =
        variable.kind === 'number'
          ? tr('exportText.number')
          : tr('exportText.boolean')
      const description = variable.description.trim()
      lines.push(
        tr('exportText.variableLine', {
          name: variable.name,
          kind,
          value: formatVariableInitialValue(variable, language),
          description: description
            ? `${language === 'zh' ? '：' : ': '}${description}`
            : '',
        }),
      )
    })

    lines.push('')
  }

  lines.push(DOUBLE_RULE)
  lines.push(tr('exportText.outline'))
  lines.push(DOUBLE_RULE)
  lines.push('')
  lines.push(tr('exportText.legend'))
  lines.push('')

  if (nodes.length === 0) {
    lines.push(tr('exportText.emptyOutline'))
  } else {
    const startNodes = index.startIds
      .map((id) => nodeMap.get(id))
      .filter((node): node is StoryNode => Boolean(node))

    if (startNodes.length === 0) {
      lines.push(tr('exportText.noStart'))
      lines.push('')
    }

    startNodes.forEach((node, startIndex) => {
      if (startIndex > 0) lines.push('')
      const rootLabel =
        startNodes.length > 1
          ? tr('exportText.startNumbered', { index: startIndex + 1 })
          : tr('exportText.start')
      walkRoot(node, rootLabel)
    })

    const remaining = index.orderedIds
      .map((id) => nodeMap.get(id))
      .filter(
        (node): node is StoryNode =>
          Boolean(node) && !visited.has(node!.id),
      )

    if (remaining.length > 0) {
      if (startNodes.length > 0) lines.push('')
      lines.push(tr('exportText.unconnectedFragment'))
      lines.push('')

      remaining.forEach((node) => {
        if (visited.has(node.id)) return
        lines.push(`◇ ${reference(node)}`)
        visited.add(node.id)
        path.add(node.id)
        walkChildren(node, '   ', path)
        path.delete(node.id)
        lines.push('')
      })
    }
  }

  lines.push('')
  lines.push(DOUBLE_RULE)
  lines.push(tr('exportText.body'))
  lines.push(DOUBLE_RULE)
  lines.push('')

  if (nodes.length === 0) {
    lines.push(tr('exportText.emptyBody'))
  } else {
    index.orderedIds.forEach((id) => {
      const node = nodeMap.get(id)
      if (!node) return

      lines.push(heading(node))
      lines.push(SINGLE_RULE)

      if (node.type === 'scene') {
        const plain = htmlToPlainText(node.data.content)
        lines.push(plain || tr('exportText.emptyScene'))

        const effectText = formatEffectList(
          node.data.effects ?? [],
          variables,
          language,
        )
        if (effectText) {
          lines.push('')
          lines.push(
            tr('exportText.effectsLine', { effects: effectText }),
          )
        }

        const outgoing = sortOutgoingEdges(node, edges)
        if (outgoing.length === 0) {
          lines.push('')
          lines.push(tr('exportText.sceneEnds'))
        } else {
          const nextReferences = outgoing
            .map((edge) => targetReference(edge))
            .filter((value): value is string => Boolean(value))

          if (nextReferences.length > 0) {
            lines.push('')
            lines.push(
              tr('exportText.next', {
                targets: nextReferences.join(
                  tr('lib.listSeparator'),
                ),
              }),
            )
          }
        }
      } else if (node.type === 'choice') {
        const options = node.data.options

        if (options.length === 0) {
          lines.push(tr('exportText.noOptions'))
        } else {
          options.forEach((option, optionIndex) => {
            const edge = findEdgeForOption(node.id, option.id, edges)
            const target = edge ? nodeMap.get(edge.target) : undefined
            lines.push(
              `${optionLetter(optionIndex)}. ${optionLabel(
                option.label,
                optionIndex,
                language,
              )} → ${
                target ? reference(target) : tr('exportText.notConnected')
              }`,
            )

            const effectText = formatEffectList(
              option.effects ?? [],
              variables,
              language,
            )
            if (effectText) {
              lines.push(
                `   ${tr('exportText.effectsLine', {
                  effects: effectText,
                })}`,
              )
            }
          })
        }
      } else {
        const conditions = node.data.cases

        if (conditions.length === 0) {
          lines.push(tr('exportText.noConditions'))
        }

        lines.push(tr('exportText.order'))

        conditions.forEach((condition, conditionIndex) => {
          const edge = findEdgeForHandle(
            node.id,
            condition.id,
            edges,
          )
          const target = edge ? nodeMap.get(edge.target) : undefined
          lines.push(
            `${conditionIndex + 1}. ${tr('lib.if')} ${formatConditionCase(
              condition,
              variables,
              language,
            )} → ${
              target ? reference(target) : tr('exportText.notConnected')
            }`,
          )
        })

        const elseEdge = findEdgeForHandle(node.id, 'else', edges)
        const elseTarget = elseEdge
          ? nodeMap.get(elseEdge.target)
          : undefined
        lines.push(
          tr('exportText.elseLine', {
            target: elseTarget
              ? reference(elseTarget)
              : tr('exportText.notConnected'),
          }),
        )
      }

      lines.push('')
    })
  }

  lines.push(DOUBLE_RULE)
  lines.push(tr('exportText.ends'))
  lines.push(DOUBLE_RULE)
  lines.push('')

  const endingNodes = nodes.filter(
    (node) =>
      node.type === 'scene' &&
      !edges.some((edge) => edge.source === node.id),
  )
  const unconnectedOptions = nodes.flatMap((node) =>
    node.type === 'choice'
      ? node.data.options
          .map((option, optionIndex) => ({
            node,
            option,
            optionIndex,
          }))
          .filter(
            ({ option }) => !findEdgeForOption(node.id, option.id, edges),
          )
      : [],
  )
  const unconnectedConditions = nodes.flatMap((node) => {
    if (node.type !== 'condition') return []

    const cases = node.data.cases
      .map((condition, index) => ({
        node,
        index,
        label: `${tr('lib.if')} ${formatConditionCase(
          condition,
          variables,
          language,
        )}`,
        connected: Boolean(findEdgeForHandle(node.id, condition.id, edges)),
      }))
      .filter((item) => !item.connected)

    const elseConnected = Boolean(findEdgeForHandle(node.id, 'else', edges))

    return [
      ...cases.map((item) => ({
        node,
        label: item.label,
        index: item.index,
      })),
      ...(elseConnected
        ? []
        : [{ node, label: tr('lib.else'), index: node.data.cases.length }]),
    ]
  })

  if (
    endingNodes.length === 0 &&
    unconnectedOptions.length === 0 &&
    unconnectedConditions.length === 0
  ) {
    lines.push(tr('exportText.allConnected'))
  } else {
    if (endingNodes.length > 0) {
      lines.push(
        tr('exportText.endings', {
          count: endingNodes.length,
          titles: endingNodes
            .map((node) => reference(node))
            .join(tr('lib.listSeparator')),
        }),
      )
    }

    if (unconnectedOptions.length > 0) {
      lines.push('')
      lines.push(tr('exportText.pendingOptions'))

      unconnectedOptions.forEach(({ node, option, optionIndex }) => {
        lines.push(
          `- ${reference(node)} → ${optionLetter(
            optionIndex,
          )}. ${optionLabel(option.label, optionIndex, language)}`,
        )
      })
    }

    if (unconnectedConditions.length > 0) {
      lines.push('')
      lines.push(tr('exportText.pendingConditions'))
      unconnectedConditions.forEach(({ node, label }) => {
        lines.push(`- ${reference(node)} → ${label}`)
      })
    }
  }

  lines.push('')
  lines.push(
    tr('exportText.stats', {
      scenes: stats.sceneCount,
      choices: stats.choiceCount,
      conditions: stats.conditionCount,
      variables: variables.length,
      options: stats.optionCount,
      starts: stats.startCount,
    }),
  )
  lines.push('')
  lines.push(tr('exportText.generatedBy'))

  return `${lines.join('\n').replace(/\n{4,}/g, '\n\n\n').trim()}\n`
}

export function buildTextFileName(
  title: string,
  language: Language = 'zh',
): string {
  const safe = title
    .trim()
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 48)

  return `${safe || translate(language, 'lib.untitledStory')}_${translate(
    language,
    'exportText.fileSuffix',
  )}.txt`
}
