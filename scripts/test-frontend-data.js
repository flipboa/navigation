require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 配置')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// 模拟修复后的 getHomePageDataInternal 函数
async function getHomePageDataInternal() {
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
    const categories = categoriesResult.data?.map((cat) => ({
      id: cat.slug,
      slug: cat.slug,
      name: cat.name,
      icon: cat.icon || '📁',
      tools_count: cat.tools_count || 0
    })) || []

    // 创建分类ID到slug的映射
    const categoryIdToSlug = {}
    categoriesResult.data?.forEach((cat) => {
      categoryIdToSlug[cat.id] = cat.slug
    })

    console.log('分类ID到slug映射:')
    Object.entries(categoryIdToSlug).forEach(([id, slug]) => {
      const category = categoriesResult.data.find(cat => cat.id === id)
      console.log(`  ${id} -> ${slug} (${category?.name})`)
    })

    // 处理热门工具
    const hotTools = hotToolsResult.data?.map((tool) => ({
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
    const newTools = newToolsResult.data?.map((tool) => ({
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
    const toolsByCategory = {}
    categories.forEach((cat) => {
      toolsByCategory[cat.id] = []
    })

    allToolsResult.data?.forEach((tool) => {
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
    return {
      categories: [],
      hotTools: [],
      newTools: [],
      toolsByCategory: {}
    }
  }
}

async function testFrontendData() {
  console.log('🧪 测试修复后的前端数据获取...\n')

  const data = await getHomePageDataInternal()

  console.log('\n1. 分类数据:')
  console.log(`   总数: ${data.categories.length}`)
  data.categories.forEach(cat => {
    console.log(`   - ${cat.name} (${cat.slug}): ${cat.tools_count} 个工具`)
  })

  console.log('\n2. 热门工具:')
  console.log(`   总数: ${data.hotTools.length}`)
  data.hotTools.forEach(tool => {
    console.log(`   - ${tool.name} (分类: ${tool.category})`)
  })

  console.log('\n3. 新工具:')
  console.log(`   总数: ${data.newTools.length}`)
  data.newTools.forEach(tool => {
    console.log(`   - ${tool.name} (分类: ${tool.category})`)
  })

  console.log('\n4. 按分类分组的工具:')
  Object.entries(data.toolsByCategory).forEach(([categorySlug, tools]) => {
    const category = data.categories.find(cat => cat.slug === categorySlug)
    console.log(`   ${category?.name || categorySlug}: ${tools.length} 个工具`)
    tools.forEach(tool => {
      console.log(`     - ${tool.name}`)
    })
  })

  // 验证数据完整性
  console.log('\n5. 数据完整性验证:')
  const totalToolsInCategories = Object.values(data.toolsByCategory).reduce((sum, tools) => sum + tools.length, 0)
  const totalHotTools = data.hotTools.length
  const totalNewTools = data.newTools.length
  
  console.log(`   分类中的工具总数: ${totalToolsInCategories}`)
  console.log(`   热门工具数: ${totalHotTools}`)
  console.log(`   新工具数: ${totalNewTools}`)
  console.log(`   数据完整性: ${totalToolsInCategories > 0 ? '✅ 正常' : '❌ 异常'}`)

  console.log('\n✅ 前端数据测试完成！')
}

testFrontendData()