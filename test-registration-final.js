const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase配置缺失')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testRegistration() {
  console.log('🧪 开始测试注册功能...')
  
  const timestamp = Date.now()
  const testEmail = `testuser${timestamp}@gmail.com`
  const testNickname = `testuser${timestamp}`
  const testPassword = 'TestPassword123!'
  
  try {
    // 1. 注册用户
    console.log('📝 注册用户:', testEmail)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    })

    if (authError) {
      console.error('❌ 用户注册失败:', authError.message)
      return
    }

    if (!authData.user) {
      console.error('❌ 注册返回的用户数据为空')
      return
    }

    console.log('✅ 用户注册成功:', authData.user.id)

    // 2. 创建profile
    console.log('📝 创建用户profile...')
    const profileData = {
      id: authData.user.id,
      nickname: testNickname,
      email: testEmail,
    }

    const { data: insertData, error: profileError } = await supabase
      .from('profiles')
      .insert([profileData])
      .select()

    if (profileError) {
      console.error('❌ Profile创建失败:', {
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint
      })
      return
    }

    console.log('✅ Profile创建成功:', insertData)

    // 3. 验证数据
    console.log('🔍 验证profile数据...')
    const { data: verifyData, error: verifyError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)

    if (verifyError) {
      console.error('❌ 验证失败:', verifyError.message)
      return
    }

    if (verifyData && verifyData.length > 0) {
      console.log('✅ 数据验证成功:', verifyData[0])
    } else {
      console.error('❌ 未找到profile数据')
      return
    }

    // 4. 清理测试数据
    console.log('🧹 清理测试数据...')
    await supabase.from('profiles').delete().eq('id', authData.user.id)
    console.log('✅ 测试完成，数据已清理')

  } catch (error) {
    console.error('❌ 测试过程中出现异常:', error)
  }
}

testRegistration()