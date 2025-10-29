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

export default function LoginPage() {
  const [emailOrNickname, setEmailOrNickname] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      let loginEmail = emailOrNickname

      // 检查输入的是否为昵称（不包含@符号）
      if (!emailOrNickname.includes('@')) {
        // 通过昵称查找对应的邮箱
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('nickname', emailOrNickname.toLowerCase())
          .single()

        if (profileError || !profile) {
          setError('昵称不存在，请检查输入或使用邮箱登录')
          setLoading(false)
          return
        }

        loginEmail = profile.email
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      })

      if (error) {
        setError('登录失败：' + error.message)
      } else {
        router.push('/')
      }
    } catch (err) {
      setError('登录时发生错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">登录</CardTitle>
          <CardDescription className="text-center">
            请登录您的账户
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="emailOrNickname">邮箱\昵称</Label>
              <Input
                id="emailOrNickname"
                type="text"
                placeholder="输入您的邮箱\昵称"
                value={emailOrNickname}
                onChange={(e) => setEmailOrNickname(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="输入您的密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? '登录中...' : '登录'}
            </Button>
          </form>
          
          <div className="mt-4 text-center text-sm">
            还没有账户？{' '}
            <Link href="/signup" className="text-blue-600 hover:underline">
              立即注册
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}