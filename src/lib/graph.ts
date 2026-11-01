import type {
  ChoiceFlowNode,
  ConditionFlowNode,
  StoryEdge,
  StoryNode,
} from '../types/story'

export interface StoryGraphIndex {
  /** Canonical display order: traversed from start nodes, then leftover nodes. */
  orderedIds: string[]
  startIds: string[]
  labelById: Map<string, string>
  visitedIds: Set<string>
}

export function sortNodesByPosition(nodes: StoryNode[]): StoryNode[] {
  return [...nodes].sort(
    (a, b) =>
      a.position.x - b.position.x ||
      a.position.y - b.position.y ||
      a.id.localeCompare(b.id),
  )
}

export function sortOutgoingEdges(
  source: StoryNode,
  edges: StoryEdge[],
): StoryEdge[] {
  const outgoing = edges.filter((edge) => edge.source === source.id)

  if (source.type === 'choice') {
    const optionOrder = new Map(
      (source as ChoiceFlowNode).data.options.map((option, index) => [
        option.id,
        index,
      ]),
    )

    return [...outgoing].sort(
      (a, b) =>
        (optionOrder.get(a.sourceHandle ?? '') ?? Number.MAX_SAFE_INTEGER) -
        (optionOrder.get(b.sourceHandle ?? '') ?? Number.MAX_SAFE_INTEGER),
    )
  }

  if (source.type === 'condition') {
    const caseOrder = new Map(
      (source as ConditionFlowNode).data.cases.map((condition, index) => [
        condition.id,
        index,
      ]),
    )

    return [...outgoing].sort((a, b) => {
      const aOrder =
        a.sourceHandle === 'else'
          ? Number.MAX_SAFE_INTEGER - 1
          : caseOrder.get(a.sourceHandle ?? '') ??
            Number.MAX_SAFE_INTEGER
      const bOrder =
        b.sourceHandle === 'else'
          ? Number.MAX_SAFE_INTEGER - 1
          : caseOrder.get(b.sourceHandle ?? '') ??
            Number.MAX_SAFE_INTEGER
      return aOrder - bOrder
    })
  }

  return outgoing
}

export function findEdgeForHandle(
  sourceId: string,
  sourceHandle: string,
  edges: StoryEdge[],
): StoryEdge | undefined {
  return edges.find(
    (edge) =>
      edge.source === sourceId && edge.sourceHandle === sourceHandle,
  )
}

export function findEdgeForOption(
  sourceId: string,
  optionId: string,
  edges: StoryEdge[],
): StoryEdge | undefined {
  return findEdgeForHandle(sourceId, optionId, edges)
}

