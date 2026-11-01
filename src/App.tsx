import { useCallback, useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { FlowCanvas } from './components/canvas/FlowCanvas'
import { FullscreenEditor } from './components/editor/FullscreenEditor'
import { ExportDialog } from './components/export/ExportDialog'
import { InspectorPanel } from './components/inspector/InspectorPanel'
import { TopBar } from './components/layout/TopBar'
import { ShareDialog } from './components/share/ShareDialog'
import { VariablesDialog } from './components/variables/VariablesDialog'
import { useStoryStore } from './store/useStoryStore'

export default function App() {
  const selectedNodeId = useStoryStore((state) => state.selectedNodeId)
  const [fullscreenNodeId, setFullscreenNodeId] = useState<string | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [variablesOpen, setVariablesOpen] = useState(false)

  const openFullscreen = useCallback((nodeId: string) => {
    setFullscreenNodeId(nodeId)
  }, [])

  const closeFullscreen = useCallback(() => {
    setFullscreenNodeId(null)
  }, [])

  const openExport = useCallback(() => setExportOpen(true), [])
  const closeExport = useCallback(() => setExportOpen(false), [])
  const openShare = useCallback(() => setShareOpen(true), [])
  const closeShare = useCallback(() => setShareOpen(false), [])
  const openVariables = useCallback(() => setVariablesOpen(true), [])
  const closeVariables = useCallback(() => setVariablesOpen(false), [])
  const openTextExportFromShare = useCallback(() => {
    setShareOpen(false)
    setExportOpen(true)
  }, [])

  return (
    <ReactFlowProvider>
      <div className="app-shell">
        <TopBar
          onExport={openExport}
          onShare={openShare}
          onVariables={openVariables}
        />

        <main
          className={`workspace${
            selectedNodeId && !fullscreenNodeId ? ' has-inspector' : ''
          }`}
        >
          <FlowCanvas onOpenFullscreen={openFullscreen} />
          {selectedNodeId && !fullscreenNodeId && (
            <InspectorPanel onOpenFullscreen={openFullscreen} />
          )}
        </main>

        {fullscreenNodeId && (
          <FullscreenEditor
            nodeId={fullscreenNodeId}
            onClose={closeFullscreen}
          />
        )}

        {exportOpen && <ExportDialog onClose={closeExport} />}
        {shareOpen && (
          <ShareDialog
            onClose={closeShare}
            onOpenTextExport={openTextExportFromShare}
          />
        )}
        {variablesOpen && (
          <VariablesDialog onClose={closeVariables} />
        )}
      </div>
    </ReactFlowProvider>
  )
}
