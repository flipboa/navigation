require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 配置')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixCategoryMapping() {
  console.log('🔧 修复分类映射问题...\n')

  try {
    // 1. 获取所有分类（包括ID和slug）
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, slug, name, icon, is_active, show_on_homepage')
      .order('sort_order', { ascending: true })

    if (categoriesError) {
      console.error('❌ 获取分类数据失败:', categoriesError)
      return
    }

    console.log('1. 所有分类数据:')
    categories.forEach(cat => {
      console.log(`   - ${cat.name} (ID: ${cat.id}, slug: ${cat.slug}, 激活: ${cat.is_active}, 首页显示: ${cat.show_on_homepage})`)
    })

    // 2. 获取所有工具及其分类ID
    const { data: tools, error: toolsError } = await supabase
      .from('tools')
      .select('id, name, slug, category_id, status')
      .eq('status', 'published')

    if (toolsError) {
      console.error('❌ 获取工具数据失败:', toolsError)
      return
    }

    console.log('\n2. 所有工具数据:')
    tools.forEach(tool => {
      const category = categories.find(cat => cat.id === tool.category_id)
      console.log(`   - ${tool.name} (category_id: ${tool.category_id}) -> ${category ? category.name + ' (' + category.slug + ')' : '未找到分类'}`)
    })

    // 3. 创建分类ID到slug的映射
    const categoryIdToSlug = {}
    categories.forEach(cat => {
      categoryIdToSlug[cat.id] = cat.slug
    })

    console.log('\n3. 分类ID到slug映射:')
    Object.entries(categoryIdToSlug).forEach(([id, slug]) => {
      const category = categories.find(cat => cat.id === id)
      console.log(`   ${id} -> ${slug} (${category?.name})`)
    })

    // 4. 按分类组织工具（使用正确的映射）
    const toolsByCategory = {}
    categories.forEach(cat => {
      if (cat.is_active && cat.show_on_homepage) {
        toolsByCategory[cat.slug] = []
      }
    })

    tools.forEach(tool => {
      const categorySlug = categoryIdToSlug[tool.category_id]
      if (categorySlug && toolsByCategory[categorySlug]) {
        toolsByCategory[categorySlug].push(tool)
      } else {
        console.log(`   ⚠️  工具 "${tool.name}" 的分类ID "${tool.category_id}" 无法映射到有效的分类slug`)
      }
    })

    console.log('\n4. 修复后的分类工具分布:')
    Object.entries(toolsByCategory).forEach(([categorySlug, categoryTools]) => {
      const category = categories.find(cat => cat.slug === categorySlug)
      console.log(`   ${category?.name || categorySlug}: ${categoryTools.length} 个工具`)
      categoryTools.forEach(tool => {
        console.log(`     - ${tool.name}`)
      })
    })

    // 5. 验证数据完整性
    console.log('\n5. 数据完整性验证:')
    const totalToolsInCategories = Object.values(toolsByCategory).reduce((sum, tools) => sum + tools.length, 0)
    console.log(`   总工具数: ${tools.length}`)
    console.log(`   分类中的工具总数: ${totalToolsInCategories}`)
    console.log(`   数据完整性: ${tools.length === totalToolsInCategories ? '✅ 正常' : '❌ 异常'}`)

    console.log('\n✅ 分类映射修复完成！')

  } catch (error) {
    console.error('❌ 修复过程中发生错误:', error)
  }
}

fixCategoryMapping()