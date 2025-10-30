"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { submissionService, type PendingSubmission, type ReviewStats } from "@/lib/services/submission"
import { CheckCircle, XCircle, AlertCircle, Clock, ExternalLink, Eye } from "lucide-react"

export default function ReviewsPage() {
  const [pendingSubmissions, setPendingSubmissions] = useState<PendingSubmission[]>([])
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [reviewNotes, setReviewNotes] = useState("")
  const [selectedSubmission, setSelectedSubmission] = useState<PendingSubmission | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [submissions, stats] = await Promise.all([
        submissionService.getPendingSubmissions(),
        submissionService.getReviewStats()
      ])
      setPendingSubmissions(submissions)
      setReviewStats(stats)
    } catch (error) {
      console.error('加载数据失败:', error)
      toast({
        title: "加载失败",
        description: "无法加载审核数据，请刷新页面重试",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (submissionId: string, action: 'approve' | 'reject' | 'request_changes') => {
    if (!reviewNotes.trim() && action !== 'approve') {
      toast({
        title: "请填写审核意见",
        description: "拒绝或要求修改时必须填写审核意见",
        variant: "destructive",
      })
      return
    }

    try {
      setReviewingId(submissionId)
      await submissionService.reviewSubmission(submissionId, action, reviewNotes)
      
      toast({
        title: "审核完成",
        description: getActionMessage(action),
      })

      // 重新加载数据
      await loadData()
      setReviewNotes("")
      setSelectedSubmission(null)
    } catch (error) {
      console.error('审核失败:', error)
      toast({
        title: "审核失败",
        description: error instanceof Error ? error.message : "未知错误，请重试",
        variant: "destructive",
      })
    } finally {
      setReviewingId(null)
    }
  }

  const getActionMessage = (action: string) => {
    switch (action) {
      case 'approve':
        return '已通过审核，工具将发布到首页'
      case 'reject':
        return '已拒绝提交'
      case 'request_changes':
        return '已要求修改，用户将收到通知'
      default:
        return '审核完成'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />待审核</Badge>
      case 'reviewing':
        return <Badge variant="default"><Eye className="w-3 h-3 mr-1" />审核中</Badge>
      case 'changes_requested':
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />需修改</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getPriorityColor = (priority: number) => {
    if (priority >= 5) return "text-red-600"
    if (priority >= 4) return "text-orange-600"
    return "text-gray-600"
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
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
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">审核管理</h1>
        <p className="text-gray-600">管理和审核用户提交的工具</p>
      </div>

      {/* 统计卡片 */}
      {reviewStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">待审核</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{reviewStats.pending_count}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">今日通过</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{reviewStats.approved_today}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">今日拒绝</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{reviewStats.rejected_today}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">需要修改</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{reviewStats.changes_requested}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 待审核列表 */}
      <Card>
        <CardHeader>
          <CardTitle>待审核提交</CardTitle>
          <CardDescription>
            点击工具名称查看详情，进行审核操作
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingSubmissions.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600">暂无待审核的提交</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingSubmissions.map((submission) => (
                <div key={submission.submission_id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="link" 
                              className="p-0 h-auto font-semibold text-lg"
                              onClick={() => setSelectedSubmission(submission)}
                            >
                              {submission.tool_name}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                {submission.tool_name}
                                <a 
                                  href={submission.tool_website_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </DialogTitle>
                              <DialogDescription>
                                分类：{submission.category_name} | 提交者：{submission.submitter_name}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label className="text-sm font-medium">工具描述</Label>
                                <p className="text-sm text-gray-600 mt-1">{submission.tool_description}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">网站地址</Label>
                                <p className="text-sm text-blue-600 mt-1">
                                  <a href={submission.tool_website_url} target="_blank" rel="noopener noreferrer">
                                    {submission.tool_website_url}
                                  </a>
                                </p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">提交时间</Label>
                                <p className="text-sm text-gray-600 mt-1">
                                  {new Date(submission.submitted_at).toLocaleString('zh-CN')}
                                </p>
                              </div>
                              <div>
                                <Label htmlFor="review-notes" className="text-sm font-medium">审核意见</Label>
                                <Textarea
                                  id="review-notes"
                                  placeholder="请填写审核意见（拒绝或要求修改时必填）"
                                  value={reviewNotes}
                                  onChange={(e) => setReviewNotes(e.target.value)}
                                  className="mt-1"
                                />
                              </div>
                            </div>
                            <DialogFooter className="gap-2">
                              <Button
                                variant="outline"
                                onClick={() => handleReview(submission.submission_id, 'request_changes')}
                                disabled={reviewingId === submission.submission_id}
                              >
                                <AlertCircle className="w-4 h-4 mr-2" />
                                要求修改
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => handleReview(submission.submission_id, 'reject')}
                                disabled={reviewingId === submission.submission_id}
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                拒绝
                              </Button>
                              <Button
                                onClick={() => handleReview(submission.submission_id, 'approve')}
                                disabled={reviewingId === submission.submission_id}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                通过
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        {getStatusBadge(submission.status)}
                        <span className={`text-sm ${getPriorityColor(submission.review_priority)}`}>
                          优先级: {submission.review_priority}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-2">{submission.tool_description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>分类：{submission.category_name}</span>
                        <span>提交者：{submission.submitter_name}</span>
                        <span>提交时间：{new Date(submission.submitted_at).toLocaleDateString('zh-CN')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}