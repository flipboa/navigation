"use client"

import { useState, useRef, useEffect } from "react"
import { Search } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import CategorySidebar from "@/components/category-sidebar"
import ToolCard from "@/components/tool-card"
import { categories, hotTools, newTools, toolsByCategory } from "@/lib/data"
import { useAuth } from "@/components/auth-provider"

export default function HomePage() {
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
    
    console.log("点击分类:", categoryId)
    console.log("容器:", container)
    console.log("目标section:", targetSection)
    
    if (!container || !targetSection) {
      console.log("容器或目标section不存在")
      return
    }

    // 找到分类标题的h2元素
    const titleH2 = targetSection.querySelector("h2") as HTMLHeadingElement
    if (!titleH2) {
      console.log("未找到h2标题")
      return
    }

    // 计算滚动位置：让h2顶部距离header底部10px
    // header高度64px + 10px间距 = 74px
    const headerHeight = 64
    const desiredGap = 10
    const targetTopPosition = headerHeight + desiredGap
    
    // 获取h2相对于页面的位置
    const h2Rect = titleH2.getBoundingClientRect()
    const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop
    
    // 计算h2当前距离页面顶部的绝对位置
    const h2AbsoluteTop = h2Rect.top + currentScrollTop
    
    // 计算需要滚动到的位置
    const targetScrollTop = h2AbsoluteTop - targetTopPosition
    
    // 平滑滚动到目标位置
    window.scrollTo({
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
    <div className="flex">
      {/* 左侧分类栏 */}
      <CategorySidebar
        categories={categories}
        activeCategory={activeCategory}
        onCategoryClick={handleCategoryClick}
        onSubmitClick={handleSubmitClick}
      />

      {/* 主内容区 */}
      <div className="flex-1 p-6 overflow-auto" ref={contentRef}>
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