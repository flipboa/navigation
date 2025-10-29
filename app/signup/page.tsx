'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [nicknameError, setNicknameError] = useState('')
  const [checkingNickname, setCheckingNickname] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [checkingEmail, setCheckingEmail] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // 防抖函数，避免频繁请求
  const debounce = (func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout
    return (...args: any[]) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => func.apply(null, args), delay)
    }
  }

  // 昵称检查函数
  const checkNicknameAvailability = async (nickname: string) => {
    if (!nickname) {
      return
    }
    
    // 如果昵称格式不正确，不进行数据库查询
    const validationError = validateNickname(nickname)
    if (validationError) {
      return
    }

    setCheckingNickname(true)
    setNicknameError('')

    try {
      // 查询profiles表中是否已存在该昵称
      const { data, error } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('nickname', nickname.toLowerCase())
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 表示没有找到记录
        console.error('检查昵称时出错:', error)
        setNicknameError('检查昵称时出错，请稍后重试')
      } else if (data) {
        setNicknameError('该昵称已被使用，请选择其他昵称')
      }
    } catch (err) {
      console.error('检查昵称时出错:', err)
      setNicknameError('检查昵称时出错，请稍后重试')
    } finally {
      setCheckingNickname(false)
    }
  }

  // 创建防抖的昵称检查函数
  const debouncedCheckNickname = debounce(checkNicknameAvailability, 500)

  // 验证邮箱格式
  const validateEmail = (email: string) => {
    if (!email) {
      return '邮箱不能为空'
    }
    
    // 检查邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return '请输入有效的邮箱格式'
    }
    
    // 检查支持的邮箱域名
    const supportedDomains = ['gmail.com', '163.com', 'qq.com']
    const domain = email.split('@')[1]?.toLowerCase()
    
    if (!supportedDomains.includes(domain)) {
      return '只支持 gmail.com、163.com、qq.com 邮箱'
    }
    
    return ''
  }

  // 检查邮箱是否已注册
  const checkEmailAvailability = async (email: string) => {
    if (!email) {
      return
    }
    
    // 如果邮箱格式不正确，不进行数据库查询
    const validationError = validateEmail(email)
    if (validationError) {
      return
    }

    setCheckingEmail(true)
    setEmailError('')

    try {
      // 检查 auth.users 表中是否已存在该邮箱
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email.toLowerCase())
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 表示没有找到记录
        console.error('检查邮箱时出错:', error)
        setEmailError('检查邮箱时出错，请稍后重试')
      } else if (data) {
        setEmailError('该邮箱已被注册，请使用其他邮箱')
      }
    } catch (err) {
      console.error('检查邮箱时出错:', err)
      setEmailError('检查邮箱时出错，请稍后重试')
    } finally {
      setCheckingEmail(false)
    }
  }

  // 创建防抖的邮箱检查函数
  const debouncedCheckEmail = debounce(checkEmailAvailability, 500)

  // 验证昵称格式
  const validateNickname = (nickname: string) => {
    if (!nickname) {
      return '昵称不能为空'
    }
    if (nickname.length < 3) {
      return '昵称至少需要3个字母'
    }
    if (!/^[a-zA-Z]+$/.test(nickname)) {
      return '昵称只能包含字母，不能有特殊字符或数字'
    }
    return ''
  }

  // 处理昵称输入框失去焦点
  const handleNicknameBlur = () => {
    const validationError = validateNickname(nickname)
    if (validationError) {
      setNicknameError(validationError)
    } else {
      debouncedCheckNickname(nickname)
    }
  }

  // 处理昵称输入变化
  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setNickname(value)
    setNicknameError('')
    
    // 在用户输入时也进行防抖检查
    if (value.length >= 3 && !validateNickname(value)) {
      debouncedCheckNickname(value)
    }
  }

  // 处理邮箱输入变化
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    setEmailError('')
    
    // 在用户输入时进行格式验证
    const validationError = validateEmail(value)
    if (validationError) {
      setEmailError(validationError)
    } else {
      // 格式正确时进行防抖检查
      debouncedCheckEmail(value)
    }
  }

  // 处理邮箱输入框失去焦点
  const handleEmailBlur = () => {
    const validationError = validateEmail(email)
    if (validationError) {
      setEmailError(validationError)
    } else {
      debouncedCheckEmail(email)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // 验证昵称
    const nicknameValidationError = validateNickname(nickname)
    if (nicknameValidationError) {
      setNicknameError(nicknameValidationError)
      setLoading(false)
      return
    }

    // 如果有昵称错误，不允许提交
    if (nicknameError) {
      setLoading(false)
      return
    }

    // 验证邮箱
    const emailValidationError = validateEmail(email)
    if (emailValidationError) {
      setEmailError(emailValidationError)
      setLoading(false)
      return
    }

    // 如果有邮箱错误，不允许提交
    if (emailError) {
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('密码不匹配')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('密码长度至少为6位')
      setLoading(false)
      return
    }

    try {
      // 先检查昵称是否可用（最终检查）
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('nickname', nickname.toLowerCase())
        .single()

      if (existingProfile) {
        setNicknameError('该昵称已被使用，请选择其他昵称')
        setLoading(false)
        return
      }

      // 注册用户
      console.log('开始注册用户:', { email, nickname: nickname.toLowerCase() })
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      console.log('注册结果:', { authData, authError })

      if (authError) {
        console.error('注册用户时出错:', authError)
        setError(`注册失败: ${authError.message}`)
      } else if (authData.user) {
        console.log('用户注册成功，开始创建profile:', authData.user.id)
        
        // 使用UPSERT函数创建或更新用户profile
        console.log('准备使用UPSERT创建profile:', {
          id: authData.user.id,
          nickname: nickname.toLowerCase(),
          email: email
        })
        
        const { data: insertData, error: profileError } = await supabase
          .rpc('upsert_profile', {
            user_email: email,
            user_id: authData.user.id,
            user_nickname: nickname.toLowerCase()
          })

        console.log('Profile插入结果:', { insertData, profileError })

        if (profileError) {
          console.error('创建用户profile时出错:', {
            error: profileError,
            code: profileError.code,
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint
          })
          setError(`注册成功，但保存用户信息时出错: ${profileError.message}`)
        } else {
          console.log('Profile创建成功:', insertData)
          setSuccess('注册成功！请检查您的邮箱以验证账户。')
          // 可以选择自动跳转到登录页面
          setTimeout(() => {
            router.push('/login')
          }, 3000)
        }
      } else {
        console.error('注册返回的数据异常:', authData)
        setError('注册过程中出现异常，请重试')
      }
    } catch (err) {
      console.error('注册过程中发生异常:', err)
      setError(`注册时发生错误: ${err instanceof Error ? err.message : '未知错误'}，请稍后重试`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">注册</CardTitle>
          <CardDescription className="text-center">
            创建您的新账户
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="nickname">昵称</Label>
              <Input
                id="nickname"
                type="text"
                placeholder="输入您的昵称（只能包含字母，至少3位）"
                value={nickname}
                onChange={handleNicknameChange}
                onBlur={handleNicknameBlur}
                required
                disabled={loading}
                className={nicknameError ? 'border-red-500' : ''}
              />
              {checkingNickname && (
                <p className="text-sm text-blue-600">正在检查昵称可用性...</p>
              )}
              {nicknameError && (
                <p className="text-sm text-red-600">{nicknameError}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="输入您的邮箱（支持 gmail.com、163.com、qq.com）"
                value={email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                required
                disabled={loading}
                className={emailError ? 'border-red-500' : ''}
              />
              {checkingEmail && (
                <p className="text-sm text-blue-600">正在检查邮箱可用性...</p>
              )}
              {emailError && (
                <p className="text-sm text-red-600">{emailError}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="输入密码（至少6位）"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="再次输入密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? '注册中...' : '注册'}
            </Button>
          </form>
          
          <div className="mt-4 text-center text-sm">
            已有账户？{' '}
            <Link href="/login" className="text-blue-600 hover:underline">
              立即登录
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}