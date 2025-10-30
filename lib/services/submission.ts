import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type SubmissionStatus = Database['public']['Enums']['submission_status']
type ReviewAction = Database['public']['Enums']['review_action']

export interface SubmissionData {
  tool_name: string
  tool_description: string
  tool_website_url: string
  category_id: string
  tool_content?: string
  tool_logo_url?: string

  tool_tags?: string[]
  tool_type?: 'free' | 'freemium' | 'paid'
  pricing_info?: Record<string, any>
  submitter_email?: string
  submitter_name?: string
  submission_notes?: string
}

export interface SubmissionResult {
  submission_id: string
  status: SubmissionStatus
  user_role: string
  auto_approved: boolean
  message: string
}

export interface ReviewResult {
  submission_id: string
  previous_status: SubmissionStatus
  new_status: SubmissionStatus
  reviewer_role: string
  message: string
}

export interface PendingSubmission {
  submission_id: string
  tool_name: string
  tool_description: string
  tool_website_url: string
  category_name: string
  submitter_name: string
  submitter_email: string
  submitted_at: string
  status: SubmissionStatus
  review_priority: number
}

export interface UserSubmission {
  submission_id: string
  tool_name: string
  tool_description: string
  category_name: string
  status: SubmissionStatus
  submitted_at: string
  reviewed_at?: string
  tool_slug?: string
  auto_approved: boolean
}

export interface ReviewStats {
  pending_count: number
  approved_today: number
  rejected_today: number
  changes_requested: number
  avg_review_time_hours?: number
}

/**
 * 提交服务类
 * 处理工具提交和审核相关的业务逻辑
 */
export class SubmissionService {
  private supabase = createClient()

  /**
   * 智能提交工具（基于用户角色自动决定是否需要审核）
   */
  async submitTool(data: SubmissionData): Promise<SubmissionResult> {
    try {
      // 首先获取当前用户信息
      const { data: { user }, error: authError } = await this.supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('用户未登录')
      }

      // 获取用户角色
      const { data: profile, error: profileError } = await this.supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError) {
        throw new Error('无法获取用户角色信息')
      }

      const userRole = profile?.role || 'user'
      
      // 根据角色决定初始状态
      const initialStatus: SubmissionStatus = ['admin', 'reviewer'].includes(userRole) 
        ? 'approved' 
        : 'submitted'

      // 插入提交记录
      const { data: submission, error: submissionError } = await this.supabase
        .from('submissions')
        .insert({
          tool_name: data.tool_name,
          tool_description: data.tool_description,
          tool_content: data.tool_content,
          tool_website_url: data.tool_website_url,
          tool_logo_url: data.tool_logo_url,

          category_id: data.category_id,
          tool_tags: data.tool_tags || [],
          tool_type: data.tool_type || 'free',
          pricing_info: data.pricing_info || {},
          submitter_email: data.submitter_email,
          submitter_name: data.submitter_name,
          submission_notes: data.submission_notes,
          status: initialStatus,
          submitted_by: user.id,
          submitted_at: new Date().toISOString(),
          reviewed_by: initialStatus === 'approved' ? user.id : null,
          review_completed_at: initialStatus === 'approved' ? new Date().toISOString() : null,
        })
        .select('id')
        .single()

      if (submissionError || !submission) {
        throw new Error('提交失败：' + submissionError?.message)
      }

      // 记录审核历史
      const { error: reviewError } = await this.supabase
        .from('submission_reviews')
        .insert({
          submission_id: submission.id,
          action: initialStatus === 'approved' ? 'approve' : 'submit',
          notes: initialStatus === 'approved' 
            ? '管理员/审核员提交，自动通过审核' 
            : '普通用户提交，等待审核',
          reviewer_id: user.id,
          previous_status: 'draft',
          new_status: initialStatus,
        })

      if (reviewError) {
        console.error('记录审核历史失败:', reviewError)
      }

