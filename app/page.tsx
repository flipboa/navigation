import { getHomePageData } from "@/lib/services/tools"
import HomeClient from "./HomeClient"

export const dynamic = 'force-dynamic' // 确保每次都获取最新数据

export default async function HomePage() {
  // 在服务器端并行获取所有数据
  const { categories, hotTools, newTools, toolsByCategory } = await getHomePageData()

  // 将数据传递给客户端组件
  return (
    <HomeClient
      categories={categories}
      hotTools={hotTools}
      newTools={newTools}
      toolsByCategory={toolsByCategory}
    />
  )
}