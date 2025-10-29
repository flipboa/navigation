"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/components/auth-provider"
import { signOut } from "@/lib/auth"
import { Skeleton } from "@/components/ui/skeleton"

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, profile, profileLoading, loading } = useAuth()
  const [submissionCount, setSubmissionCount] = useState<number>(0)

  // 获取用户提交的工具数量
  useEffect(() => {
    // TODO: 从数据库获取用户提交的工具数量
    // 这里暂时设置为0，后续可以通过API获取
    setSubmissionCount(0)
  }, [user])

  const handleLogout = async () => {
    try {
      await signOut()
      toast({
        title: "已退出登录",
        description: "您已成功退出登录",
      })
      router.push("/")
    } catch (error) {
      toast({
        title: "退出登录失败",
        description: "请重试",
        variant: "destructive",
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getUserDisplayName = () => {
    if (profile?.nickname) return profile.nickname
    if (user?.email) {
      const emailPrefix = user.email.split('@')[0]
      return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1)
    }
    return "用户"
  }

  const getAvatarFallback = () => {
    const displayName = getUserDisplayName()
    return displayName.charAt(0).toUpperCase()
  }

  // 如果正在加载用户信息，显示骨架屏
  if (loading || profileLoading) {
    return (
      <div className="max-w-2xl">
        <div className="flex flex-col md:flex-row items-start gap-8 mb-8">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Separator className="my-6" />
        <div className="space-y-6">
          <div>
            <Skeleton className="h-6 w-24 mb-4" />
            <div className="space-y-4">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-8" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 如果用户未登录，重定向到登录页
  if (!user) {
    router.push('/login')
    return null
  }

  return (
    <div className="max-w-2xl">
      <div className="flex flex-col md:flex-row items-start gap-8 mb-8">
        <Avatar className="h-24 w-24">
          <AvatarImage src="/placeholder.svg" alt={getUserDisplayName()} />
          <AvatarFallback>{getAvatarFallback()}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-2xl font-bold">{getUserDisplayName()}</h2>
          <p className="text-muted-foreground">{user.email}</p>
          {profile?.role && (
            <p className="text-sm text-blue-600 mt-1">
              {profile.role === 'admin' ? '管理员' : 
               profile.role === 'reviewer' ? '审核员' : '普通用户'}
            </p>
          )}
        </div>
      </div>

      <Separator className="my-6" />

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-4">账户信息</h3>
          <dl className="space-y-4">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">邮箱地址</dt>
              <dd>{user.email}</dd>
            </div>
            {profile?.nickname && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">昵称</dt>
                <dd>{profile.nickname}</dd>
              </div>
            )}
            {profile?.created_at && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">注册时间</dt>
                <dd>{formatDate(profile.created_at)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">提交工具数</dt>
              <dd>{submissionCount}</dd>
            </div>
          </dl>
        </div>

        <Separator className="my-6" />

        <div>
          <h3 className="text-lg font-medium mb-4">账户操作</h3>
          <Button variant="outline" onClick={handleLogout}>
            退出登录
          </Button>
        </div>
      </div>
    </div>
  )
}