      return {
        submission_id: submission.id,
        status: initialStatus,
        user_role: userRole,
        auto_approved: initialStatus === 'approved',
        message: initialStatus === 'approved' 
          ? '提交成功，已自动通过审核并发布' 
          : '提交成功，等待审核员或管理员审核'
      }
    } catch (error) {
      console.error('提交工具失败:', error)
      throw error
    }
  }

  /**
   * 审核提交（简化流程，只需一方审核）
   */
  async reviewSubmission(
    submissionId: string, 
    action: ReviewAction, 
    notes?: string
  ): Promise<ReviewResult> {
    try {
      // 检查用户权限
      const { data: { user }, error: authError } = await this.supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('用户未登录')
      }

      const { data: profile, error: profileError } = await this.supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError || !profile || !['admin', 'reviewer'].includes(profile.role)) {
        throw new Error('权限不足：只有管理员和审核员可以进行审核操作')
      }

      // 获取当前提交状态
      const { data: submission, error: getError } = await this.supabase
        .from('submissions')
        .select('status')
        .eq('id', submissionId)
        .single()

      if (getError || !submission) {
        throw new Error('提交记录不存在')
      }

      const currentStatus = submission.status
      
      // 检查状态是否可以审核
      if (!['submitted', 'reviewing', 'changes_requested'].includes(currentStatus)) {
        throw new Error('当前状态不允许审核操作')
      }

      // 根据动作确定新状态
      let newStatus: SubmissionStatus
      switch (action) {
        case 'approve':
          newStatus = 'approved'
          break
        case 'reject':
          newStatus = 'rejected'
          break
        case 'request_changes':
          newStatus = 'changes_requested'
          break
        case 'start_review':
          newStatus = 'reviewing'
          break
        default:
          throw new Error('无效的审核动作')
      }

      // 更新提交状态
      const { error: updateError } = await this.supabase
        .from('submissions')
        .update({
          status: newStatus,
          reviewed_by: user.id,
          review_notes: notes,
          review_completed_at: ['approved', 'rejected'].includes(newStatus) 
            ? new Date().toISOString() 
            : undefined,
          review_started_at: currentStatus === 'submitted' 
            ? new Date().toISOString() 
            : undefined,
        })
        .eq('id', submissionId)

      if (updateError) {
        throw new Error('更新提交状态失败：' + updateError.message)
      }

      // 记录审核历史
      const { error: reviewError } = await this.supabase
        .from('submission_reviews')
        .insert({
          submission_id: submissionId,
          action,
          notes,
          reviewer_id: user.id,
          previous_status: currentStatus,
          new_status: newStatus,
        })

      if (reviewError) {
        console.error('记录审核历史失败:', reviewError)
      }

      return {
        submission_id: submissionId,
        previous_status: currentStatus,
        new_status: newStatus,
        reviewer_role: profile.role,
        message: this.getStatusMessage(newStatus)
      }
    } catch (error) {
      console.error('审核提交失败:', error)
      throw error
    }
  }

  /**
   * 获取待审核的提交列表
   */
  async getPendingSubmissions(limit = 20, offset = 0): Promise<PendingSubmission[]> {
    try {
      const { data, error } = await this.supabase
        .from('submissions')
        .select(`
          id,
          tool_name,
          tool_description,
          tool_website_url,
          submitted_at,
          status,
          review_priority,
          submitter_name,
          submitter_email,
          categories!inner(name),
          profiles(nickname, email)
        `)
        .in('status', ['submitted', 'reviewing', 'changes_requested'])
        .eq('is_latest_version', true)
        .order('review_priority', { ascending: false })
        .order('submitted_at', { ascending: true })
        .range(offset, offset + limit - 1)

      if (error) {
        throw new Error('获取待审核列表失败：' + error.message)
      }

      return (data || []).map(item => ({
        submission_id: item.id,
        tool_name: item.tool_name,
        tool_description: item.tool_description,
        tool_website_url: item.tool_website_url,
        category_name: (item.categories as any)?.name || '',
        submitter_name: (item.profiles as any)?.nickname || item.submitter_name || '',
        submitter_email: (item.profiles as any)?.email || item.submitter_email || '',
        submitted_at: item.submitted_at || '',
        status: item.status,
        review_priority: item.review_priority || 3,
      }))
    } catch (error) {
      console.error('获取待审核列表失败:', error)
      throw error
    }
  }

  /**
   * 获取用户的提交历史
   */
  async getUserSubmissions(userId?: string): Promise<UserSubmission[]> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('用户未登录')
      }

      const targetUserId = userId || user.id

      const { data, error } = await this.supabase
        .from('submissions')
        .select(`
          id,
          tool_name,
          tool_description,
          status,
          submitted_at,
          review_completed_at,
          categories!inner(name),
          tools(slug)
        `)
        .eq('submitted_by', targetUserId)
        .eq('is_latest_version', true)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error('获取提交历史失败：' + error.message)
      }

      return (data || []).map(item => ({
        submission_id: item.id,
        tool_name: item.tool_name,
        tool_description: item.tool_description,
        category_name: (item.categories as any)?.name || '',
        status: item.status,
        submitted_at: item.submitted_at || '',
        reviewed_at: item.review_completed_at || undefined,
        tool_slug: (item.tools as any)?.slug || undefined,
        auto_approved: item.submitted_at === item.review_completed_at,
      }))
    } catch (error) {
      console.error('获取提交历史失败:', error)
      throw error
    }
  }

  /**
   * 获取审核统计数据
   */
  async getReviewStats(): Promise<ReviewStats> {
    try {
      // 获取待审核数量
      const { count: pendingCount } = await this.supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .in('status', ['submitted', 'reviewing'])
        .eq('is_latest_version', true)

      // 获取今日审核通过数量
      const today = new Date().toISOString().split('T')[0]
      const { count: approvedToday } = await this.supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')
        .gte('review_completed_at', today)
        .eq('is_latest_version', true)

      // 获取今日拒绝数量
      const { count: rejectedToday } = await this.supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rejected')
        .gte('review_completed_at', today)
        .eq('is_latest_version', true)

      // 获取需要修改数量
      const { count: changesRequested } = await this.supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'changes_requested')
        .eq('is_latest_version', true)

      return {
        pending_count: pendingCount || 0,
        approved_today: approvedToday || 0,
        rejected_today: rejectedToday || 0,
        changes_requested: changesRequested || 0,
      }
    } catch (error) {
      console.error('获取审核统计失败:', error)
      throw error
    }
  }

  /**
   * 根据状态获取消息
   */
  private getStatusMessage(status: SubmissionStatus): string {
    switch (status) {
      case 'approved':
        return '审核通过，工具已发布'
      case 'rejected':
        return '审核未通过，已拒绝'
      case 'changes_requested':
        return '需要修改，请根据反馈进行调整'
      case 'reviewing':
        return '已开始审核'
      default:
        return '状态已更新'
    }
  }
}

// 导出单例实例
export const submissionService = new SubmissionService()