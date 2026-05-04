import { DesignEditor } from "@/components/design-editor"
import { PAGE_MIN_HEIGHT_CLASS } from "@/lib/layout"

export default function Home() {
  return (
    <div className={`${PAGE_MIN_HEIGHT_CLASS} flex items-start justify-center bg-zinc-50 p-12`}>
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-xl font-semibold tracking-tight">Design Editor</h1>
        <DesignEditor />
      </div>
    </div>
  )
}
