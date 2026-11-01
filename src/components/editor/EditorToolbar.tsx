import {
  Bold,
  Eraser,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from 'lucide-react'

interface EditorToolbarProps {
  active: Record<string, boolean>
  onCommand: (command: string, value?: string) => void
}

interface ToolButton {
  command: string
  value?: string
  label: string
  icon: typeof Bold
  activeKey?: string
}

const formatButtons: ToolButton[] = [
  { command: 'bold', label: '加粗 (Ctrl+B)', icon: Bold, activeKey: 'bold' },
  {
    command: 'italic',
    label: '斜体 (Ctrl+I)',
    icon: Italic,
    activeKey: 'italic',
  },
  {
    command: 'underline',
    label: '下划线 (Ctrl+U)',
    icon: Underline,
    activeKey: 'underline',
  },
  {
    command: 'strikeThrough',
    label: '删除线',
    icon: Strikethrough,
    activeKey: 'strikeThrough',
  },
]

const blockButtons: ToolButton[] = [
  {
    command: 'insertUnorderedList',
    label: '无序列表',
    icon: List,
    activeKey: 'insertUnorderedList',
  },
  {
    command: 'insertOrderedList',
    label: '有序列表',
    icon: ListOrdered,
    activeKey: 'insertOrderedList',
  },
  {
    command: 'formatBlock',
    value: 'blockquote',
    label: '引用',
    icon: Quote,
  },
]

const historyButtons: ToolButton[] = [
  { command: 'undo', label: '撤销 (Ctrl+Z)', icon: Undo2 },
  { command: 'redo', label: '重做 (Ctrl+Shift+Z)', icon: Redo2 },
]

function ToolbarButton({
  button,
  active,
  onCommand,
}: {
  button: ToolButton
  active: Record<string, boolean>
  onCommand: EditorToolbarProps['onCommand']
}) {
  const Icon = button.icon
  const isActive = Boolean(button.activeKey && active[button.activeKey])

  return (
    <button
      type="button"
      className={`editor-toolbar__button${isActive ? ' is-active' : ''}`}
      title={button.label}
      aria-label={button.label}
      aria-pressed={isActive}
      onClick={() => onCommand(button.command, button.value)}
    >
      <Icon size={16} strokeWidth={2} />
    </button>
  )
}

export function EditorToolbar({ active, onCommand }: EditorToolbarProps) {
  return (
    <div
      className="editor-toolbar"
      role="toolbar"
      aria-label="文本格式工具"
      onMouseDown={(event) => {
        if ((event.target as HTMLElement).closest('button')) {
          event.preventDefault()
        }
      }}
    >
      <div className="editor-toolbar__group">
        {formatButtons.map((button) => (
          <ToolbarButton
            key={button.command}
            button={button}
            active={active}
            onCommand={onCommand}
          />
        ))}
      </div>
      <span className="editor-toolbar__divider" aria-hidden="true" />
      <div className="editor-toolbar__group">
        {blockButtons.map((button) => (
          <ToolbarButton
            key={`${button.command}-${button.value ?? ''}`}
            button={button}
            active={active}
            onCommand={onCommand}
          />
        ))}
      </div>
      <span className="editor-toolbar__divider" aria-hidden="true" />
      <div className="editor-toolbar__group">
        {historyButtons.map((button) => (
          <ToolbarButton
            key={button.command}
            button={button}
            active={active}
            onCommand={onCommand}
          />
        ))}
      </div>
      <span className="editor-toolbar__divider" aria-hidden="true" />
      <button
        type="button"
        className="editor-toolbar__button"
        title="清除格式"
        aria-label="清除格式"
        onClick={() => onCommand('removeFormat')}
      >
        <Eraser size={16} strokeWidth={2} />
      </button>
    </div>
  )
}
