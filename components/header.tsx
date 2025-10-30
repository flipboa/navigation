"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/components/auth-provider"
import { signOut } from "@/lib/auth"

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()
  const { user, profile, loading, profileLoading } = useAuth()

  const handleLogout = async () => {
    try {
      await signOut()
      router.push('/')
      toast({
        title: "已退出登录",
        description: "您已成功退出登录",
      })
    } catch (error) {
      toast({
        title: "退出登录失败",
        description: "请稍后重试",
        variant: "destructive",
      })
    }
  }

  // 获取用户显示名称
  const getUserDisplayName = () => {
    if (profile?.nickname) {
      return profile.nickname
    }
    if (user?.email) {
      return user.email.split('@')[0]
    }
    return '用户'
  }

  return (
    <header className="border-b fixed top-0 left-0 right-0 bg-background z-50">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="text-purple-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
                <path d="M7 7h.01" />
              </svg>
            </div>
            <span className="text-xl font-bold">AI工具集</span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-2">
              {/* 后台管理入口 - 仅管理员可见 */}
              {profile?.role === 'admin' && (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/admin">后台管理</Link>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        U
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      {profileLoading ? (
                        <p className="text-sm text-muted-foreground">加载中...</p>
                      ) : (
                        <>
                          <p className="font-medium text-sm">{getUserDisplayName()}</p>
                          {profile?.email && (
                            <p className="text-xs text-muted-foreground">{profile.email}</p>
                          )}
                          {profile?.role && profile.role !== 'user' && (
                            <p className="text-xs text-blue-600 font-medium">
                              {profile.role === 'admin' ? '管理员' : '审核员'}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link href="/user/profile">个人信息</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/user/submissions">提交历史</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/user/submit">提交工具</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>退出登录</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild>
                <Link href="/login">登录</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">注册</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
