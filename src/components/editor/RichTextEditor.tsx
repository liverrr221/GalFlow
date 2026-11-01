import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type CSSProperties,
} from 'react'
import { useI18n } from '../../i18n'
import { clampFontSize } from '../../lib/constants'
import { isEditorEmpty } from '../../lib/html'
import { EditorToolbar } from './EditorToolbar'

interface RichTextEditorProps {
  nodeId: string
  html: string
  fontSize: number
  onChange: (html: string) => void
  variant?: 'sidebar' | 'fullscreen'
  placeholder?: string
  autoFocus?: boolean
}

const EMPTY_FORMAT_STATE: Record<string, boolean> = {
  bold: false,
  italic: false,
  underline: false,
  strikeThrough: false,
  insertUnorderedList: false,
  insertOrderedList: false,
}

export function RichTextEditor({
  nodeId,
  html,
  fontSize,
  onChange,
  variant = 'sidebar',
  placeholder,
  autoFocus = false,
}: RichTextEditorProps) {
  const { t } = useI18n()
  const placeholderText = placeholder ?? t('editor.placeholder')
  const editorRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(EMPTY_FORMAT_STATE)
  const [isEmpty, setIsEmpty] = useState(() => isEditorEmpty(html))

  const emitChange = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    setIsEmpty(isEditorEmpty(editor.innerHTML))
    onChange(editor.innerHTML)
  }, [onChange])

  const refreshActive = useCallback(() => {
    const editor = editorRef.current
    const selection = window.getSelection()
    if (
      !editor ||
      !selection ||
      selection.rangeCount === 0 ||
      !selection.anchorNode ||
      !editor.contains(selection.anchorNode)
    ) {
      return
    }

    try {
      setActive({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikeThrough: document.queryCommandState('strikeThrough'),
        insertUnorderedList: document.queryCommandState('insertUnorderedList'),
        insertOrderedList: document.queryCommandState('insertOrderedList'),
      })
    } catch {
      // queryCommandState is not implemented by every browser engine. The
      // editor still works, it simply does not highlight toggled buttons.
    }
  }, [])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    editor.innerHTML = html
    setIsEmpty(isEditorEmpty(html))
    // The node id is the identity boundary of an editing session. Re-applying
    // HTML on every store update would reset the caret on each keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId])

  useEffect(() => {
    if (!autoFocus) return
    const editor = editorRef.current
    if (!editor) return

    editor.focus()
    const range = document.createRange()
    range.selectNodeContents(editor)
    range.collapse(false)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
  }, [autoFocus, nodeId])

  useEffect(() => {
    document.addEventListener('selectionchange', refreshActive)
    return () => document.removeEventListener('selectionchange', refreshActive)
  }, [refreshActive])

  const runCommand = (command: string, value?: string) => {
    const editor = editorRef.current
    if (!editor) return

    editor.focus()

    try {
      if (
        command === 'formatBlock' &&
        value === 'blockquote' &&
        document.queryCommandValue('formatBlock').toLowerCase() === 'blockquote'
      ) {
        document.execCommand('formatBlock', false, 'p')
      } else {
        document.execCommand(command, false, value)
      }
    } catch {
      // Keep the editor usable even if a legacy formatting command is
      // unsupported. Typing and plain-text editing are unaffected.
    }

    emitChange()
    refreshActive()
  }

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const text = event.clipboardData.getData('text/plain')
    if (!text) return

    event.preventDefault()
    document.execCommand('insertText', false, text)
    emitChange()
  }

  return (
    <div
      className={`rich-editor rich-editor--${variant}`}
      style={
        {
          '--editor-font-size': `${clampFontSize(fontSize)}px`,
        } as CSSProperties
      }
    >
      <EditorToolbar active={active} onCommand={runCommand} />
      <div className="rich-editor__surface">
        {isEmpty && (
          <div className="rich-editor__placeholder" aria-hidden="true">
            {placeholderText}
          </div>
        )}
        <div
          ref={editorRef}
          className="rich-editor__content"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={t('editor.aria')}
          spellCheck={false}
          style={{ fontSize: `${clampFontSize(fontSize)}px` }}
          onInput={emitChange}
          onBlur={emitChange}
          onPaste={handlePaste}
          onFocus={refreshActive}
          onKeyUp={refreshActive}
          onMouseUp={refreshActive}
        />
      </div>
    </div>
  )
}