export function buildStoryGraphIndex(
  nodes: StoryNode[],
  edges: StoryEdge[],
): StoryGraphIndex {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]))
  const validEdges = edges.filter(
    (edge) => nodeMap.has(edge.source) && nodeMap.has(edge.target),
  )
  const incoming = new Map(nodes.map((node) => [node.id, 0]))

  validEdges.forEach((edge) => {
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1)
  })

  const sortedNodes = sortNodesByPosition(nodes)
  const candidateStarts = sortedNodes
    .filter((node) => (incoming.get(node.id) ?? 0) === 0)
    .map((node) => node.id)

  const reachableFrom = (startId: string): Set<string> => {
    const reachable = new Set<string>()
    const stack = [startId]

    while (stack.length > 0) {
      const nodeId = stack.pop()
      if (!nodeId || reachable.has(nodeId)) continue
      reachable.add(nodeId)

      const source = nodeMap.get(nodeId)
      if (!source) continue
      sortOutgoingEdges(source, validEdges).forEach((edge) => {
        if (!reachable.has(edge.target)) stack.push(edge.target)
      })
    }

    return reachable
  }

  // Keep the main narrative first in exported outlines and label numbering.
  // Disconnected nodes (often newly created and not connected yet) come after
  // the largest reachable component.
  const startIds = candidateStarts
    .map((id, index) => ({
      id,
      index,
      size: reachableFrom(id).size,
    }))
    .sort((a, b) => b.size - a.size || a.index - b.index)
    .map((item) => item.id)

  const visitedIds = new Set<string>()
  const orderedIds: string[] = []

  const enqueueTargets = (nodeId: string, queue: string[]) => {
    const source = nodeMap.get(nodeId)
    if (!source) return

    sortOutgoingEdges(source, validEdges).forEach((edge) => {
      if (!visitedIds.has(edge.target) && !queue.includes(edge.target)) {
        queue.push(edge.target)
      }
    })
  }

  startIds.forEach((startId) => {
    if (visitedIds.has(startId)) return

    const queue: string[] = [startId]
    while (queue.length > 0) {
      const nodeId = queue.shift()
      if (!nodeId || visitedIds.has(nodeId)) continue

      visitedIds.add(nodeId)
      orderedIds.push(nodeId)
      enqueueTargets(nodeId, queue)
    }
  })

  // Disconnected cycles have no in-degree-zero node. Keep them visible by
  // appending the remaining nodes in canvas order.
  sortedNodes.forEach((node) => {
    if (!visitedIds.has(node.id)) {
      const queue: string[] = [node.id]

      while (queue.length > 0) {
        const nodeId = queue.shift()
        if (!nodeId || visitedIds.has(nodeId)) continue
        visitedIds.add(nodeId)
        orderedIds.push(nodeId)
        enqueueTargets(nodeId, queue)
      }
    }
  })

  const labelById = new Map<string, string>()
  let sceneCount = 0
  let choiceCount = 0
  let conditionCount = 0

  orderedIds.forEach((id) => {
    const node = nodeMap.get(id)
    if (!node) return

    if (node.type === 'scene') {
      sceneCount += 1
      labelById.set(id, `场景 ${sceneCount}`)
    } else if (node.type === 'choice') {
      choiceCount += 1
      labelById.set(id, `选择 ${choiceCount}`)
    } else {
      conditionCount += 1
      labelById.set(id, `条件 ${conditionCount}`)
    }
  })

  return { orderedIds, startIds, labelById, visitedIds }
}

export function getStoryStats(nodes: StoryNode[], edges: StoryEdge[]) {
  let sceneCount = 0
  let choiceCount = 0
  let conditionCount = 0
  let optionCount = 0
  let conditionCaseCount = 0
  let effectCount = 0
  let endingCount = 0
  let unconnectedOptionCount = 0
  let unconnectedConditionCount = 0
  let startCount = 0

  const incoming = new Set(edges.map((edge) => edge.target))

  nodes.forEach((node) => {
    if (node.type === 'scene') {
      sceneCount += 1
      effectCount += (node.data.effects ?? []).length
      if (!edges.some((edge) => edge.source === node.id)) {
        endingCount += 1
      }
    } else if (node.type === 'choice') {
      choiceCount += 1
      optionCount += node.data.options.length
      node.data.options.forEach((option) => {
        effectCount += (option.effects ?? []).length
        const connected = edges.some(
          (edge) =>
            edge.source === node.id && edge.sourceHandle === option.id,
        )
        if (!connected) unconnectedOptionCount += 1
      })
    } else {
      conditionCount += 1
      conditionCaseCount += node.data.cases.length
      node.data.cases.forEach((condition) => {
        const connected = edges.some(
          (edge) =>
            edge.source === node.id && edge.sourceHandle === condition.id,
        )
        if (!connected) unconnectedConditionCount += 1
      })
      if (
        !edges.some(
          (edge) =>
            edge.source === node.id && edge.sourceHandle === 'else',
        )
      ) {
        unconnectedConditionCount += 1
      }
    }

    if (!incoming.has(node.id)) startCount += 1
  })

  return {
    sceneCount,
    choiceCount,
    conditionCount,
    optionCount,
    conditionCaseCount,
    effectCount,
    endingCount,
    unconnectedOptionCount,
    unconnectedConditionCount,
    startCount,
  }
}
