export const OPTION_COLORS = [
  '#d64c79',
  '#c38a35',
  '#3f8b80',
  '#735acb',
  '#c2684a',
] as const

export const MIN_FONT_SIZE = 12
export const MAX_FONT_SIZE = 36
export const DEFAULT_FONT_SIZE = 18

export const APP_STORAGE_KEY = 'galflow:story:v1'

export const OPTION_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function optionLetter(index: number): string {
  let value = index + 1
  let result = ''

  while (value > 0) {
    value -= 1
    result = OPTION_LETTERS[value % 26] + result
    value = Math.floor(value / 26)
  }

  return result
}

export function clampFontSize(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_FONT_SIZE
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(value)))
}
