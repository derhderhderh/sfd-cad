"use client"

import type React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "./auth-provider"
import type { UserRole } from "@/lib/types"

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles: UserRole[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  const hasAccess =
    user &&
    Array.isArray(user.roles) &&
    user.roles.some((role: UserRole) => allowedRoles.includes(role))

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login")
      } else if (!hasAccess) {
        router.push("/unauthorized")
      }
    }
  }, [user, loading, hasAccess, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user || !hasAccess) {
    return null
  }

  return <>{children}</>
}
