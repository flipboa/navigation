import { createClient } from '@/lib/supabase/client'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { hotTools, newTools, toolsByCategory } from '@/lib/data'
import { CategoryForUI } from '@/lib/services/categories'

// 工具接口定义（基于数据库schema）
export interface Tool {
  id: string
  name: string
  slug: string
  description: string
  content?: string
  website_url: string
  logo_url?: string
  screenshots?: string[]
  category_id: string
  tags?: string[]
  status: 'draft' | 'pending' | 'published' | 'rejected' | 'archived'
  tool_type: 'free' | 'freemium' | 'paid' | 'open_source'
  pricing_info?: any
  is_hot: boolean
  is_new: boolean
  is_featured: boolean
  rating: number
  rating_count: number
  view_count: number
  click_count: number
  favorite_count: number
  seo_title?: string
  seo_description?: string
  seo_keywords?: string
  sort_order: number
  published_at?: string
  created_at: string
  updated_at: string
  submitted_by?: string
  reviewed_by?: string
  reviewed_at?: string
  review_notes?: string
}

// 用于UI显示的工具接口（简化版）
export interface ToolForUI {
  id: string
  name: string
  slug: string
  description: string
  logo: string // 映射自logo_url
  category: string // 映射自category_id
  isHot?: boolean // 映射自is_hot
  isNew?: boolean // 映射自is_new
  rating?: number
  view_count?: number
  website_url?: string
}

// 工具详情接口（包含分类信息）
export interface ToolWithCategory extends Tool {
  category_name?: string
  category_slug?: string
  category_icon?: string
}

/**
 * 获取热门工具
 */
export async function getHotTools(): Promise<ToolForUI[]> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('tools')
      .select(`
        id,
        name,
        slug,
        description,
        logo_url,
        category_id,
        is_hot,
        is_new,
        rating,
        view_count,
        website_url
      `)
      .eq('status', 'published')
      .eq('is_hot', true)
      .order('sort_order', { ascending: true })
      .order('view_count', { ascending: false })
      .limit(8)

    if (error) {
      console.error('Error fetching hot tools:', error)
      // 如果数据库查询失败，返回静态数据作为回退
      return hotTools.map(tool => ({
        ...tool,
        logo: tool.logo,
        category: tool.category
      }))
    }

    // 转换数据格式以匹配UI接口
    return data.map(tool => ({
      id: tool.id,
      name: tool.name,
      slug: tool.slug,
      description: tool.description,
      logo: tool.logo_url || '/placeholder.svg',
      category: tool.category_id,
      isHot: tool.is_hot,
      isNew: tool.is_new,
      rating: tool.rating,
      view_count: tool.view_count,
      website_url: tool.website_url
    }))
  } catch (error) {
    console.error('Error in getHotTools:', error)
    // 出错时返回静态数据
    return hotTools.map(tool => ({
      ...tool,
      logo: tool.logo,
      category: tool.category
    }))
  }
}

/**
 * 获取新工具
 */
export async function getNewTools(): Promise<ToolForUI[]> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('tools')
      .select(`
        id,
        name,
        slug,
        description,
        logo_url,
        category_id,
        is_hot,
        is_new,
        rating,
        view_count,
        website_url
      `)
      .eq('status', 'published')
      .eq('is_new', true)
      .order('published_at', { ascending: false })
      .limit(8)

    if (error) {
      console.error('Error fetching new tools:', error)
      // 如果数据库查询失败，返回静态数据作为回退
      return newTools.map(tool => ({
        ...tool,
        logo: tool.logo,
        category: tool.category
      }))
    }

    // 转换数据格式以匹配UI接口
    return data.map(tool => ({
      id: tool.id,
      name: tool.name,
      slug: tool.slug,
      description: tool.description,
      logo: tool.logo_url || '/placeholder.svg',
      category: tool.category_id,
      isHot: tool.is_hot,
      isNew: tool.is_new,
      rating: tool.rating,
      view_count: tool.view_count,
      website_url: tool.website_url
    }))
  } catch (error) {
    console.error('Error in getNewTools:', error)
    // 出错时返回静态数据
    return newTools.map(tool => ({
      ...tool,
      logo: tool.logo,
      category: tool.category
    }))
  }
}

/**
 * 根据分类ID获取工具
 */
