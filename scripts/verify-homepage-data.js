require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 配置')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyHomepageData() {
  console.log('🔍 验证首页数据同步...\n')

  try {
    // 1. 获取分类数据
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, slug, name, icon, sort_order, tools_count')
      .eq('is_active', true)
      .eq('show_on_homepage', true)
      .order('sort_order', { ascending: true })

    if (categoriesError) {
      console.error('❌ 获取分类数据失败:', categoriesError)
      return
    }

    console.log(`1. 分类数据: ${categories.length} 个分类`)
    categories.forEach(cat => {
      console.log(`   - ${cat.name} (${cat.slug}): ${cat.tools_count || 0} 个工具`)
    })

    // 2. 获取所有已发布的工具
    const { data: allTools, error: toolsError } = await supabase
      .from('tools')
      .select(`
        id, name, slug, description, logo_url, category_id,
        is_hot, is_new, rating, view_count, website_url, sort_order
      `)
      .eq('status', 'published')
      .order('sort_order', { ascending: true })
      .order('rating', { ascending: false })
      .order('view_count', { ascending: false })

    if (toolsError) {
      console.error('❌ 获取工具数据失败:', toolsError)
      return
    }

    console.log(`\n2. 工具数据: ${allTools.length} 个已发布工具`)
    allTools.forEach(tool => {
      console.log(`   - ${tool.name} (${tool.slug}) - 分类: ${tool.category_id}`)
    })

    // 3. 按分类组织工具
    const toolsByCategory = {}
    categories.forEach(cat => {
      toolsByCategory[cat.slug] = []
    })

    allTools.forEach(tool => {
      const categorySlug = tool.category_id
      if (categorySlug && toolsByCategory[categorySlug]) {
        toolsByCategory[categorySlug].push(tool)
      } else {
        console.log(`   ⚠️  工具 "${tool.name}" 的分类 "${categorySlug}" 不存在或未激活`)
      }
    })

    console.log('\n3. 按分类分组的工具:')
    Object.entries(toolsByCategory).forEach(([categorySlug, tools]) => {
      const category = categories.find(cat => cat.slug === categorySlug)
      console.log(`   ${category?.name || categorySlug}: ${tools.length} 个工具`)
      tools.forEach(tool => {
        console.log(`     - ${tool.name}`)
      })
    })

    // 4. 获取热门工具
    const { data: hotTools, error: hotToolsError } = await supabase
      .from('tools')
      .select(`
        id, name, slug, description, logo_url, category_id,
        is_hot, is_new, rating, view_count, website_url
      `)
      .eq('status', 'published')
      .eq('is_hot', true)
      .order('sort_order', { ascending: true })
      .order('view_count', { ascending: false })
      .limit(8)

    if (hotToolsError) {
      console.error('❌ 获取热门工具失败:', hotToolsError)
      return
    }

    console.log(`\n4. 热门工具: ${hotTools.length} 个`)
    hotTools.forEach(tool => {
      console.log(`   - ${tool.name} (分类: ${tool.category_id})`)
    })

    // 5. 获取新工具
    const { data: newTools, error: newToolsError } = await supabase
      .from('tools')
      .select(`
        id, name, slug, description, logo_url, category_id,
        is_hot, is_new, rating, view_count, website_url
      `)
      .eq('status', 'published')
      .eq('is_new', true)
      .order('published_at', { ascending: false })
      .limit(8)

    if (newToolsError) {
      console.error('❌ 获取新工具失败:', newToolsError)
      return
    }

    console.log(`\n5. 新工具: ${newTools.length} 个`)
    newTools.forEach(tool => {
      console.log(`   - ${tool.name} (分类: ${tool.category_id})`)
    })

    // 6. 验证数据完整性
    console.log('\n6. 数据完整性验证:')
    const totalToolsInCategories = Object.values(toolsByCategory).reduce((sum, tools) => sum + tools.length, 0)
    console.log(`   总工具数: ${allTools.length}`)
    console.log(`   分类中的工具总数: ${totalToolsInCategories}`)
    console.log(`   数据完整性: ${allTools.length === totalToolsInCategories ? '✅ 正常' : '❌ 异常'}`)

    console.log('\n✅ 首页数据验证完成！')

  } catch (error) {
    console.error('❌ 验证过程中发生错误:', error)
  }
}

verifyHomepageData()