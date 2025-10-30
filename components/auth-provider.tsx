'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { ProfileForUI, getUserProfile, createDefaultProfile } from '@/lib/services/profiles'

interface AuthContextType {
  user: User | null
  profile: ProfileForUI | null
  loading: boolean
  profileLoading: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  profileLoading: true,
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<ProfileForUI | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(true)
  const supabase = createClient()

  // 强制清除会话的函数
  const clearSession = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      setLoading(false)
      setProfileLoading(false)
    } catch (error) {
      console.error('Failed to clear session:', error)
      // 即使清除失败，也强制重置状态
      setUser(null)
      setProfile(null)
      setLoading(false)
      setProfileLoading(false)
    }
  }

  // 加载用户 Profile 的函数
  const loadUserProfile = async (userId: string) => {
    setProfileLoading(true)
    try {
      // 添加超时处理
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile loading timeout')), 10000) // 10秒超时
      })
      
      const userProfile = await Promise.race([
        getUserProfile(userId),
        timeoutPromise
      ]) as ProfileForUI | null
      
      setProfile(userProfile)
    } catch (error) {
      console.error('Failed to load user profile:', error)
      setProfile(null)
      // 如果是网络错误，设置一个默认的加载完成状态
      if (error instanceof Error && (
        error.message.includes('fetch') || 
        error.message.includes('timeout') ||
        error.message.includes('network')
      )) {
        console.warn('Network error detected, setting profile loading to false')
      }
    } finally {
      setProfileLoading(false)
    }
  }

  // 刷新 Profile 的函数
  const refreshProfile = async () => {
    if (user?.id) {
      await loadUserProfile(user.id)
    }
  }

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        // 添加超时处理
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Session loading timeout')), 5000) // 5秒超时
        })
        
        const sessionPromise = supabase.auth.getSession()
        
        const { data: { session } } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any
        
        const currentUser = session?.user ?? null
        setUser(currentUser)
        setLoading(false)

        // 如果有用户，加载其 Profile
        if (currentUser?.id) {
          await loadUserProfile(currentUser.id)
        } else {
          setProfile(null)
          setProfileLoading(false)
        }
      } catch (error) {
         console.error('Failed to get initial session:', error)
         // 如果是网络错误，强制清除可能的无效会话
         if (error instanceof Error && (
           error.message.includes('fetch') || 
           error.message.includes('timeout') ||
           error.message.includes('network')
         )) {
           console.warn('Network error detected, clearing session')
           await clearSession()
         } else {
           // 即使获取会话失败，也要设置加载完成状态
           setUser(null)
           setProfile(null)
           setLoading(false)
           setProfileLoading(false)
         }
       }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null
        setUser(currentUser)
        setLoading(false)

        if (currentUser?.id) {
          // 用户登录时加载 Profile
          await loadUserProfile(currentUser.id)
        } else {
          // 用户登出时清空 Profile
          setProfile(null)
          setProfileLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      profileLoading, 
      refreshProfile 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}