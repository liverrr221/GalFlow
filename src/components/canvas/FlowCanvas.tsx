import { useEffect, useRef } from 'react'
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  ConnectionMode,
  Controls,
  Panel,
  ReactFlow,
  useReactFlow,
  type EdgeTypes,
  type NodeTypes,
} from '@xyflow/react'
import { Diamond, GitBranch, MoveHorizontal, MousePointer2, Plus, Square } from 'lucide-react'
import { useCreateNode } from '../../hooks/useCreateNode'
import { useI18n } from '../../i18n'
import { useStoryStore } from '../../store/useStoryStore'
import { StoryEdgeComponent } from './edges/StoryEdge'
import { ChoiceNode } from './nodes/ChoiceNode'
import { ConditionNode } from './nodes/ConditionNode'
import { SceneNode } from './nodes/SceneNode'

const nodeTypes = {
  scene: SceneNode,
  choice: ChoiceNode,
  condition: ConditionNode,
} satisfies NodeTypes

const edgeTypes = {
  story: StoryEdgeComponent,
} satisfies EdgeTypes

interface FlowCanvasProps {
  onOpenFullscreen: (nodeId: string) => void
}

export function FlowCanvas({ onOpenFullscreen }: FlowCanvasProps) {
  const nodes = useStoryStore((state) => state.nodes)
  const edges = useStoryStore((state) => state.edges)
  const activeCanvasId = useStoryStore((state) => state.activeCanvasId)
  const onNodesChange = useStoryStore((state) => state.onNodesChange)
  const onEdgesChange = useStoryStore((state) => state.onEdgesChange)
  const onConnect = useStoryStore((state) => state.onConnect)
  const selectNode = useStoryStore((state) => state.selectNode)
  const { t } = useI18n()
  const { fitView } = useReactFlow()
  const previousCanvasId = useRef(activeCanvasId)

  useEffect(() => {
    if (previousCanvasId.current === activeCanvasId) return
    previousCanvasId.current = activeCanvasId

    const timer = window.setTimeout(() => {
      fitView({ padding: 0.24, duration: 220 })
    }, 80)

    return () => window.clearTimeout(timer)
  }, [activeCanvasId, fitView])

  const {
    createChoiceAtViewport,
    createConditionAtViewport,
    createSceneAtViewport,
  } = useCreateNode()

  return (
    <section className="flow-canvas" aria-label={t('canvas.aria')}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_event, node) => selectNode(node.id)}
        onNodeDoubleClick={(_event, node) => {
          selectNode(node.id)
          if (node.type === 'scene') onOpenFullscreen(node.id)
        }}
        onPaneClick={() => selectNode(null)}
        connectionMode={ConnectionMode.Strict}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={{
          stroke: '#d64c79',
          strokeWidth: 2,
          strokeDasharray: '5 4',
        }}
        connectionRadius={30}
        deleteKeyCode={['Backspace', 'Delete']}
        fitView
        fitViewOptions={{ padding: 0.24 }}
        minZoom={0.25}
        maxZoom={1.6}
        nodesDraggable
        nodesConnectable
        panOnDrag
        zoomOnScroll
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: 'story' }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1.3}
          color="#d7cec4"
        />
        <Controls
          position="bottom-left"
          showInteractive={false}
          aria-label={t('canvas.zoomAria')}
        />
        <Panel position="top-left" className="canvas-status">
          <span className="canvas-status__live">
            <span className="canvas-status__dot" />
            {t('canvas.autosave')}
          </span>
          <span className="canvas-status__divider" />
          <span>{t('common.nodeCount', { count: nodes.length })}</span>
          <span>{t('common.edgeCount', { count: edges.length })}</span>
        </Panel>
        <Panel position="bottom-right" className="canvas-hints">
          <span>
            <MoveHorizontal size={13} />
            {t('canvas.panHint')}
          </span>
          <span>
            <MousePointer2 size={13} />
            {t('canvas.zoomHint')}
          </span>
          <span className="canvas-hints__hide-mobile">
            {t('canvas.fullscreenHint')}
          </span>
        </Panel>
      </ReactFlow>

      {nodes.length === 0 && (
        <div className="canvas-empty">
          <div className="canvas-empty__card">
            <span className="canvas-empty__eyebrow">NEW STORY</span>
            <h1>{t('canvas.emptyTitle')}</h1>
            <p>
              {t('canvas.emptyLead')}
              <br />
              {t('canvas.emptySub')}
            </p>
            <div className="canvas-empty__actions">
              <button
                type="button"
                className="button button--primary"
                onClick={createSceneAtViewport}
              >
                <Plus size={16} />
                <Square size={15} />
                {t('canvas.addScene')}
              </button>
              <button
                type="button"
                className="button button--ghost"
                onClick={createChoiceAtViewport}
              >
                <Plus size={16} />
                <Diamond size={15} />
                {t('canvas.addChoice')}
              </button>
              <button
                type="button"
                className="button button--ghost"
                onClick={createConditionAtViewport}
              >
                <Plus size={16} />
                <GitBranch size={15} />
                {t('canvas.addCondition')}
              </button>
            </div>
            <span className="canvas-empty__hint">
              {t('canvas.emptyTip')}
            </span>
          </div>
        </div>
      )}
    </section>
  )
}
