import { createClient } from '@/lib/supabase/client'

// 用户 Profile 接口定义
export interface Profile {
  id: string
  nickname: string
  email: string
  role: 'user' | 'admin' | 'reviewer'
  created_at: string
  updated_at: string
}

// 用于 UI 显示的 Profile 接口
export interface ProfileForUI {
  id: string
  nickname: string
  email: string
  role: 'user' | 'admin' | 'reviewer'
  created_at: string
  updated_at: string
  avatar?: string // 可选的头像字段
}

// 创建或更新用户 Profile 的参数接口
export interface UpsertProfileParams {
  user_email: string
  user_id: string
  user_nickname: string
  user_role?: 'user' | 'admin' | 'reviewer'
}

// 数据库返回的 Profile 数据接口
interface ProfileResponse {
  profile_id: string
  profile_nickname: string
  profile_email: string
  profile_role: 'user' | 'admin' | 'reviewer'
  profile_created_at: string
  profile_updated_at: string
}

/**
 * 创建或更新用户 Profile
 * 使用数据库中的 upsert_profile 函数
 */
export async function upsertProfile(params: UpsertProfileParams): Promise<ProfileForUI> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase.rpc('upsert_profile', {
      user_email: params.user_email,
      user_id: params.user_id,
      user_nickname: params.user_nickname,
      user_role: params.user_role || 'user'
    })

    if (error) {
      console.error('Error upserting profile:', error)
      throw error
    }

    if (!data || data.length === 0) {
      throw new Error('No profile data returned')
    }

    const profileData = data[0] as ProfileResponse
    
    return {
      id: profileData.profile_id,
      nickname: profileData.profile_nickname,
      email: profileData.profile_email,
      role: profileData.profile_role,
      created_at: profileData.profile_created_at,
      updated_at: profileData.profile_updated_at
    }
  } catch (error) {
    console.error('Failed to upsert profile:', error)
    throw error
  }
}

/**
 * 获取用户 Profile 信息
 * 优先使用数据库中的 get_user_profile 函数，如果不存在则使用直接查询
 */
export async function getUserProfile(userId: string): Promise<ProfileForUI | null> {
  const supabase = createClient()
  
  try {
    // 首先尝试使用 RPC 函数
    const { data, error } = await supabase.rpc('get_user_profile', {
      user_id: userId
    })

    // 如果函数不存在（PGRST202 错误），使用备用的直接查询方法
    if (error && error.code === 'PGRST202') {
      console.warn('get_user_profile 函数不存在，使用直接查询方法')
      return await getProfileDirect(userId)
    }

    if (error) {
      console.error('Error getting user profile:', error)
      throw error
    }

    if (!data || data.length === 0) {
      return null
    }

    const profileData = data[0] as ProfileResponse
    
    return {
      id: profileData.profile_id,
      nickname: profileData.profile_nickname,
      email: profileData.profile_email,
      role: profileData.profile_role,
      created_at: profileData.profile_created_at,
      updated_at: profileData.profile_updated_at
    }
  } catch (error) {
    console.error('Failed to get user profile:', error)
    // 如果 RPC 调用失败，尝试使用直接查询作为最后的备用方案
    try {
      console.warn('RPC 调用失败，尝试使用直接查询方法')
      return await getProfileDirect(userId)
    } catch (fallbackError) {
      console.error('直接查询也失败:', fallbackError)
      return null
    }
  }
}

/**
 * 检查昵称是否可用
 * 使用数据库中的 is_nickname_available 函数
 */
export async function isNicknameAvailable(
  nickname: string, 
  excludeUserId?: string
): Promise<boolean> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase.rpc('is_nickname_available', {
      check_nickname: nickname,
      exclude_user_id: excludeUserId || null
    })

    if (error) {
      console.error('Error checking nickname availability:', error)
      throw error
    }

    return data === true
  } catch (error) {
    console.error('Failed to check nickname availability:', error)
    return false
  }
}

/**
 * 直接查询用户 Profile（需要 RLS 权限）
 * 作为备用方案，当 RPC 函数不可用时使用
 */
export async function getProfileDirect(userId: string): Promise<ProfileForUI | null> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // 没有找到记录
        return null
      }
      console.error('Error getting profile directly:', error)
      throw error
    }

    return {
      id: data.id,
      nickname: data.nickname,
      email: data.email,
      role: data.role,
      created_at: data.created_at,
      updated_at: data.updated_at
    }
  } catch (error) {
    console.error('Failed to get profile directly:', error)
    return null
  }
}

/**
 * 更新用户 Profile（直接更新，需要 RLS 权限）
 */
export async function updateProfileDirect(
  userId: string, 
  updates: Partial<Pick<Profile, 'nickname' | 'email' | 'role'>>
): Promise<ProfileForUI | null> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating profile directly:', error)
      throw error
    }

    return {
      id: data.id,
      nickname: data.nickname,
      email: data.email,
      role: data.role,
      created_at: data.created_at,
      updated_at: data.updated_at
    }
  } catch (error) {
    console.error('Failed to update profile directly:', error)
    return null
  }
}

/**
 * 获取当前用户的完整信息（认证用户 + Profile）
 */
export async function getCurrentUserWithProfile(): Promise<{
  user: any
  profile: ProfileForUI | null
} | null> {
  const supabase = createClient()
  
  try {
    // 获取当前认证用户
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return null
    }

    // 获取用户 Profile
    const profile = await getUserProfile(user.id)
    
    return {
      user,
      profile
    }
  } catch (error) {
    console.error('Failed to get current user with profile:', error)
    return null
  }
}

/**
 * 为新注册用户创建默认 Profile
 */
export async function createDefaultProfile(
  userId: string, 
  email: string, 
  nickname?: string
): Promise<ProfileForUI> {
  // 如果没有提供昵称，从邮箱中提取
  const defaultNickname = nickname || email.split('@')[0]
  
  return await upsertProfile({
    user_id: userId,
    user_email: email,
    user_nickname: defaultNickname,
    user_role: 'user'
  })
}