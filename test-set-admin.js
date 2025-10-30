// 设置管理员用户测试脚本
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 从环境变量获取 Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 环境变量');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setAdminUser() {
  try {
    console.log('🔄 开始设置管理员用户...');
    
    // 1. 检查用户是否存在
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'flipboa@163.com')
      .single();
    
    if (checkError) {
      console.error('❌ 检查用户时出错:', checkError.message);
      return;
    }
    
    if (!existingUser) {
      console.error('❌ 用户 flipboa@163.com 不存在');
      return;
    }
    
    console.log('✅ 找到用户:', existingUser);
    
    // 2. 更新用户角色为管理员
    const { data: updatedUser, error: updateError } = await supabase
      .from('profiles')
      .update({ 
        role: 'admin',
        updated_at: new Date().toISOString()
      })
      .eq('email', 'flipboa@163.com')
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ 更新用户角色时出错:', updateError.message);
      return;
    }
    
    console.log('✅ 成功设置管理员用户:', updatedUser);
    
    // 3. 验证更新结果
    const { data: verifyUser, error: verifyError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'flipboa@163.com')
      .single();
    
    if (verifyError) {
      console.error('❌ 验证更新结果时出错:', verifyError.message);
      return;
    }
    
    console.log('🎉 验证成功 - 用户角色已更新为:', verifyUser.role);
    
  } catch (error) {
    console.error('❌ 设置管理员用户时发生错误:', error);
  }
}

// 执行设置
setAdminUser();