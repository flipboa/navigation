import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { createDefaultProfile } from '@/lib/services/profiles'

export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function signOut() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw error
  }
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) {
    throw error
  }
  
  return data
}

export async function signUpWithEmail(email: string, password: string, nickname?: string) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })
  
  if (error) {
    throw error
  }

  // 如果注册成功且有用户数据，创建默认 Profile
  if (data.user && !error) {
    try {
      await createDefaultProfile(data.user.id, email, nickname)
    } catch (profileError) {
      console.error('Failed to create user profile:', profileError)
      // 不抛出错误，因为用户认证已经成功
    }
  }
  
  return data
}