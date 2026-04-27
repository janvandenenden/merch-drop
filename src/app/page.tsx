import { DesignEditor } from "@/components/design-editor"

export default function Home() {
  return (
    <div className="flex min-h-screen items-start justify-center bg-zinc-50 p-12">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-xl font-semibold tracking-tight">Design Editor</h1>
        <DesignEditor />
      </div>
    </div>
  )
}
