import { getNodesBounds, getViewportForBounds } from '@xyflow/react'
import { tCurrent } from '../i18n'
import type { StoryNode } from '../types/story'

export interface FlowImageResult {
  dataUrl: string
  width: number
  height: number
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

export function buildFlowImageFileName(title: string): string {
  return `${safeBaseName(title)}_${tCurrent('lib.flowImageSuffix')}.png`
}

/**
 * Renders the complete flow graph (not just the visible viewport) to a PNG.
 * The temporary viewport class hides editor-only controls and selection rings
 * while the DOM is cloned by html-to-image.
 */
export async function renderFlowImage(
  nodes: StoryNode[],
): Promise<FlowImageResult> {
  if (nodes.length === 0) {
    throw new Error(tCurrent('lib.imageNoNodes'))
  }

  const viewport = document.querySelector<HTMLElement>(
    '.react-flow__viewport',
  )
  if (!viewport) {
    throw new Error(tCurrent('lib.imageNoCanvas'))
  }

  const bounds = getNodesBounds(nodes)
  if (
    !Number.isFinite(bounds.width) ||
    !Number.isFinite(bounds.height) ||
    bounds.width <= 0 ||
    bounds.height <= 0
  ) {
    throw new Error(tCurrent('lib.imageNoBounds'))
  }

  const baseScale = 1.35
  let width = Math.ceil((bounds.width + 240) * baseScale)
  let height = Math.ceil((bounds.height + 240) * baseScale)

  const limit = Math.min(1, 2800 / width, 3800 / height)
  width = Math.max(900, Math.round(width * limit))
  height = Math.max(620, Math.round(height * limit))

  const exportViewport = getViewportForBounds(
    bounds,
    width,
    height,
    0.1,
    2,
    0.08,
  )

  viewport.classList.add('is-exporting')
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  )

  try {
    const { toPng } = await import('html-to-image')
    const dataUrl = await toPng(viewport, {
      width,
      height,
      backgroundColor: '#f3efe8',
      pixelRatio: 2,
      cacheBust: true,
      style: {
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate(${exportViewport.x}px, ${exportViewport.y}px) scale(${exportViewport.zoom})`,
      },
      filter: (node) =>
        !node.classList?.contains('react-flow__handle') &&
        !node.classList?.contains('scene-node__hint'),
    })

    return { dataUrl, width, height }
  } finally {
    viewport.classList.remove('is-exporting')
  }
}
