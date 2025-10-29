"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { Separator } from "@/components/ui/separator"

// 模拟用户数据
const userData = {
  name: "张三",
  email: "zhangsan@example.com",
  avatar: "/abstract-user-icon.png",
  joinDate: "2024-01-15T00:00:00Z",
  submissionCount: 3,
}

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState(userData)

  const handleLogout = () => {
    toast({
      title: "已退出登录",
      description: "您已成功退出登录",
    })
    router.push("/")
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className="max-w-2xl">
      <div className="flex flex-col md:flex-row items-start gap-8 mb-8">
        <Avatar className="h-24 w-24">
          <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-2xl font-bold">{user.name}</h2>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <Separator className="my-6" />

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-4">账户信息</h3>
          <dl className="space-y-4">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">注册时间</dt>
              <dd>{formatDate(user.joinDate)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">提交工具数</dt>
              <dd>{user.submissionCount}</dd>
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
