"use client"

import { useRouter } from "next/navigation"

type Props = {
  drops: { id: string; title: string }[]
  selected: string | undefined
}

export function DropFilterSelect({ drops, selected }: Props) {
  const router = useRouter()

  function buildUrl(dropId: string | null) {
    const p = new URLSearchParams()
    if (dropId) p.set("drop", dropId)
    const qs = p.toString()
    return `/dashboard/orders${qs ? `?${qs}` : ""}`
  }

  return (
    <select
      value={selected ?? ""}
      onChange={(e) => router.push(buildUrl(e.target.value || null))}
      className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
    >
      <option value="">All drops</option>
      {drops.map((d) => (
        <option key={d.id} value={d.id}>
          {d.title}
        </option>
      ))}
    </select>
  )
}