export async function getToolsByCategory(categorySlug: string): Promise<ToolForUI[]> {
  try {
    const supabase = createClient()
    
    // 首先通过slug获取category_id
    const { data: categoryData, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', categorySlug)
      .eq('is_active', true)
      .single()

    if (categoryError || !categoryData) {
      console.error('Error fetching category by slug:', categoryError)
      // 如果分类不存在，返回静态数据作为回退
      return toolsByCategory[categorySlug]?.map(tool => ({
        ...tool,
        logo: tool.logo,
        category: tool.category
      })) || []
    }
    
    const { data, error } = await supabase
      .from('tools')
      .select(`
        id,
        name,
        slug,
        description,
        logo_url,
        category_id,
        is_hot,
        is_new,
        rating,
        view_count,
        website_url
      `)
      .eq('status', 'published')
      .eq('category_id', categoryData.id)
      .order('sort_order', { ascending: true })
      .order('rating', { ascending: false })
      .order('view_count', { ascending: false })

    if (error) {
      console.error('Error fetching tools by category:', error)
      // 如果数据库查询失败，返回静态数据作为回退
      return toolsByCategory[categorySlug]?.map(tool => ({
        ...tool,
        logo: tool.logo,
        category: tool.category
      })) || []
    }

    // 转换数据格式以匹配UI接口
    return data.map(tool => ({
      id: tool.id,
      name: tool.name,
      slug: tool.slug,
      description: tool.description,
      logo: tool.logo_url || '/placeholder.svg',
      category: categorySlug, // 使用slug而不是UUID
      isHot: tool.is_hot,
      isNew: tool.is_new,
      rating: tool.rating,
      view_count: tool.view_count,
      website_url: tool.website_url
    }))
  } catch (error) {
    console.error('Error in getToolsByCategory:', error)
    // 出错时返回静态数据
    return toolsByCategory[categorySlug]?.map(tool => ({
      ...tool,
      logo: tool.logo,
      category: tool.category
    })) || []
  }
}

/**
 * 获取所有分类的工具（用于主页面）
 * 优化版本：使用单次查询获取所有工具，避免 N+1 查询问题
 */
export async function getAllToolsByCategories(categoryIds: string[]): Promise<{ [key: string]: ToolForUI[] }> {
  try {
    const supabase = createClient()

    // 一次性查询所有分类的工具
    const { data, error } = await supabase
      .from('tools')
      .select(`
        id,
        name,
        slug,
        description,
        logo_url,
        category_id,
        is_hot,
        is_new,
        rating,
        view_count,
        website_url,
        sort_order
      `)
      .eq('status', 'published')
      .in('category_id', categoryIds)
      .order('sort_order', { ascending: true })
      .order('rating', { ascending: false })
      .order('view_count', { ascending: false })

    if (error) {
      console.error('Error fetching all tools by categories:', error)
      return toolsByCategory
    }

    // 在内存中按分类分组
    const result: { [key: string]: ToolForUI[] } = {}

    // 初始化所有分类为空数组
    categoryIds.forEach(categoryId => {
      result[categoryId] = []
    })

    // 将工具分配到对应的分类
    data.forEach(tool => {
      if (!result[tool.category_id]) {
        result[tool.category_id] = []
      }
      result[tool.category_id].push({
        id: tool.id,
        name: tool.name,
        slug: tool.slug,
        description: tool.description,
        logo: tool.logo_url || '/placeholder.svg',
        category: tool.category_id,
        isHot: tool.is_hot,
        isNew: tool.is_new,
        rating: tool.rating,
        view_count: tool.view_count,
        website_url: tool.website_url
      })
    })

    return result
  } catch (error) {
    console.error('Error in getAllToolsByCategories:', error)
    return toolsByCategory
  }
}

/**
 * 根据slug获取工具详情
 */
export async function getToolBySlug(slug: string): Promise<ToolWithCategory | null> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('tools')
      .select(`
        *,
        categories (
          name,
          slug,
          icon
        )
      `)
      .eq('slug', slug)
      .eq('status', 'published')
      .single()

    if (error) {
      console.error('Error fetching tool by slug:', error)
      return null
    }

    // 转换数据格式
    return {
      ...data,
      category_name: data.categories?.name,
      category_slug: data.categories?.slug,
      category_icon: data.categories?.icon
    }
  } catch (error) {
    console.error('Error in getToolBySlug:', error)
    return null
  }
}

/**
 * 增加工具浏览量
 */
export async function incrementToolViewCount(toolId: string): Promise<void> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase.rpc('increment_tool_view_count', {
      tool_id: toolId
    })

    if (error) {
      console.error('Error incrementing view count:', error)
    }
  } catch (error) {
    console.error('Error in incrementToolViewCount:', error)
  }
}

/**
 * 增加工具点击量
 */
export async function incrementToolClickCount(toolId: string): Promise<void> {
  try {
    const supabase = createClient()

    const { error } = await supabase.rpc('increment_tool_click_count', {
      tool_id: toolId
    })

    if (error) {
      console.error('Error incrementing click count:', error)
    }
  } catch (error) {
    console.error('Error in incrementToolClickCount:', error)
  }
}

