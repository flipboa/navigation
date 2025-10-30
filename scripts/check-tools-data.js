require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少Supabase配置');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkToolsData() {
  console.log('🔍 检查tools表数据...\n');
  
  try {
    // 1. 检查所有工具数据
    console.log('1. 查询所有工具数据:');
    const { data: allTools, error: allError } = await supabase
      .from('tools')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (allError) {
      console.error('❌ 查询所有工具失败:', allError);
      return;
    }
    
    console.log(`   总数据条数: ${allTools?.length || 0}`);
    if (allTools && allTools.length > 0) {
      console.log('   工具列表:');
      allTools.forEach((tool, index) => {
        console.log(`   ${index + 1}. ${tool.name} (${tool.slug}) - 状态: ${tool.status}`);
      });
    }
    
    // 2. 检查已发布的工具
    console.log('\n2. 查询已发布的工具:');
    const { data: publishedTools, error: publishedError } = await supabase
      .from('tools')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false });
    
    if (publishedError) {
      console.error('❌ 查询已发布工具失败:', publishedError);
      return;
    }
    
    console.log(`   已发布工具数量: ${publishedTools?.length || 0}`);
    if (publishedTools && publishedTools.length > 0) {
      console.log('   已发布工具列表:');
      publishedTools.forEach((tool, index) => {
        console.log(`   ${index + 1}. ${tool.name} (${tool.slug}) - 分类ID: ${tool.category_id}`);
      });
    }
    
    // 3. 检查工具状态分布
    console.log('\n3. 工具状态分布:');
    const statusCounts = {};
    if (allTools) {
      allTools.forEach(tool => {
        statusCounts[tool.status] = (statusCounts[tool.status] || 0) + 1;
      });
    }
    
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} 个`);
    });
    
    // 4. 检查分类关联
    console.log('\n4. 检查分类关联:');
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id, name, slug');
    
    if (catError) {
      console.error('❌ 查询分类失败:', catError);
    } else {
      console.log('   可用分类:');
      categories?.forEach(cat => {
        console.log(`   - ${cat.name} (${cat.slug}) - ID: ${cat.id}`);
      });
      
      // 检查工具的分类ID是否有效
      if (allTools && categories) {
        const categoryIds = new Set(categories.map(c => c.id));
        const invalidCategoryTools = allTools.filter(tool => !categoryIds.has(tool.category_id));
        
        if (invalidCategoryTools.length > 0) {
          console.log('\n   ⚠️ 发现无效分类ID的工具:');
          invalidCategoryTools.forEach(tool => {
            console.log(`   - ${tool.name}: 分类ID ${tool.category_id} 不存在`);
          });
        } else {
          console.log('\n   ✅ 所有工具的分类ID都有效');
        }
      }
    }
    
    // 5. 测试前端常用的查询
    console.log('\n5. 测试前端常用查询:');
    const { data: frontendTools, error: frontendError } = await supabase
      .from('tools')
      .select(`
        *,
        categories (
          id,
          name,
          slug,
          icon
        )
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false });
    
    if (frontendError) {
      console.error('❌ 前端查询失败:', frontendError);
    } else {
      console.log(`   前端查询结果数量: ${frontendTools?.length || 0}`);
      if (frontendTools && frontendTools.length > 0) {
        console.log('   前端查询结果:');
        frontendTools.forEach((tool, index) => {
          console.log(`   ${index + 1}. ${tool.name} - 分类: ${tool.categories?.name || '未知'}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error);
  }
}

checkToolsData();