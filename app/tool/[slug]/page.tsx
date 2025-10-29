import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, ArrowLeft } from "lucide-react"
import { getToolBySlug } from "@/lib/data"

interface ToolPageProps {
  params: {
    slug: string
  }
}

export default async function ToolPage({ params }: ToolPageProps) {
  // Next.js 15 动态路由的 params 属于动态 API，需要等待
  // 参考: https://nextjs.org/docs/messages/sync-dynamic-apis
  const resolvedParams = await (params as unknown as Promise<{ slug: string }>)
  const tool = getToolBySlug(resolvedParams.slug)

  if (!tool) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">工具不存在</h1>
        <p className="mb-6">您查找的工具不存在或已被移除</p>
        <Link href="/">
          <Button>返回首页</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/" className="inline-flex items-center text-sm mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        返回首页
      </Link>

      {/* 顶部封面图 */}
      <div className="relative w-full h-64 rounded-lg overflow-hidden mb-8">
        <Image
          src={
            tool.coverImage || `/placeholder.svg?height=400&width=1200&query=${encodeURIComponent(
              "abstract digital pattern for hero image"
            )}`
          }
          alt={tool.name}
          fill
          className="object-cover"
          priority
        />
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md">
            <Image src={tool.logo || "/placeholder.svg"} alt={tool.name} fill className="object-cover" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{tool.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge>{tool.category}</Badge>
              {tool.isHot && <Badge variant="secondary">热门</Badge>}
              {tool.isNew && <Badge variant="outline">最新</Badge>}
            </div>
          </div>
        </div>

        <Button className="mb-8" asChild>
          <a href={tool.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center">
            打开网站
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </Button>

        <div className="prose max-w-none">
          <div dangerouslySetInnerHTML={{ __html: tool.content || "" }} />
        </div>
      </div>
    </div>
  )
}
