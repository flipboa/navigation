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

  // 加载用户 Profile 的函数
  const loadUserProfile = async (userId: string) => {
    setProfileLoading(true)
    try {
      const userProfile = await getUserProfile(userId)
      setProfile(userProfile)
    } catch (error) {
      console.error('Failed to load user profile:', error)
      setProfile(null)
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
      const { data: { session } } = await supabase.auth.getSession()
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