"use client"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { CategoryForUI } from "@/lib/services/categories"

interface CategorySidebarProps {
  categories: CategoryForUI[]
  activeCategory: string | null
  onCategoryClick: (categoryId: string) => void
  onSubmitClick: () => void
}

export default function CategorySidebar({
  categories,
  activeCategory,
  onCategoryClick,
  onSubmitClick,
}: CategorySidebarProps) {
  return (
    <div className="hidden md:block w-64 border-r bg-background h-[calc(100vh-4rem)] sticky top-16">
      <ScrollArea className="h-full py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold">分类</h2>
          <div className="space-y-1">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant="ghost"
                className={cn("w-full justify-start", activeCategory === category.id && "bg-accent")}
                onClick={() => onCategoryClick(category.id)}
              >
                <span className="mr-2">{category.icon}</span>
                {category.name}
                {category.tools_count !== undefined && category.tools_count > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {category.tools_count}
                  </span>
                )}
              </Button>
            ))}
          </div>
        </div>
        <div className="px-3 py-4 mt-4">
          <Button className="w-full flex items-center gap-2" onClick={onSubmitClick}>
            <Plus className="h-4 w-4" />
            提交站点
          </Button>
        </div>
      </ScrollArea>
    </div>
  )
}
