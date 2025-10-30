const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 登录调试测试');
console.log('================');

async function testLogin() {
  try {
    // 检查环境变量
    console.log('1. 检查环境变量:');
    console.log('   Supabase URL:', supabaseUrl ? '✅ 已配置' : '❌ 未配置');
    console.log('   Supabase Key:', supabaseKey ? '✅ 已配置' : '❌ 未配置');
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('❌ 环境变量配置不完整，请检查 .env.local 文件');
      return;
    }

    // 创建 Supabase 客户端
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('\n2. Supabase 客户端创建: ✅');

    // 测试数据库连接
    console.log('\n3. 测试数据库连接:');
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.log('   ❌ 数据库连接失败:', testError.message);
    } else {
      console.log('   ✅ 数据库连接正常');
    }

    // 检查用户表
    console.log('\n4. 检查用户数据:');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('email, nickname, created_at')
      .limit(5);
    
    if (profilesError) {
      console.log('   ❌ 无法查询用户数据:', profilesError.message);
    } else {
      console.log(`   ✅ 找到 ${profiles.length} 个用户档案`);
      if (profiles.length > 0) {
        console.log('   用户列表:');
        profiles.forEach((profile, index) => {
          console.log(`     ${index + 1}. 邮箱: ${profile.email}, 昵称: ${profile.nickname}`);
        });
      }
    }

    // 测试登录功能（使用测试邮箱）
    console.log('\n5. 测试登录功能:');
    
    // 如果有用户数据，尝试登录第一个用户
    if (profiles && profiles.length > 0) {
      const testEmail = profiles[0].email;
      console.log(`   尝试使用邮箱登录: ${testEmail}`);
      
      // 注意：这里不能测试真实密码，只能测试错误的密码来验证认证流程
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: 'wrong_password_for_testing'
      });
      
      if (loginError) {
        if (loginError.message.includes('Invalid login credentials')) {
          console.log('   ✅ 认证流程正常（密码验证工作正常）');
        } else {
          console.log('   ❌ 认证错误:', loginError.message);
        }
      } else {
        console.log('   ⚠️  意外登录成功（可能是测试密码问题）');
      }
    } else {
      console.log('   ⚠️  没有找到用户数据，无法测试登录');
    }

    // 检查认证配置
    console.log('\n6. 检查认证配置:');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.log('   ❌ 获取会话失败:', authError.message);
    } else {
      console.log('   ✅ 认证服务正常');
      console.log('   当前会话:', authData.session ? '已登录' : '未登录');
    }

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

// 运行测试
testLogin().then(() => {
  console.log('\n🏁 登录调试测试完成');
  console.log('\n💡 如果发现问题，请检查:');
  console.log('   1. .env.local 文件中的 Supabase 配置');
  console.log('   2. Supabase 项目的认证设置');
  console.log('   3. 数据库中是否有用户数据');
  console.log('   4. 用户的密码是否正确');
});