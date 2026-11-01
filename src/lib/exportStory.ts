import { optionLetter } from './constants'
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

function displayTitle(node: StoryNode): string {
  const title = node.data.title.trim()
  if (title) return title
  if (node.type === 'scene') return '未命名场景'
  if (node.type === 'choice') return '未命名选择'
  return '未命名条件'
}

function hasAutomaticTitle(node: StoryNode, title: string): boolean {
  const prefix =
    node.type === 'scene' ? '场景' : node.type === 'choice' ? '选择' : '条件'
  return new RegExp(`^${prefix}\\s*\\d+$`).test(title)
}

function optionLabel(label: string, index: number): string {
  const trimmed = label.trim()
  return trimmed || `选项 ${optionLetter(index)}`
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
}: BuildStoryTextOptions): string {
  const storyTitle = title.trim() || '未命名剧情'
  const nodeMap = new Map(nodes.map((node) => [node.id, node]))
  const index = buildStoryGraphIndex(nodes, edges)
  const stats = getStoryStats(nodes, edges)
  const visited = new Set<string>()
  const path = new Set<string>()
  const lines: string[] = []

  const labelOf = (node: StoryNode) =>
    index.labelById.get(node.id) ??
    (node.type === 'scene'
      ? '场景'
      : node.type === 'choice'
        ? '选择'
        : '条件')

  const reference = (node: StoryNode): string => {
    const label = labelOf(node)
    const nodeTitle = displayTitle(node)
    return nodeTitle === label || hasAutomaticTitle(node, nodeTitle)
      ? label
      : `${label}《${nodeTitle}》`
  }

  const heading = (node: StoryNode): string => {
    const label = labelOf(node)
    const nodeTitle = displayTitle(node)
    return nodeTitle === label || hasAutomaticTitle(node, nodeTitle)
      ? `【${label}】`
      : `【${label}】${nodeTitle}`
  }

  const descriptionOf = (node: StoryNode): string => {
    if (node.type !== 'scene') return ''
    const effectText = formatEffectList(
      node.data.effects ?? [],
      variables,
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
      lines.push(`${prefix}${connector} ${reference(target)}　↻ 循环至此`)
      return
    }

    if (visited.has(target.id)) {
      lines.push(`${prefix}${connector} ${reference(target)}　↪ 汇合处`)
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
        lines.push(`${base}◼ 剧情在此结束`)
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
        lines.push(`${base}（尚未添加选项）`)
        return
      }

      options.forEach((option, optionIndex) => {
        const isLast = optionIndex === options.length - 1
        const branch = isLast ? '└─' : '├─'
        const optionPrefix = `${base}${isLast ? '   ' : '│  '}`
        const label = optionLabel(option.label, optionIndex)
        const edge = findEdgeForOption(node.id, option.id, edges)
        const target = edge ? nodeMap.get(edge.target) : undefined
        const effectText = formatEffectList(
          option.effects ?? [],
          variables,
        )

        lines.push(
          `${base}${branch} ${optionLetter(optionIndex)}. ${label}`,
        )
        if (effectText) {
          lines.push(`${optionPrefix}⚙ ${effectText}`)
        }

        if (!target) {
          lines.push(`${optionPrefix}→ （未连接）`)
          return
        }

        if (currentPath.has(target.id)) {
          lines.push(`${optionPrefix}→ ${reference(target)}　↻ 循环至此`)
          return
        }

        if (visited.has(target.id)) {
          lines.push(`${optionPrefix}→ ${reference(target)}　↪ 汇合处`)
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
        label: `若 ${formatConditionCase(condition, variables)}`,
        index,
      })),
      { key: 'else', label: '否则', index: conditions.length },
    ]

    if (conditions.length === 0) {
      lines.push(`${base}（尚未添加条件规则，只有「否则」出口）`)
    }

    branches.forEach((branch, branchIndex) => {
      const isLast = branchIndex === branches.length - 1
      const branchPrefix = `${base}${isLast ? '   ' : '│  '}`
      const edge = findEdgeForHandle(node.id, branch.key, edges)
      const target = edge ? nodeMap.get(edge.target) : undefined

      lines.push(`${base}${isLast ? '└─' : '├─'} ${branch.label}`)

      if (!target) {
        lines.push(`${branchPrefix}→ （未连接）`)
        return
      }

      if (currentPath.has(target.id)) {
        lines.push(`${branchPrefix}→ ${reference(target)}　↻ 循环至此`)
        return
      }

      if (visited.has(target.id)) {
        lines.push(`${branchPrefix}→ ${reference(target)}　↪ 汇合处`)
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
  lines.push('Galgame 剧情流程文本')
  lines.push(
    `生成时间：${formatDateTime(generatedAt)}　·　节点 ${nodes.length} 个　·　连线 ${edges.length} 条`,
  )
  lines.push('')

  if (variables.length > 0) {
    lines.push(DOUBLE_RULE)
    lines.push('变量设定')
    lines.push(DOUBLE_RULE)
    lines.push('')

    variables.forEach((variable) => {
      const kind = variable.kind === 'number' ? '数值' : '开关'
      const description = variable.description.trim()
      lines.push(
        `- ${variable.name}（${kind}，初始值 ${formatVariableInitialValue(
          variable,
        )}）${description ? `：${description}` : ''}`,
      )
    })

    lines.push('')
  }

  lines.push(DOUBLE_RULE)
  lines.push('一、剧情流程')
  lines.push(DOUBLE_RULE)
  lines.push('')
  lines.push(
    '图例：◼ 剧情结束　↪ 汇合到已展开节点　↻ 循环回到上方节点　⚙ 变量变化；编号按流程顺序自动生成。',
  )
  lines.push('')

  if (nodes.length === 0) {
    lines.push('（画布中还没有剧情节点。添加剧情块与选项节点后，再回来导出吧。）')
  } else {
    const startNodes = index.startIds
      .map((id) => nodeMap.get(id))
      .filter((node): node is StoryNode => Boolean(node))

    if (startNodes.length === 0) {
      lines.push('（未找到明确的起点；以下从画布中的第一个节点开始展开。）')
      lines.push('')
    }

    startNodes.forEach((node, startIndex) => {
      if (startIndex > 0) lines.push('')
      const rootLabel =
        startNodes.length > 1 ? `起点 ${startIndex + 1}：` : '起点：'
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
      lines.push('◆ 未连通的片段：')
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
  lines.push('二、场景、选项与条件正文')
  lines.push(DOUBLE_RULE)
  lines.push('')

  if (nodes.length === 0) {
    lines.push('（暂无内容）')
  } else {
    index.orderedIds.forEach((id) => {
      const node = nodeMap.get(id)
      if (!node) return

      lines.push(heading(node))
      lines.push(SINGLE_RULE)

      if (node.type === 'scene') {
        const plain = htmlToPlainText(node.data.content)
        lines.push(plain || '（尚未填写剧情文本）')

        const effectText = formatEffectList(
          node.data.effects ?? [],
          variables,
        )
        if (effectText) {
          lines.push('')
          lines.push(`变量变化：${effectText}`)
        }

        const outgoing = sortOutgoingEdges(node, edges)
        if (outgoing.length === 0) {
          lines.push('')
          lines.push('（剧情在此结束）')
        } else {
          const nextReferences = outgoing
            .map((edge) => targetReference(edge))
            .filter((value): value is string => Boolean(value))

          if (nextReferences.length > 0) {
            lines.push('')
            lines.push(`↳ 下一步：${nextReferences.join('、')}`)
          }
        }
      } else if (node.type === 'choice') {
        const options = node.data.options

        if (options.length === 0) {
          lines.push('（尚未添加选项）')
        } else {
          options.forEach((option, optionIndex) => {
            const edge = findEdgeForOption(node.id, option.id, edges)
            const target = edge ? nodeMap.get(edge.target) : undefined
            lines.push(
              `${optionLetter(optionIndex)}. ${optionLabel(
                option.label,
                optionIndex,
              )} → ${target ? reference(target) : '（未连接）'}`,
            )

            const effectText = formatEffectList(
              option.effects ?? [],
              variables,
            )
            if (effectText) {
              lines.push(`   变量变化：${effectText}`)
            }
          })
        }
      } else {
        const conditions = node.data.cases

        if (conditions.length === 0) {
          lines.push('（尚未添加条件规则）')
        }

        lines.push('判断顺序：')

        conditions.forEach((condition, conditionIndex) => {
          const edge = findEdgeForHandle(
            node.id,
            condition.id,
            edges,
          )
          const target = edge ? nodeMap.get(edge.target) : undefined
          lines.push(
            `${conditionIndex + 1}. 若 ${formatConditionCase(
              condition,
              variables,
            )} → ${target ? reference(target) : '（未连接）'}`,
          )
        })

        const elseEdge = findEdgeForHandle(node.id, 'else', edges)
        const elseTarget = elseEdge
          ? nodeMap.get(elseEdge.target)
          : undefined
        lines.push(
          `否则 → ${elseTarget ? reference(elseTarget) : '（未连接）'}`,
        )
      }

      lines.push('')
    })
  }

  lines.push(DOUBLE_RULE)
  lines.push('三、结局与待补全')
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
        label: `若 ${formatConditionCase(condition, variables)}`,
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
        : [{ node, label: '否则', index: node.data.cases.length }]),
    ]
  })

  if (
    endingNodes.length === 0 &&
    unconnectedOptions.length === 0 &&
    unconnectedConditions.length === 0
  ) {
    lines.push('本剧情所有场景与选项均已连接。')
  } else {
    if (endingNodes.length > 0) {
      lines.push(
        `结局 ${endingNodes.length} 个：${endingNodes
          .map((node) => reference(node))
          .join('、')}`,
      )
    }

    if (unconnectedOptions.length > 0) {
      lines.push('')
      lines.push('待连接的选项：')

      unconnectedOptions.forEach(({ node, option, optionIndex }) => {
        lines.push(
          `- ${reference(node)} → ${optionLetter(
            optionIndex,
          )}. ${optionLabel(option.label, optionIndex)}`,
        )
      })
    }

    if (unconnectedConditions.length > 0) {
      lines.push('')
      lines.push('待连接的条件分支：')
      unconnectedConditions.forEach(({ node, label }) => {
        lines.push(`- ${reference(node)} → ${label}`)
      })
    }
  }

  lines.push('')
  lines.push(
    `统计：场景 ${stats.sceneCount} 个 · 选项节点 ${stats.choiceCount} 个 · 条件节点 ${stats.conditionCount} 个 · 变量 ${variables.length} 个 · 分支选项 ${stats.optionCount} 个 · 起点 ${stats.startCount} 个`,
  )
  lines.push('')
  lines.push('—— 由 GalFlow 生成 ——')

  return `${lines.join('\n').replace(/\n{4,}/g, '\n\n\n').trim()}\n`
}

export function buildTextFileName(title: string): string {
  const safe = title
    .trim()
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 48)

  return `${safe || '未命名剧情'}_剧情流程.txt`
}
