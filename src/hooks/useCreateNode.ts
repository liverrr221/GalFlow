import { useCallback } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useStoryStore } from '../store/useStoryStore'
import type { StoryNode } from '../types/story'

export type CreateNodeKind = 'scene' | 'choice' | 'condition'

const CANDIDATE_OFFSETS = [
  { x: 0, y: 0 },
  { x: 0, y: 240 },
  { x: 0, y: -240 },
  { x: 360, y: 0 },
  { x: -360, y: 0 },
  { x: 360, y: 240 },
  { x: -360, y: 240 },
  { x: 360, y: -240 },
  { x: -360, y: -240 },
  { x: 0, y: 480 },
  { x: 0, y: -480 },
]

interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

function nodeBounds(node: StoryNode): Bounds {
  const fallbackWidth = node.type === 'scene' ? 252 : 324
  const fallbackHeight =
    node.type === 'scene' ? 178 : node.type === 'choice' ? 320 : 330

  return {
    x: node.position.x,
    y: node.position.y,
    width: node.measured?.width ?? fallbackWidth,
    height: node.measured?.height ?? fallbackHeight,
  }
}

function overlaps(candidate: Bounds, existing: Bounds): boolean {
  const gap = 28
  return !(
    candidate.x + candidate.width + gap <= existing.x ||
    candidate.x >= existing.x + existing.width + gap ||
    candidate.y + candidate.height + gap <= existing.y ||
    candidate.y >= existing.y + existing.height + gap
  )
}

export function useCreateNode() {
  const { screenToFlowPosition } = useReactFlow()
  const addScene = useStoryStore((state) => state.addScene)
  const addChoice = useStoryStore((state) => state.addChoice)
  const addCondition = useStoryStore((state) => state.addCondition)

  const createNode = useCallback(
    (kind: CreateNodeKind) => {
      const canvas = document.querySelector<HTMLElement>(
        '.flow-canvas .react-flow',
      )
      const rect = canvas?.getBoundingClientRect()
      const screenPoint = rect
        ? {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          }
        : { x: window.innerWidth / 2, y: window.innerHeight / 2 }

      const point = screenToFlowPosition(screenPoint)
      const visibleTopLeft = rect
        ? screenToFlowPosition({ x: rect.left, y: rect.top })
        : { x: 0, y: 0 }
      const visibleBottomRight = rect
        ? screenToFlowPosition({ x: rect.right, y: rect.bottom })
        : { x: window.innerWidth, y: window.innerHeight }

      const nodeCount = useStoryStore.getState().nodes.length
      const width = kind === 'scene' ? 252 : 324
      const height = kind === 'scene' ? 178 : kind === 'choice' ? 320 : 330
      const existing = useStoryStore.getState().nodes.map(nodeBounds)
      const margin = 36
      const maxX = Math.max(
        visibleTopLeft.x + margin,
        visibleBottomRight.x - width - margin,
      )
      const maxY = Math.max(
        visibleTopLeft.y + margin,
        visibleBottomRight.y - height - margin,
      )

      const candidates = CANDIDATE_OFFSETS.map((offset) => {
        const x = point.x - width / 2 + offset.x
        const y = point.y - height / 2 + offset.y
        return {
          x: Math.min(maxX, Math.max(visibleTopLeft.x + margin, x)),
          y: Math.min(maxY, Math.max(visibleTopLeft.y + margin, y)),
          width,
          height,
        }
      })

      const fallback = {
        x: point.x - width / 2 + (nodeCount % 4) * 26,
        y: point.y - height / 2 + (nodeCount % 4) * 26,
        width,
        height,
      }
      const chosen =
        candidates.find(
          (candidate) =>
            !existing.some((bounds) => overlaps(candidate, bounds)),
        ) ?? fallback

      const position = { x: chosen.x, y: chosen.y }
      if (kind === 'scene') return addScene(position)
      if (kind === 'choice') return addChoice(position)
      return addCondition(position)
    },
    [addChoice, addCondition, addScene, screenToFlowPosition],
  )

  return {
    createSceneAtViewport: useCallback(() => createNode('scene'), [createNode]),
    createChoiceAtViewport: useCallback(
      () => createNode('choice'),
      [createNode],
    ),
    createConditionAtViewport: useCallback(
      () => createNode('condition'),
      [createNode],
    ),
  }
}
