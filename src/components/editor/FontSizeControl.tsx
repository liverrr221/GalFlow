import { Minus, Plus, Type } from 'lucide-react'
import {
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  clampFontSize,
} from '../../lib/constants'

interface FontSizeControlProps {
  value: number
  onChange: (value: number) => void
  compact?: boolean
}

export function FontSizeControl({
  value,
  onChange,
  compact = false,
}: FontSizeControlProps) {
  const safeValue = clampFontSize(value)
  const changeBy = (delta: number) => onChange(clampFontSize(safeValue + delta))

  return (
    <div
      className={`font-size-control${compact ? ' is-compact' : ''}`}
      aria-label="正文字号"
    >
      <span className="font-size-control__label">
        <Type size={14} strokeWidth={1.9} />
        {!compact && <span>字号</span>}
      </span>
      <button
        type="button"
        className="font-size-control__step"
        onClick={() => changeBy(-1)}
        disabled={safeValue <= MIN_FONT_SIZE}
        aria-label="减小字号"
      >
        <Minus size={13} />
      </button>
      {!compact && (
        <input
          type="range"
          min={MIN_FONT_SIZE}
          max={MAX_FONT_SIZE}
          step={1}
          value={safeValue}
          onChange={(event) => onChange(clampFontSize(Number(event.target.value)))}
          aria-label="调整正文字号"
        />
      )}
      <span className="font-size-control__value">{safeValue}px</span>
      <button
        type="button"
        className="font-size-control__step"
        onClick={() => changeBy(1)}
        disabled={safeValue >= MAX_FONT_SIZE}
        aria-label="增大字号"
      >
        <Plus size={13} />
      </button>
    </div>
  )
}
