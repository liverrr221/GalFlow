const BLOCK_TAGS = new Set([
  'address',
  'article',
  'aside',
  'div',
  'figure',
  'figcaption',
  'footer',
  'header',
  'main',
  'section',
])

const PARAGRAPH_TAGS = new Set([
  'blockquote',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'pre',
])

/**
 * Converts editor HTML into readable plain text while preserving paragraphs,
 * line breaks and list items. It deliberately avoids layout-dependent APIs such
 * as innerText so the same result can be produced in tests and non-browser
 * environments.
 */
export function htmlToPlainText(html: string): string {
  if (!html.trim()) return ''

  if (typeof DOMParser === 'undefined') {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  const document = new DOMParser().parseFromString(html, 'text/html')
  let text = ''

  const ensureBreaks = (count: number) => {
    const trailing = text.match(/\n*$/)?.[0].length ?? 0
    if (trailing < count) text += '\n'.repeat(count - trailing)
  }

  const walk = (node: Node) => {
    if (node.nodeType === 3) {
      text += node.nodeValue ?? ''
      return
    }

    if (node.nodeType !== 1) return

    const element = node as HTMLElement
    const tag = element.tagName.toLowerCase()

    if (tag === 'br') {
      text += '\n'
      return
    }

    if (tag === 'ul' || tag === 'ol') {
      ensureBreaks(1)
      let itemIndex = 0

      element.childNodes.forEach((child) => {
        if (
          child.nodeType === 1 &&
          (child as HTMLElement).tagName.toLowerCase() === 'li'
        ) {
          itemIndex += 1
          text += tag === 'ol' ? `${itemIndex}. ` : '• '
          child.childNodes.forEach(walk)
          ensureBreaks(1)
        } else {
          walk(child)
        }
      })

      ensureBreaks(1)
      return
    }

    if (tag === 'li') {
      ensureBreaks(1)
      text += '• '
      element.childNodes.forEach(walk)
      ensureBreaks(1)
      return
    }

    if (PARAGRAPH_TAGS.has(tag)) {
      ensureBreaks(2)
      element.childNodes.forEach(walk)
      ensureBreaks(2)
      return
    }

    if (BLOCK_TAGS.has(tag)) {
      ensureBreaks(1)
      element.childNodes.forEach(walk)
      ensureBreaks(1)
      return
    }

    element.childNodes.forEach(walk)
  }

  document.body.childNodes.forEach(walk)

  return text
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+|\n+$/g, '')
}

export function htmlToPreview(html: string, maxLength = 130): string {
  const plain = htmlToPlainText(html).replace(/\n+/g, ' · ').trim()

  if (!plain) return ''
  if (plain.length <= maxLength) return plain

  return `${plain.slice(0, maxLength).trimEnd()}…`
}

export function countTextCharacters(html: string): number {
  return htmlToPlainText(html).replace(/\s/g, '').length
}

export function isEditorEmpty(html: string): boolean {
  return htmlToPlainText(html).length === 0
}
