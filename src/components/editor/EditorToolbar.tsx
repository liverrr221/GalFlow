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
import { useI18n, type TranslationKey } from '../../i18n'

interface EditorToolbarProps {
  active: Record<string, boolean>
  onCommand: (command: string, value?: string) => void
}

interface ToolButton {
  command: string
  value?: string
  labelKey: TranslationKey
  icon: typeof Bold
  activeKey?: string
}

const formatButtons: ToolButton[] = [
  { command: 'bold', labelKey: 'toolbar.bold', icon: Bold, activeKey: 'bold' },
  {
    command: 'italic',
    labelKey: 'toolbar.italic',
    icon: Italic,
    activeKey: 'italic',
  },
  {
    command: 'underline',
    labelKey: 'toolbar.underline',
    icon: Underline,
    activeKey: 'underline',
  },
  {
    command: 'strikeThrough',
    labelKey: 'toolbar.strike',
    icon: Strikethrough,
    activeKey: 'strikeThrough',
  },
]

const blockButtons: ToolButton[] = [
  {
    command: 'insertUnorderedList',
    labelKey: 'toolbar.bulletList',
    icon: List,
    activeKey: 'insertUnorderedList',
  },
  {
    command: 'insertOrderedList',
    labelKey: 'toolbar.orderedList',
    icon: ListOrdered,
    activeKey: 'insertOrderedList',
  },
  {
    command: 'formatBlock',
    value: 'blockquote',
    labelKey: 'toolbar.quote',
    icon: Quote,
  },
]

const historyButtons: ToolButton[] = [
  { command: 'undo', labelKey: 'toolbar.undo', icon: Undo2 },
  { command: 'redo', labelKey: 'toolbar.redo', icon: Redo2 },
]

function ToolbarButton({
  button,
  label,
  active,
  onCommand,
}: {
  button: ToolButton
  label: string
  active: Record<string, boolean>
  onCommand: EditorToolbarProps['onCommand']
}) {
  const Icon = button.icon
  const isActive = Boolean(button.activeKey && active[button.activeKey])

  return (
    <button
      type="button"
      className={`editor-toolbar__button${isActive ? ' is-active' : ''}`}
      title={label}
      aria-label={label}
      aria-pressed={isActive}
      onClick={() => onCommand(button.command, button.value)}
    >
      <Icon size={16} strokeWidth={2} />
    </button>
  )
}

export function EditorToolbar({ active, onCommand }: EditorToolbarProps) {
  const { t } = useI18n()

  return (
    <div
      className="editor-toolbar"
      role="toolbar"
      aria-label={t('toolbar.aria')}
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
            label={t(button.labelKey)}
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
            label={t(button.labelKey)}
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
            label={t(button.labelKey)}
            active={active}
            onCommand={onCommand}
          />
        ))}
      </div>
      <span className="editor-toolbar__divider" aria-hidden="true" />
      <button
        type="button"
        className="editor-toolbar__button"
        title={t('toolbar.clear')}
        aria-label={t('toolbar.clear')}
        onClick={() => onCommand('removeFormat')}
      >
        <Eraser size={16} strokeWidth={2} />
      </button>
    </div>
  )
}
