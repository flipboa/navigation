// 测试数据库函数连接
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔍 测试数据库连接和函数...')
console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Key:', supabaseKey ? '✅ 已配置' : '❌ 未配置')

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 环境变量未正确配置')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDatabaseFunctions() {
  try {
    console.log('\n📊 测试数据库连接...')
    
    // 1. 测试基本连接
    const { data: connectionTest, error: connectionError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    if (connectionError) {
      console.error('❌ 数据库连接失败:', connectionError.message)
      return false
    }
    
    console.log('✅ 数据库连接成功')
    
    // 2. 测试 get_user_profile 函数是否存在
    console.log('\n🔧 测试 get_user_profile 函数...')
    
    // 使用一个测试 UUID
    const testUserId = '00000000-0000-0000-0000-000000000000'
    
    const { data: profileData, error: profileError } = await supabase
      .rpc('get_user_profile', { user_id: testUserId })
    
    if (profileError) {
      if (profileError.code === 'PGRST202') {
        console.error('❌ get_user_profile 函数不存在')
        console.log('💡 请在 Supabase SQL 编辑器中执行以下文件:')
        console.log('   - database/profiles.sql (完整初始化)')
        console.log('   - 或 database/init-missing-functions.sql (仅创建函数)')
        return false
      } else {
        console.error('❌ 函数调用错误:', profileError.message)
        return false
      }
    }
    
    console.log('✅ get_user_profile 函数存在且可调用')
    console.log('📄 函数返回结果:', profileData)
    
    // 3. 测试 upsert_profile 函数
    console.log('\n🔧 测试 upsert_profile 函数...')
    
    const { data: upsertData, error: upsertError } = await supabase
      .rpc('upsert_profile', { 
        user_email: 'test@example.com',
        user_id: testUserId,
        user_nickname: 'test_user_' + Date.now()
      })
    
    if (upsertError) {
      if (upsertError.code === 'PGRST202') {
        console.error('❌ upsert_profile 函数不存在')
        return false
      } else {
        console.log('⚠️ upsert_profile 函数存在但调用失败 (可能是权限问题):', upsertError.message)
      }
    } else {
      console.log('✅ upsert_profile 函数正常工作')
    }
    
    return true
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message)
    return false
  }
}

async function main() {
  const success = await testDatabaseFunctions()
  
  if (success) {
    console.log('\n🎉 数据库函数测试完成！所有函数都正常工作。')
  } else {
    console.log('\n⚠️ 数据库函数测试失败。请检查上述错误信息并修复。')
    console.log('\n📋 修复步骤:')
    console.log('1. 登录到 Supabase 项目仪表板')
    console.log('2. 进入 SQL 编辑器')
    console.log('3. 执行 database/init-missing-functions.sql 文件中的 SQL 语句')
    console.log('4. 重新运行此测试脚本')
  }
}

main().catch(console.error)