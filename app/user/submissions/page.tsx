"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"
import Link from "next/link"

// 模拟数据
const submissions = [
  {
    id: "1",
    name: "AI写作助手",
    slug: "ai-writing-assistant",
    submittedAt: "2024-04-20T10:30:00Z",
    status: "pending", // pending, approved
  },
  {
    id: "2",
    name: "智能图像生成器",
    slug: "smart-image-generator",
    submittedAt: "2024-04-15T14:20:00Z",
    status: "approved",
  },
  {
    id: "3",
    name: "语音转文字工具",
    slug: "voice-to-text",
    submittedAt: "2024-04-10T09:15:00Z",
    status: "approved",
  },
]

export default function SubmissionsPage() {
  const [userSubmissions, setUserSubmissions] = useState(submissions)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">我的提交</h2>

      {userSubmissions.length > 0 ? (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>工具名称</TableHead>
                <TableHead>提交时间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userSubmissions.map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell className="font-medium">{submission.name}</TableCell>
                  <TableCell>{formatDate(submission.submittedAt)}</TableCell>
                  <TableCell>
                    {submission.status === "pending" ? <Badge variant="outline">审核中</Badge> : <Badge>已发布</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    {submission.status === "approved" ? (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/tool/${submission.slug}`} target="_blank">
                          <Eye className="h-4 w-4 mr-1" />
                          查看
                        </Link>
                      </Button>
                    ) : (
                      "--"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 border rounded-md">
          <h3 className="text-lg font-medium mb-2">暂无提交记录</h3>
          <p className="text-muted-foreground mb-6">您还没有提交过任何AI工具</p>
          <Button asChild>
            <Link href="/user/submit">提交工具</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
