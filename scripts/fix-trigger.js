#!/usr/bin/env node

/**
 * 修复数据库触发器脚本
 * 
 * 功能：
 * 1. 重新创建handle_approved_submission触发器函数
 * 2. 确保触发器正确绑定到submissions表
 * 3. 测试触发器功能
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

// 修复后的触发器函数SQL
const triggerFunctionSQL = `
CREATE OR REPLACE FUNCTION handle_approved_submission()
RETURNS TRIGGER AS $$
DECLARE
    new_tool_id UUID;
BEGIN
    -- 只有当状态变为approved且之前不是approved时才执行
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        -- 检查是否已经有关联的工具ID
        IF NEW.tool_id IS NULL THEN
            -- 创建新的工具记录
            INSERT INTO tools (
                name,
                slug,
                description,
                content,
                website_url,
                logo_url,
                screenshots,
                category_id,
                tags,
                tool_type,
                pricing_info,
                status,
                submitted_by,
                reviewed_by,
                reviewed_at,
                review_notes,
                published_at
            ) VALUES (
                NEW.tool_name,
                NULL, -- slug会由触发器自动生成
                NEW.tool_description,
                NEW.tool_content,
                NEW.tool_website_url,
                NEW.tool_logo_url,
                NEW.tool_screenshots,
                NEW.category_id,
                NEW.tool_tags,
                NEW.tool_type,
                NEW.pricing_info,
                'published',
                NEW.submitted_by,
                NEW.reviewed_by,
                NOW(),
                NEW.review_notes,
                NOW()
            ) RETURNING id INTO new_tool_id;
            
            -- 更新提交记录中的tool_id
            NEW.tool_id = new_tool_id;
            
            -- 更新分类的工具数量（如果categories表有tools_count字段）
            UPDATE categories 
            SET tools_count = COALESCE(tools_count, 0) + 1 
            WHERE id = NEW.category_id;
            
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';
`;

const triggerSQL = `
-- 删除现有触发器（如果存在）
DROP TRIGGER IF EXISTS handle_submission_approval ON submissions;

-- 创建新触发器
CREATE TRIGGER handle_submission_approval 
  BEFORE UPDATE ON submissions
  FOR EACH ROW 
  EXECUTE FUNCTION handle_approved_submission();
`;

async function executeSQLCommand(sql, description) {
  try {
    console.log(`执行: ${description}`);
    
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error(`❌ ${description}失败:`, error);
      return false;
    }
    
    console.log(`✅ ${description}成功`);
    return true;
    
  } catch (error) {
    console.error(`❌ ${description}失败:`, error);
    return false;
  }
}

async function createExecSQLFunction() {
  // 首先尝试创建一个执行SQL的函数（如果不存在）
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
    RETURNS text
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
        EXECUTE sql_query;
        RETURN 'SUCCESS';
    EXCEPTION WHEN OTHERS THEN
        RETURN 'ERROR: ' || SQLERRM;
    END;
    $$;
  `;
  
  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: createFunctionSQL });
    if (error) {
      console.log('注意: 无法创建exec_sql函数，将使用替代方法');
      return false;
    }
    return true;
  } catch (error) {
    console.log('注意: 无法创建exec_sql函数，将使用替代方法');
    return false;
  }
}

async function fixTriggerDirectly() {
  console.log('=== 使用直接方法修复触发器 ===');
  
  // 由于Supabase的安全限制，我们需要通过API来创建一个修复脚本
  // 这里我们创建一个包含修复SQL的文件，用户可以在Supabase Dashboard中执行
  
  const fixSQL = `
-- =====================================================
-- 触发器修复SQL脚本
-- 请在Supabase Dashboard的SQL编辑器中执行此脚本
-- =====================================================

${triggerFunctionSQL}

${triggerSQL}

-- 验证触发器是否创建成功
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'handle_submission_approval' 
AND event_object_table = 'submissions';
`;

  console.log('创建触发器修复SQL文件...');
  
  // 将SQL保存到文件
  const fs = require('fs');
  const path = require('path');
  
  const sqlFilePath = path.join(__dirname, '..', 'database', 'trigger-fix.sql');
  fs.writeFileSync(sqlFilePath, fixSQL);
  
  console.log(`✅ 触发器修复SQL已保存到: ${sqlFilePath}`);
  console.log('\n请按以下步骤操作:');
  console.log('1. 打开Supabase Dashboard');
  console.log('2. 进入SQL编辑器');
  console.log('3. 复制并执行上述SQL脚本');
  console.log('4. 验证触发器是否创建成功');
  
  return true;
}

async function testTrigger() {
  console.log('\n=== 测试触发器功能 ===');
  
  try {
    // 获取一个分类ID用于测试
    const { data: categories, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .limit(1);
    
    if (categoryError || !categories || categories.length === 0) {
      console.error('无法获取分类信息，跳过触发器测试');
      return false;
    }
    
    const categoryId = categories[0].id;
    
    // 创建测试提交
    const testSubmission = {
      tool_name: '测试工具-触发器验证',
      tool_description: '这是一个用于验证触发器功能的测试工具',
      tool_website_url: 'https://test-trigger.example.com',
      category_id: categoryId,
      status: 'submitted',
      submitted_at: new Date().toISOString()
    };
    
    const { data: submission, error: submitError } = await supabase
      .from('submissions')
      .insert(testSubmission)
      .select()
      .single();
    
    if (submitError) {
      console.error('创建测试提交失败:', submitError);
      return false;
    }
    
    console.log(`创建测试提交: ${submission.id}`);
    
    // 模拟审核通过
    const { data: updatedSubmission, error: updateError } = await supabase
      .from('submissions')
      .update({
        status: 'approved',
        review_notes: '测试触发器功能',
        review_completed_at: new Date().toISOString()
      })
      .eq('id', submission.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('更新提交状态失败:', updateError);
      // 清理测试数据
      await supabase.from('submissions').delete().eq('id', submission.id);
      return false;
    }
    
    // 检查是否自动创建了工具记录
    if (updatedSubmission.tool_id) {
      console.log('✅ 触发器测试成功！自动创建了工具记录:', updatedSubmission.tool_id);
      
      // 清理测试数据
      await supabase.from('tools').delete().eq('id', updatedSubmission.tool_id);
      await supabase.from('submissions').delete().eq('id', submission.id);
      
      console.log('测试数据已清理');
      return true;
    } else {
      console.log('❌ 触发器测试失败！未自动创建工具记录');
      
      // 清理测试数据
      await supabase.from('submissions').delete().eq('id', submission.id);
      return false;
    }
    
  } catch (error) {
    console.error('触发器测试失败:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 开始修复数据库触发器...\n');
  
  try {
    // 1. 尝试创建exec_sql函数
    const canExecSQL = await createExecSQLFunction();
    
    if (canExecSQL) {
      // 2. 修复触发器函数
      const functionFixed = await executeSQLCommand(triggerFunctionSQL, '创建/更新触发器函数');
      
      // 3. 重新创建触发器
      const triggerFixed = await executeSQLCommand(triggerSQL, '创建触发器');
      
      if (functionFixed && triggerFixed) {
        console.log('\n✅ 触发器修复完成');
        
        // 4. 测试触发器
        const testResult = await testTrigger();
        
        if (testResult) {
          console.log('\n🎉 触发器功能正常！');
        } else {
          console.log('\n⚠️  触发器可能存在问题，请检查');
        }
      } else {
        console.log('\n❌ 触发器修复失败');
      }
    } else {
      // 使用替代方法
      await fixTriggerDirectly();
    }
    
  } catch (error) {
    console.error('❌ 触发器修复失败:', error);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  main,
  testTrigger
};