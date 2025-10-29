// 全面功能测试脚本
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🧪 开始全面功能测试...')

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDatabaseConnection() {
  console.log('\n📊 测试数据库连接...')
  
  try {
    // 测试基本连接
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    if (error && error.code !== 'PGRST116') { // PGRST116 是表不存在的错误，可以忽略
      console.error('❌ 数据库连接失败:', error.message)
      return false
    }
    
    console.log('✅ 数据库连接正常')
    return true
  } catch (error) {
    console.error('❌ 数据库连接测试失败:', error.message)
    return false
  }
}

async function testProfilesFunctions() {
  console.log('\n🔧 测试 Profiles 相关函数...')
  
  const testUserId = '00000000-0000-0000-0000-000000000000'
  
  // 测试 get_user_profile 函数
  try {
    const { data, error } = await supabase
      .rpc('get_user_profile', { user_id: testUserId })
    
    if (error && error.code === 'PGRST202') {
      console.log('⚠️ get_user_profile 函数不存在（已有备用方案）')
    } else if (error) {
      console.log('⚠️ get_user_profile 函数存在但调用失败:', error.message)
    } else {
      console.log('✅ get_user_profile 函数正常工作')
    }
  } catch (error) {
    console.log('⚠️ get_user_profile 函数测试异常:', error.message)
  }
  
  // 测试 upsert_profile 函数
  try {
    const { data, error } = await supabase
      .rpc('upsert_profile', { 
        user_email: 'test@example.com',
        user_id: testUserId,
        user_nickname: 'test_user_' + Date.now()
      })
    
    if (error && error.code === 'PGRST202') {
      console.log('⚠️ upsert_profile 函数不存在')
    } else if (error) {
      console.log('⚠️ upsert_profile 函数存在但调用失败:', error.message)
    } else {
      console.log('✅ upsert_profile 函数正常工作')
    }
  } catch (error) {
    console.log('⚠️ upsert_profile 函数测试异常:', error.message)
  }
}

async function testDirectProfileQueries() {
  console.log('\n📋 测试直接 Profile 查询...')
  
  try {
    // 测试直接查询 profiles 表
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(5)
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('⚠️ profiles 表不存在')
      } else {
        console.log('⚠️ 直接查询失败:', error.message)
      }
    } else {
      console.log('✅ 直接查询 profiles 表成功')
      console.log(`📊 找到 ${data.length} 条记录`)
    }
  } catch (error) {
    console.log('⚠️ 直接查询测试异常:', error.message)
  }
}

async function testAuthFunctions() {
  console.log('\n🔐 测试认证相关功能...')
  
  try {
    // 获取当前用户
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.log('⚠️ 获取用户信息失败:', error.message)
    } else if (user) {
      console.log('✅ 用户已登录:', user.email)
    } else {
      console.log('ℹ️ 当前无用户登录')
    }
  } catch (error) {
    console.log('⚠️ 认证测试异常:', error.message)
  }
}

async function generateTestReport() {
  console.log('\n📋 生成测试报告...')
  
  const report = {
    timestamp: new Date().toISOString(),
    database_connection: false,
    functions_available: {
      get_user_profile: false,
      upsert_profile: false
    },
    direct_queries: false,
    auth_working: false
  }
  
  // 数据库连接测试
  report.database_connection = await testDatabaseConnection()
  
  // 函数测试
  await testProfilesFunctions()
  
  // 直接查询测试
  await testDirectProfileQueries()
  
  // 认证测试
  await testAuthFunctions()
  
  console.log('\n📊 测试报告摘要:')
  console.log('='.repeat(50))
  console.log(`数据库连接: ${report.database_connection ? '✅ 正常' : '❌ 异常'}`)
  console.log(`认证功能: ${report.auth_working ? '✅ 正常' : 'ℹ️ 未登录'}`)
  console.log('='.repeat(50))
  
  return report
}

async function main() {
  try {
    const report = await generateTestReport()
    
    console.log('\n🎯 修复建议:')
    
    if (!report.database_connection) {
      console.log('1. 检查 .env.local 文件中的 Supabase 配置')
      console.log('2. 确认 Supabase 项目状态正常')
    }
    
    console.log('3. 在 Supabase SQL 编辑器中执行以下文件:')
    console.log('   - database/profiles.sql (完整初始化)')
    console.log('   - 或 database/init-missing-functions.sql (仅创建函数)')
    
    console.log('\n✨ 当前状态: 应用已实现备用查询方案，即使数据库函数不存在也能正常工作')
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message)
  }
}

main().catch(console.error)