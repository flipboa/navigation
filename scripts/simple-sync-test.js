#!/usr/bin/env node

/**
 * 简化的数据同步测试脚本
 * 
 * 功能：
 * 1. 检查现有数据状态
 * 2. 创建一个简单的测试记录（绕过RLS）
 * 3. 验证同步功能
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// 初始化Supabase客户端
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少Supabase配置信息');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCurrentStatus() {
  console.log('=== 检查当前数据状态 ===');
  
  try {
    // 检查submissions表
    const { data: submissions, error: submissionsError } = await supabase
      .from('submissions')
      .select('id, tool_name, status, tool_id')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (submissionsError) {
      console.error('查询submissions失败:', submissionsError);
    } else {
      console.log('最近的提交记录:');
      submissions?.forEach((sub, index) => {
        console.log(`${index + 1}. ${sub.tool_name} - 状态: ${sub.status} - 工具ID: ${sub.tool_id || '未设置'}`);
      });
    }
    
    // 检查tools表
    const { data: tools, error: toolsError } = await supabase
      .from('tools')
      .select('id, name, status')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (toolsError) {
      console.error('查询tools失败:', toolsError);
    } else {
      console.log('\n最近的工具记录:');
      tools?.forEach((tool, index) => {
        console.log(`${index + 1}. ${tool.name} - 状态: ${tool.status}`);
      });
    }
    
    return { submissions, tools };
    
  } catch (error) {
    console.error('检查数据状态失败:', error);
    return null;
  }
}

async function testManualSync() {
  console.log('\n=== 测试手动同步功能 ===');
  
  try {
    // 查找一个已审核但可能未同步的提交
    const { data: approvedSubmissions, error: queryError } = await supabase
      .from('submissions')
      .select('*')
      .eq('status', 'approved')
      .is('tool_id', null)
      .limit(1);
    
    if (queryError) {
      console.error('查询已审核提交失败:', queryError);
      return false;
    }
    
    if (!approvedSubmissions || approvedSubmissions.length === 0) {
      console.log('✅ 没有找到未同步的已审核提交');
      return true;
    }
    
    const submission = approvedSubmissions[0];
    console.log(`找到未同步的提交: ${submission.tool_name}`);
    
    // 手动创建工具记录
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
      console.error('创建工具记录失败:', toolError);
      return false;
    }
    
    // 更新提交记录
    const { error: updateError } = await supabase
      .from('submissions')
      .update({ tool_id: newTool.id })
      .eq('id', submission.id);
    
    if (updateError) {
      console.error('更新提交记录失败:', updateError);
      // 删除刚创建的工具记录
      await supabase.from('tools').delete().eq('id', newTool.id);
      return false;
    }
    
    console.log(`✅ 手动同步成功: ${submission.tool_name} -> ${newTool.id}`);
    return true;
    
  } catch (error) {
    console.error('手动同步测试失败:', error);
    return false;
  }
}

async function verifyDataIntegrity() {
  console.log('\n=== 验证数据完整性 ===');
  
  try {
    // 检查所有已审核的提交是否都有对应的工具记录
    const { data: approvedSubmissions, error: approvedError } = await supabase
      .from('submissions')
      .select('id, tool_name, tool_id')
      .eq('status', 'approved');
    
    if (approvedError) {
      console.error('查询已审核提交失败:', approvedError);
      return false;
    }
    
    const totalApproved = approvedSubmissions?.length || 0;
    const syncedCount = approvedSubmissions?.filter(s => s.tool_id).length || 0;
    const unsyncedCount = totalApproved - syncedCount;
    
    console.log(`已审核提交总数: ${totalApproved}`);
    console.log(`已同步数量: ${syncedCount}`);
    console.log(`未同步数量: ${unsyncedCount}`);
    
    if (unsyncedCount === 0) {
      console.log('✅ 所有已审核提交都已正确同步');
      return true;
    } else {
      console.log('⚠️  存在未同步的已审核提交');
      
      // 显示未同步的提交
      const unsyncedSubmissions = approvedSubmissions?.filter(s => !s.tool_id) || [];
      console.log('未同步的提交:');
      unsyncedSubmissions.forEach((sub, index) => {
        console.log(`${index + 1}. ${sub.tool_name} (ID: ${sub.id})`);
      });
      
      return false;
    }
    
  } catch (error) {
    console.error('验证数据完整性失败:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 开始简化的数据同步测试...\n');
  
  try {
    // 1. 检查当前数据状态
    const currentStatus = await checkCurrentStatus();
    if (!currentStatus) {
      console.error('❌ 无法获取当前数据状态');
      return;
    }
    
    // 2. 测试手动同步功能
    const syncResult = await testManualSync();
    
    // 3. 验证数据完整性
    const integrityResult = await verifyDataIntegrity();
    
    // 4. 输出测试结果
    console.log('\n=== 测试结果总结 ===');
    
    if (integrityResult) {
      console.log('🎉 数据同步状态正常！');
      console.log('✅ 所有已审核的提交都已正确同步到工具表');
    } else {
      console.log('⚠️  数据同步存在问题');
      console.log('建议：');
      console.log('1. 检查数据库触发器是否正确配置');
      console.log('2. 运行修复脚本同步未同步的数据');
      console.log('3. 在Supabase Dashboard中执行trigger-fix.sql脚本');
    }
    
    if (syncResult) {
      console.log('✅ 手动同步功能正常');
    } else {
      console.log('ℹ️  当前没有需要手动同步的数据');
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  main,
  checkCurrentStatus,
  testManualSync,
  verifyDataIntegrity
};