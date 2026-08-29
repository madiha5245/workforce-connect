import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, UserRole } from '@/types'

interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  loading: boolean
  signUp: (email: string, password: string, role: UserRole, fullName: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<Profile>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Failed to load profile:', error.message)
      return null
    }
    const loadedProfile = data as Profile | null
    setProfile(loadedProfile)
    return loadedProfile
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        loadProfile(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        (async () => {
          await loadProfile(session.user.id)
          setLoading(false)
        })()
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signUp(email: string, password: string, role: UserRole, fullName: string) {
    if (role !== 'WORKER' && role !== 'EMPLOYER') {
      throw new Error('Signup is limited to worker and employer accounts')
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role, full_name: fullName },
      },
    })
    if (error) throw error
  }

  async function signIn(email: string, password: string): Promise<Profile> {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setLoading(false)
      throw error
    }

    if (!data.session?.user) {
      setLoading(false)
      throw new Error('Sign-in completed without an active session')
    }

    setSession(data.session)
    const loadedProfile = await loadProfile(data.session.user.id)
    setLoading(false)

    if (!loadedProfile) {
      throw new Error('Unable to load your profile after sign-in')
    }

    return loadedProfile
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
