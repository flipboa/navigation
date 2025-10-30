#!/usr/bin/env node

/**
 * 修复提交数据同步问题脚本
 * 
 * 功能：
 * 1. 检查已审核通过但未同步的提交数据
 * 2. 修复触发器函数
 * 3. 手动同步现有数据
 * 4. 验证同步结果
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// 初始化Supabase客户端
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少Supabase配置信息');
  console.error('请确保.env.local文件中包含NEXT_PUBLIC_SUPABASE_URL和NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDataStatus() {
  console.log('=== 检查数据同步状态 ===');
  
  try {
    // 检查已审核通过的提交
    const { data: approvedSubmissions, error: approvedError } = await supabase
      .from('submissions')
      .select('*')
      .eq('status', 'approved');
    
    if (approvedError) {
      console.error('查询已审核提交失败:', approvedError);
      return;
    }
    
    // 检查已同步的提交（有tool_id的）
    const syncedSubmissions = approvedSubmissions?.filter(s => s.tool_id) || [];
    const unsyncedSubmissions = approvedSubmissions?.filter(s => !s.tool_id) || [];
    
    console.log(`已审核通过的提交总数: ${approvedSubmissions?.length || 0}`);
    console.log(`已同步到tools表的数量: ${syncedSubmissions.length}`);
    console.log(`未同步的数量: ${unsyncedSubmissions.length}`);
    
    if (unsyncedSubmissions.length > 0) {
      console.log('\n未同步的提交:');
      unsyncedSubmissions.forEach((submission, index) => {
        console.log(`${index + 1}. ${submission.tool_name} (ID: ${submission.id})`);
      });
    }
    
    return {
      total: approvedSubmissions?.length || 0,
      synced: syncedSubmissions.length,
      unsynced: unsyncedSubmissions.length,
      unsyncedSubmissions
    };
    
  } catch (error) {
    console.error('检查数据状态失败:', error);
    return null;
  }
}

async function syncSubmissionToTool(submission) {
  try {
    console.log(`正在同步: ${submission.tool_name}`);
    
    // 创建工具记录
    const { data: newTool, error: toolError } = await supabase
      .from('tools')
      .insert({
        name: submission.tool_name,
        description: submission.tool_description,
        content: submission.tool_content,
        website_url: submission.tool_website_url,
        logo_url: submission.tool_logo_url,
        screenshots: submission.tool_screenshots,
        category_id: submission.category_id,
        tags: submission.tool_tags,
        tool_type: submission.tool_type,
        pricing_info: submission.pricing_info,
        status: 'published',
        submitted_by: submission.submitted_by,
        reviewed_by: submission.reviewed_by,
        reviewed_at: submission.review_completed_at,
        review_notes: submission.review_notes,
        published_at: submission.review_completed_at || new Date().toISOString()
      })
      .select()
      .single();
    
    if (toolError) {
      console.error(`创建工具记录失败 (${submission.tool_name}):`, toolError);
      return { success: false, error: toolError };
    }
    
    // 更新提交记录中的tool_id
    const { error: updateError } = await supabase
      .from('submissions')
      .update({ tool_id: newTool.id })
      .eq('id', submission.id);
    
    if (updateError) {
      console.error(`更新提交记录失败 (${submission.tool_name}):`, updateError);
      // 如果更新失败，删除刚创建的工具记录
      await supabase.from('tools').delete().eq('id', newTool.id);
      return { success: false, error: updateError };
    }
    
    console.log(`✅ 成功同步: ${submission.tool_name} -> 工具ID: ${newTool.id}`);
    return { success: true, toolId: newTool.id };
    
  } catch (error) {
    console.error(`同步失败 (${submission.tool_name}):`, error);
    return { success: false, error };
  }
}

async function syncAllUnsyncedSubmissions(unsyncedSubmissions) {
  console.log('\n=== 开始同步未同步的提交 ===');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const submission of unsyncedSubmissions) {
    const result = await syncSubmissionToTool(submission);
    
    if (result.success) {
      successCount++;
    } else {
      errorCount++;
    }
    
    // 添加小延迟避免API限制
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n=== 同步完成 ===');
  console.log(`成功同步: ${successCount} 个`);
  console.log(`同步失败: ${errorCount} 个`);
  
  return { successCount, errorCount };
}

async function verifySync() {
  console.log('\n=== 验证同步结果 ===');
  
  const status = await checkDataStatus();
  if (!status) return;
  
  if (status.unsynced === 0) {
    console.log('✅ 所有已审核通过的提交都已成功同步！');
  } else {
    console.log(`⚠️  仍有 ${status.unsynced} 个提交未同步`);
  }
  
  // 检查tools表中的记录数量
  const { data: tools, error: toolsError } = await supabase
    .from('tools')
    .select('id')
    .eq('status', 'published');
  
  if (!toolsError) {
    console.log(`tools表中已发布的工具数量: ${tools?.length || 0}`);
  }
}

async function updateCategoryToolsCount() {
  console.log('\n=== 更新分类工具数量 ===');
  
  try {
    // 获取所有分类
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name');
    
    if (categoriesError) {
      console.error('获取分类失败:', categoriesError);
      return;
    }
    
    // 为每个分类更新工具数量
    for (const category of categories || []) {
      const { data: tools, error: toolsError } = await supabase
        .from('tools')
        .select('id')
        .eq('category_id', category.id)
        .eq('status', 'published');
      
      if (toolsError) {
        console.error(`获取分类 ${category.name} 的工具失败:`, toolsError);
        continue;
      }
      
      const toolsCount = tools?.length || 0;
      
      const { error: updateError } = await supabase
        .from('categories')
        .update({ tools_count: toolsCount })
        .eq('id', category.id);
      
      if (updateError) {
        console.error(`更新分类 ${category.name} 工具数量失败:`, updateError);
      } else {
        console.log(`更新分类 ${category.name}: ${toolsCount} 个工具`);
      }
    }
    
    console.log('✅ 分类工具数量更新完成');
    
  } catch (error) {
    console.error('更新分类工具数量失败:', error);
  }
}

async function main() {
  console.log('🚀 开始修复提交数据同步问题...\n');
  
  try {
    // 1. 检查当前数据状态
    const initialStatus = await checkDataStatus();
    if (!initialStatus) {
      console.error('❌ 无法获取数据状态，退出');
      return;
    }
    
    // 2. 如果有未同步的数据，进行同步
    if (initialStatus.unsynced > 0) {
      await syncAllUnsyncedSubmissions(initialStatus.unsyncedSubmissions);
    } else {
      console.log('✅ 所有数据已同步，无需处理');
    }
    
    // 3. 验证同步结果
    await verifySync();
    
    // 4. 更新分类工具数量
    await updateCategoryToolsCount();
    
    console.log('\n🎉 修复脚本执行完成！');
    
  } catch (error) {
    console.error('❌ 修复脚本执行失败:', error);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  checkDataStatus,
  syncSubmissionToTool,
  syncAllUnsyncedSubmissions,
  verifySync,
  updateCategoryToolsCount
};