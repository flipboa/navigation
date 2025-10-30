"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import Link from "next/link"
import { submissionService, type UserSubmission } from "@/lib/services/submission"
import { useToast } from "@/components/ui/use-toast"

export default function SubmissionsPage() {
  const [userSubmissions, setUserSubmissions] = useState<UserSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadSubmissions()
  }, [])

  const loadSubmissions = async () => {
    try {
      setLoading(true)
      const submissions = await submissionService.getUserSubmissions()
      setUserSubmissions(submissions)
    } catch (error) {
      console.error('加载提交历史失败:', error)
      toast({
        title: "加载失败",
        description: "无法加载提交历史，请刷新页面重试",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusBadge = (status: string, autoApproved: boolean) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />审核中</Badge>
      case 'reviewing':
        return <Badge variant="default"><Eye className="w-3 h-3 mr-1" />审核中</Badge>
      case 'approved':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            {autoApproved ? '自动通过' : '已通过'}
          </Badge>
        )
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />已拒绝</Badge>
      case 'changes_requested':
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />需修改</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6">我的提交</h2>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">加载中...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">我的提交</h2>
        <Button asChild>
          <Link href="/user/submit">提交新工具</Link>
        </Button>
      </div>

      {userSubmissions.length > 0 ? (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>工具名称</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>提交时间</TableHead>
                <TableHead>审核时间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userSubmissions.map((submission) => (
                <TableRow key={submission.submission_id}>
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-medium">{submission.tool_name}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {submission.tool_description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{submission.category_name}</TableCell>
                  <TableCell>{formatDate(submission.submitted_at)}</TableCell>
                  <TableCell>
                    {submission.reviewed_at ? formatDate(submission.reviewed_at) : '--'}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(submission.status, submission.auto_approved)}
                  </TableCell>
                  <TableCell className="text-right">
                    {submission.status === "approved" && submission.tool_slug ? (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/tool/${submission.tool_slug}`} target="_blank">
                          <Eye className="h-4 w-4 mr-1" />
                          查看
                        </Link>
                      </Button>
                    ) : submission.status === "changes_requested" ? (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/user/submit?edit=${submission.submission_id}`}>
                          修改
                        </Link>
                      </Button>
                    ) : (
                      <span className="text-gray-400">--</span>
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
