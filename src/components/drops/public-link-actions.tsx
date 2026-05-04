"use client"

import { useState } from "react"
import { ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PublicLinkActions({ href }: { href: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <button
        type="button"
        onClick={handleCopy}
        className="min-w-0 truncate font-mono text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        {copied ? "Copied" : href}
      </button>
      <Button
        variant="ghost"
        size="icon-xs"
        nativeButton={false}
        render={<a href={href} aria-label="Open public drop" />}
      >
        <ArrowUpRight />
      </Button>
    </div>
  )
}
