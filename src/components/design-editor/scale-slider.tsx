"use client"

export function ScaleSlider({
  scale,
  sliderMax,
  printedWidthIn,
  onChange,
}: {
  scale: number
  sliderMax: number
  printedWidthIn: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-700">Scale</span>
        <span className="text-xs text-neutral-500">
          {printedWidthIn > 0 ? `${printedWidthIn.toFixed(1)}" wide` : "—"}
        </span>
      </div>
      <input
        type="range"
        min={0.001}
        max={sliderMax}
        step={0.001}
        value={scale}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-neutral-900"
      />
    </div>
  )
}
