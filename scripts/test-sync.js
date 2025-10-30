#!/usr/bin/env node

/**
 * 测试数据同步功能脚本
 * 
 * 功能：
 * 1. 创建测试提交
 * 2. 模拟审核通过
 * 3. 验证数据是否正确同步到tools表
 * 4. 清理测试数据
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

async function createTestSubmission() {
  console.log('=== 创建测试提交 ===');
  
  try {
    // 获取一个分类ID
    const { data: categories, error: categoryError } = await supabase
      .from('categories')
      .select('id, name')
      .limit(1);
    
    if (categoryError || !categories || categories.length === 0) {
      console.error('无法获取分类信息:', categoryError);
      return null;
    }
    
    const category = categories[0];
    console.log(`使用分类: ${category.name} (${category.id})`);
    
    // 创建测试提交（使用系统用户ID或跳过RLS）
    const testSubmission = {
      tool_name: `测试工具-${Date.now()}`,
      tool_description: '这是一个用于测试数据同步功能的工具',
      tool_content: '详细的工具介绍内容...',
      tool_website_url: 'https://test-sync.example.com',
      tool_logo_url: 'https://test-sync.example.com/logo.png',
      category_id: category.id,
      tool_tags: ['测试', '同步'],
      tool_type: 'free',
      pricing_info: { type: 'free' },
      status: 'submitted',
      submitted_by: '00000000-0000-0000-0000-000000000000', // 使用系统用户ID
      submitted_at: new Date().toISOString()
    };
    
    const { data: submission, error: submitError } = await supabase
      .from('submissions')
      .insert(testSubmission)
      .select()
      .single();
    
    if (submitError) {
      console.error('创建测试提交失败:', submitError);
      return null;
    }
    
    console.log(`✅ 创建测试提交成功: ${submission.tool_name} (ID: ${submission.id})`);
    return submission;
    
  } catch (error) {
    console.error('创建测试提交失败:', error);
    return null;
  }
}

async function approveSubmission(submissionId) {
  console.log('\n=== 模拟审核通过 ===');
  
  try {
    const { data: updatedSubmission, error: updateError } = await supabase
      .from('submissions')
      .update({
        status: 'approved',
        review_notes: '测试数据同步功能 - 自动审核通过',
        review_completed_at: new Date().toISOString()
      })
      .eq('id', submissionId)
      .select()
      .single();
    
    if (updateError) {
      console.error('审核提交失败:', updateError);
      return null;
    }
    
    console.log(`✅ 提交已审核通过: ${updatedSubmission.id}`);
    console.log(`工具ID: ${updatedSubmission.tool_id || '未生成'}`);
    
    return updatedSubmission;
    
  } catch (error) {
    console.error('审核提交失败:', error);
    return null;
  }
}

async function verifyToolCreation(submission) {
  console.log('\n=== 验证工具记录创建 ===');
  
  try {
    if (submission.tool_id) {
      // 检查工具记录是否存在
      const { data: tool, error: toolError } = await supabase
        .from('tools')
        .select('*')
        .eq('id', submission.tool_id)
        .single();
      
      if (toolError) {
        console.error('查询工具记录失败:', toolError);
        return false;
      }
      
      if (tool) {
        console.log('✅ 工具记录创建成功:');
        console.log(`  - 名称: ${tool.name}`);
        console.log(`  - 描述: ${tool.description}`);
        console.log(`  - 网站: ${tool.website_url}`);
        console.log(`  - 状态: ${tool.status}`);
        console.log(`  - 发布时间: ${tool.published_at}`);
        return true;
      } else {
        console.log('❌ 工具记录不存在');
        return false;
      }
    } else {
      console.log('❌ 提交记录中没有tool_id，同步失败');
      return false;
    }
    
  } catch (error) {
    console.error('验证工具记录失败:', error);
    return false;
  }
}

async function cleanupTestData(submission) {
  console.log('\n=== 清理测试数据 ===');
  
  try {
    // 删除工具记录（如果存在）
    if (submission.tool_id) {
      const { error: toolDeleteError } = await supabase
        .from('tools')
        .delete()
        .eq('id', submission.tool_id);
      
      if (toolDeleteError) {
        console.error('删除工具记录失败:', toolDeleteError);
      } else {
        console.log('✅ 工具记录已删除');
      }
    }
    
    // 删除提交记录
    const { error: submissionDeleteError } = await supabase
      .from('submissions')
      .delete()
      .eq('id', submission.id);
    
    if (submissionDeleteError) {
      console.error('删除提交记录失败:', submissionDeleteError);
    } else {
      console.log('✅ 提交记录已删除');
    }
    
    console.log('✅ 测试数据清理完成');
    
  } catch (error) {
    console.error('清理测试数据失败:', error);
  }
}

async function main() {
  console.log('🚀 开始测试数据同步功能...\n');
  
  let submission = null;
  
  try {
    // 1. 创建测试提交
    submission = await createTestSubmission();
    if (!submission) {
      console.error('❌ 无法创建测试提交，退出测试');
      return;
    }
    
    // 2. 模拟审核通过
    const approvedSubmission = await approveSubmission(submission.id);
    if (!approvedSubmission) {
      console.error('❌ 无法审核提交，退出测试');
      return;
    }
    
    // 等待一下，确保触发器有时间执行
    console.log('等待触发器执行...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 重新查询提交记录，获取最新的tool_id
    const { data: latestSubmission, error: queryError } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', submission.id)
      .single();
    
    if (queryError) {
      console.error('查询最新提交记录失败:', queryError);
      return;
    }
    
    // 3. 验证工具记录创建
    const syncSuccess = await verifyToolCreation(latestSubmission);
    
    // 4. 清理测试数据
    await cleanupTestData(latestSubmission);
    
    // 5. 输出测试结果
    console.log('\n=== 测试结果 ===');
    if (syncSuccess) {
      console.log('🎉 数据同步功能正常！');
      console.log('✅ 提交审核通过后，工具记录自动创建成功');
    } else {
      console.log('❌ 数据同步功能异常！');
      console.log('⚠️  提交审核通过后，工具记录未自动创建');
      console.log('请检查数据库触发器是否正确配置');
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
    
    // 确保清理测试数据
    if (submission) {
      await cleanupTestData(submission);
    }
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  main,
  createTestSubmission,
  approveSubmission,
  verifyToolCreation,
  cleanupTestData
};