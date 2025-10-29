import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { ToolForUI } from "@/lib/services/tools"

interface ToolCardProps {
  tool: ToolForUI
}

export default function ToolCard({ tool }: ToolCardProps) {
  return (
    <Link href={`/tool/${tool.slug}`} target="_blank">
      <Card className="h-full overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md">
              <Image src={tool.logo || "/placeholder.svg"} alt={tool.name} fill className="object-cover" />
            </div>
            <div>
              <h3 className="font-medium line-clamp-1">{tool.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{tool.description}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
