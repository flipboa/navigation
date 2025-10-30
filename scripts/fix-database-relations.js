require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少Supabase配置');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDatabaseRelations() {
  console.log('🔧 修复数据库关系和数据同步问题...\n');
  
  try {
    // 1. 检查当前数据状态
    console.log('1. 检查当前数据状态:');
    
    const { data: tools, error: toolsError } = await supabase
      .from('tools')
      .select('*')
      .eq('status', 'published');
    
    if (toolsError) {
      console.error('❌ 查询工具失败:', toolsError);
      return;
    }
    
    console.log(`   已发布工具数量: ${tools?.length || 0}`);
    
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*');
    
    if (categoriesError) {
      console.error('❌ 查询分类失败:', categoriesError);
      return;
    }
    
    console.log(`   分类数量: ${categories?.length || 0}`);
    
    // 2. 测试前端查询（不使用外键关联）
    console.log('\n2. 测试前端查询（不使用外键关联）:');
    
    const { data: frontendData, error: frontendError } = await supabase
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
      .order('created_at', { ascending: false });
    
    if (frontendError) {
      console.error('❌ 前端查询失败:', frontendError);
      return;
    }
    
    console.log(`   前端查询成功，获取到 ${frontendData?.length || 0} 个工具`);
    
    // 3. 手动关联分类信息
    console.log('\n3. 手动关联分类信息:');
    
    if (frontendData && categories) {
      const categoryMap = new Map(categories.map(cat => [cat.id, cat]));
      
      const toolsWithCategories = frontendData.map(tool => ({
        ...tool,
        category_name: categoryMap.get(tool.category_id)?.name || '未知分类',
        category_slug: categoryMap.get(tool.category_id)?.slug || 'unknown',
        category_icon: categoryMap.get(tool.category_id)?.icon || null
      }));
      
      console.log('   工具和分类关联结果:');
      toolsWithCategories.forEach((tool, index) => {
        console.log(`   ${index + 1}. ${tool.name} - 分类: ${tool.category_name}`);
      });
      
      // 4. 按分类分组工具
      console.log('\n4. 按分类分组工具:');
      
      const toolsByCategory = {};
      categories.forEach(category => {
        toolsByCategory[category.id] = toolsWithCategories.filter(
          tool => tool.category_id === category.id
        );
      });
      
      console.log('   分类工具分布:');
      Object.entries(toolsByCategory).forEach(([categoryId, tools]) => {
        const category = categoryMap.get(categoryId);
        console.log(`   ${category?.name || '未知'}: ${tools.length} 个工具`);
        tools.forEach(tool => {
          console.log(`     - ${tool.name}`);
        });
      });
      
      // 5. 检查热门工具和新工具
      console.log('\n5. 检查热门工具和新工具:');
      
      const hotTools = toolsWithCategories.filter(tool => tool.is_hot);
      const newTools = toolsWithCategories.filter(tool => tool.is_new);
      
      console.log(`   热门工具数量: ${hotTools.length}`);
      hotTools.forEach(tool => {
        console.log(`     - ${tool.name} (${tool.category_name})`);
      });
      
      console.log(`   新工具数量: ${newTools.length}`);
      newTools.forEach(tool => {
        console.log(`     - ${tool.name} (${tool.category_name})`);
      });
      
      // 6. 生成前端数据格式
      console.log('\n6. 生成前端数据格式:');
      
      const frontendHotTools = hotTools.map(tool => ({
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
      }));
      
      const frontendNewTools = newTools.map(tool => ({
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
      }));
      
      const frontendToolsByCategory = {};
      Object.entries(toolsByCategory).forEach(([categoryId, tools]) => {
        frontendToolsByCategory[categoryId] = tools.map(tool => ({
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
        }));
      });
      
      console.log('   前端数据格式生成完成:');
      console.log(`     - 热门工具: ${frontendHotTools.length} 个`);
      console.log(`     - 新工具: ${frontendNewTools.length} 个`);
      console.log(`     - 分类工具: ${Object.keys(frontendToolsByCategory).length} 个分类`);
      
      // 7. 验证数据完整性
      console.log('\n7. 验证数据完整性:');
      
      const totalToolsInCategories = Object.values(frontendToolsByCategory)
        .reduce((sum, tools) => sum + tools.length, 0);
      
      console.log(`   总工具数: ${frontendData.length}`);
      console.log(`   分类中的工具总数: ${totalToolsInCategories}`);
      console.log(`   数据完整性: ${frontendData.length === totalToolsInCategories ? '✅ 正常' : '❌ 异常'}`);
    }
    
  } catch (error) {
    console.error('❌ 修复过程中发生错误:', error);
  }
}

fixDatabaseRelations();