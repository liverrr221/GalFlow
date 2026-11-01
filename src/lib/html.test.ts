import { describe, expect, it } from 'vitest'
import {
  countTextCharacters,
  htmlToPlainText,
  htmlToPreview,
  isEditorEmpty,
} from './html'

describe('htmlToPlainText', () => {
  it('keeps paragraph breaks, inline text and list items', () => {
    const html =
      '<p>第一段</p><p>第二段 <strong>重点</strong></p><ul><li>甲</li><li>乙</li></ul>'

    expect(htmlToPlainText(html)).toBe(
      '第一段\n\n第二段 重点\n\n• 甲\n• 乙',
    )
  })

  it('supports editor-created div lines and line breaks', () => {
    expect(htmlToPlainText('<div>第一行</div><div>第二行<br>第三行</div>')).toBe(
      '第一行\n第二行\n第三行',
    )
  })

  it('returns an empty string for empty editor markup', () => {
    expect(htmlToPlainText('<br>')).toBe('')
    expect(htmlToPlainText('')).toBe('')
  })
})

describe('htmlToPreview', () => {
  it('flattens lines into a readable preview', () => {
    expect(htmlToPreview('<p>第一段</p><p>第二段</p>')).toBe('第一段 · 第二段')
  })

  it('truncates long previews with an ellipsis', () => {
    const preview = htmlToPreview(`<p>${'长'.repeat(200)}</p>`, 20)
    expect(preview).toHaveLength(21)
    expect(preview.endsWith('…')).toBe(true)
  })
})

describe('countTextCharacters', () => {
  it('ignores whitespace and markup', () => {
    expect(countTextCharacters('<p>你 好<br>世界</p>')).toBe(4)
    expect(isEditorEmpty('<p><br></p>')).toBe(true)
  })
})
