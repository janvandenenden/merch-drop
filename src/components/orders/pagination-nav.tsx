import Link from "next/link"
import { Button } from "@/components/ui/button"

type Props = {
  page: number
  totalPages: number
  buildUrl: (page: number) => string
}

export function PaginationNav({ page, totalPages, buildUrl }: Props) {
  return (
    <div className="flex items-center justify-center gap-2">
      {page > 1 ? (
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href={buildUrl(page - 1)} />}>
          Previous
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>Previous</Button>
      )}
      <span className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href={buildUrl(page + 1)} />}>
          Next
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>Next</Button>
      )}
    </div>
  )
}
