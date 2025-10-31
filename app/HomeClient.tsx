"use client"

import { useState, useRef } from "react"
import { Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import CategorySidebar from "@/components/category-sidebar"
import ToolCard from "@/components/tool-card"
import { CategoryForUI } from "@/lib/services/categories"
import { ToolForUI } from "@/lib/services/tools"
import { useAuth } from "@/components/auth-provider"

interface HomeClientProps {
  categories: CategoryForUI[]
  hotTools: ToolForUI[]
  newTools: ToolForUI[]
  toolsByCategory: { [key: string]: ToolForUI[] }
}

export default function HomeClient({
  categories,
  hotTools,
  newTools,
  toolsByCategory
}: HomeClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const categoryRefs = useRef<{ [key: string]: HTMLElement | null }>({})
  const contentRef = useRef<HTMLDivElement | null>(null)

  const handleCategoryClick = (categoryId: string) => {
    setActiveCategory(categoryId)
    const container = contentRef.current
    const targetSection = categoryRefs.current[categoryId]

    if (!container || !targetSection) {
      return
    }

    // 找到分类标题的h2元素
    const titleH2 = targetSection.querySelector("h2") as HTMLHeadingElement
    if (!titleH2) {
      return
    }

    // 计算滚动位置：让h2顶部距离容器顶部10px
    const desiredGap = 10

    // 获取h2相对于容器的位置
    const containerRect = container.getBoundingClientRect()
    const h2Rect = titleH2.getBoundingClientRect()
    
    // 计算h2相对于容器内容的位置
    const h2RelativeTop = h2Rect.top - containerRect.top + container.scrollTop

    // 计算需要滚动到的位置
    const targetScrollTop = h2RelativeTop - desiredGap

    // 平滑滚动到目标位置
    container.scrollTo({
      top: targetScrollTop,
      behavior: "smooth"
    })
  }

  const handleSubmitClick = () => {
    if (user) {
      router.push("/user/submit")
    } else {
      toast({
        title: "请先登录",
        description: "提交工具前请先登录您的账户",
      })
      router.push("/login")
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[256px_1fr] h-[calc(100vh-4rem)] overflow-hidden">
      {/* 左侧分类栏 */}
      <CategorySidebar
        categories={categories}
        activeCategory={activeCategory}
        onCategoryClick={handleCategoryClick}
        onSubmitClick={handleSubmitClick}
      />

      {/* 主内容区 - 独立的滚动容器 */}
      <div className="overflow-y-auto overflow-x-hidden p-6" ref={contentRef}>
        {/* 移动端搜索框 */}
        <div className="relative mb-6 md:hidden">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="搜索AI工具..."
            className="w-full rounded-md border border-input bg-background pl-8 pr-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* 热门工具 */}
        <section className="mb-10">
          <div className="mb-4">
            <h2 className="text-xl font-bold">热门工具</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {hotTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </section>

        {/* 最新收录 */}
        <section className="mb-10">
          <div className="mb-4">
            <h2 className="text-xl font-bold">最新收录</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {newTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </section>

        {/* 分类展示区 */}
        {categories.map((category) => (
          <section
            key={category.id}
            id={category.id}
            ref={(el) => {
              categoryRefs.current[category.id] = el
            }}
            className="mb-10 scroll-mt-[10px]"
          >
            <div className="mb-4">
              <h2 className={`text-xl font-bold transition-colors duration-300 ${
                activeCategory === category.id
                  ? 'text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text'
                  : 'text-gray-900 dark:text-gray-100'
              }`}>
                {category.name}
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {toolsByCategory[category.id]?.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