// ============================================
// 服务器端数据获取函数（用于 Server Components）
// ============================================

/**
 * 服务器端：并行获取主页所有数据
 * 这个函数用于服务器组件，一次性获取所有需要的数据
 * 使用 Next.js 缓存策略优化性能
 */
const getHomePageDataInternal = async (supabase: any) => {
  try {

    // 并行执行所有查询
    const [categoriesResult, hotToolsResult, newToolsResult, allToolsResult] = await Promise.all([
      // 获取分类（包括完整信息）
      supabase
        .from('categories')
        .select('id, slug, name, icon, sort_order, tools_count')
        .eq('is_active', true)
        .eq('show_on_homepage', true)
        .order('sort_order', { ascending: true }),

      // 获取热门工具
      supabase
        .from('tools')
        .select(`
          id, name, slug, description, logo_url, category_id,
          is_hot, is_new, rating, view_count, website_url
        `)
        .eq('status', 'published')
        .eq('is_hot', true)
        .order('sort_order', { ascending: true })
        .order('view_count', { ascending: false })
        .limit(8),

      // 获取新工具
      supabase
        .from('tools')
        .select(`
          id, name, slug, description, logo_url, category_id,
          is_hot, is_new, rating, view_count, website_url
        `)
        .eq('status', 'published')
        .eq('is_new', true)
        .order('published_at', { ascending: false })
        .limit(8),

      // 获取所有已发布的工具
      supabase
        .from('tools')
        .select(`
          id, name, slug, description, logo_url, category_id,
          is_hot, is_new, rating, view_count, website_url, sort_order
        `)
        .eq('status', 'published')
        .order('sort_order', { ascending: true })
        .order('rating', { ascending: false })
        .order('view_count', { ascending: false })
    ])

    // 处理分类数据
    const categories = categoriesResult.data?.map((cat: any) => ({
      id: cat.slug,
      slug: cat.slug,
      name: cat.name,
      icon: cat.icon || '📁',
      tools_count: cat.tools_count || 0
    })) || []

    // 创建分类ID到slug的映射
    const categoryIdToSlug: { [key: string]: string } = {}
    categoriesResult.data?.forEach((cat: any) => {
      categoryIdToSlug[cat.id] = cat.slug
    })

    // 处理热门工具
    const hotTools = hotToolsResult.data?.map((tool: any) => ({
      id: tool.id,
      name: tool.name,
      slug: tool.slug,
      description: tool.description,
      logo: tool.logo_url || '/placeholder.svg',
      category: categoryIdToSlug[tool.category_id] || tool.category_id,
      isHot: tool.is_hot,
      isNew: tool.is_new,
      rating: tool.rating,
      view_count: tool.view_count,
      website_url: tool.website_url
    })) || []

    // 处理新工具
    const newTools = newToolsResult.data?.map((tool: any) => ({
      id: tool.id,
      name: tool.name,
      slug: tool.slug,
      description: tool.description,
      logo: tool.logo_url || '/placeholder.svg',
      category: categoryIdToSlug[tool.category_id] || tool.category_id,
      isHot: tool.is_hot,
      isNew: tool.is_new,
      rating: tool.rating,
      view_count: tool.view_count,
      website_url: tool.website_url
    })) || []

    // 按分类组织工具
    const toolsByCategory: { [key: string]: ToolForUI[] } = {}
    categories.forEach((cat: CategoryForUI) => {
      toolsByCategory[cat.id] = []
    })

    allToolsResult.data?.forEach((tool: any) => {
      // 使用映射将category_id转换为category_slug
      const categorySlug = categoryIdToSlug[tool.category_id]
      if (categorySlug && toolsByCategory[categorySlug]) {
        toolsByCategory[categorySlug].push({
          id: tool.id,
          name: tool.name,
          slug: tool.slug,
          description: tool.description,
          logo: tool.logo_url || '/placeholder.svg',
          category: categorySlug,
          isHot: tool.is_hot,
          isNew: tool.is_new,
          rating: tool.rating,
          view_count: tool.view_count,
          website_url: tool.website_url
        })
      }
    })

    return {
      categories,
      hotTools,
      newTools,
      toolsByCategory
    }
  } catch (error) {
    console.error('Error fetching homepage data:', error)
    // 返回空数据或回退数据
    return {
      categories: [],
      hotTools: [],
      newTools: [],
      toolsByCategory: {}
    }
  }
}

// 导出主页数据获取函数（不使用缓存以避免cookies问题）
export const getHomePageData = async () => {
  const supabase = await createServerClient()
  return getHomePageDataInternal(supabase)
}