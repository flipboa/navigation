import { createClient } from '@/lib/supabase/client'

// 定义Category类型，与数据库表结构对应
export interface Category {
  id: string
  slug: string
  name: string
  description?: string
  icon?: string
  color?: string
  parent_id?: string
  sort_order: number
  is_active: boolean
  show_on_homepage: boolean
  tools_count: number
  created_at: string
  updated_at: string
  created_by?: string
}

// 简化的Category类型，用于UI组件
export interface CategoryForUI {
  id: string
  slug: string
  name: string
  icon: string
  tools_count?: number
}

/**
 * 获取所有启用的分类，按排序权重排序
 */
export async function getActiveCategories(): Promise<CategoryForUI[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('categories')
    .select('id, slug, name, icon, sort_order, tools_count')
    .eq('is_active', true)
    .eq('show_on_homepage', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching categories:', error)
    // 如果数据库查询失败，返回静态数据作为备用
    return getFallbackCategories()
  }

  return data.map(category => ({
    id: category.id, // 使用数据库中的真实id
    slug: category.slug,
    name: category.name,
    icon: category.icon || '📁',
    tools_count: category.tools_count || 0
  }))
}

/**
 * 根据slug获取单个分类
 */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error) {
    console.error('Error fetching category:', error)
    return null
  }

  return data
}

/**
 * 获取所有分类（包括未启用的），用于管理界面
 */
export async function getAllCategories(): Promise<Category[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching all categories:', error)
    return []
  }

  return data
}

/**
 * 备用分类数据，当数据库查询失败时使用
 */
function getFallbackCategories(): CategoryForUI[] {
  return [
    { id: "writing", slug: "writing", name: "AI写作", icon: "✍️" },
    { id: "image", slug: "image", name: "图像生成", icon: "🖼️" },
    { id: "video", slug: "video", name: "视频制作", icon: "🎬" },
    { id: "audio", slug: "audio", name: "语音处理", icon: "🎵" },
    { id: "coding", slug: "coding", name: "代码开发", icon: "💻" },
    { id: "design", slug: "design", name: "设计工具", icon: "🎨" },
    { id: "productivity", slug: "productivity", name: "效率工具", icon: "⚡" },
    { id: "education", slug: "education", name: "教育学习", icon: "📚" },
    { id: "business", slug: "business", name: "商业应用", icon: "💼" },
  ]
}