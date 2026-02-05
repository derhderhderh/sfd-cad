"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { getUserRoles } from "@/lib/auth-helpers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, Radio, Truck, Flame } from "lucide-react"
import type { UserRole } from "@/lib/types"

export default function SelectRolePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [roles, setRoles] = useState<UserRole[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    const loadRoles = async () => {
      console.log("[v0] Loading roles for user:", user.uid)
      const userRoles = await getUserRoles(user.uid)
      console.log("[v0] User roles retrieved:", userRoles)

      if (userRoles.length === 0) {
        console.log("[v0] No roles found, redirecting to unauthorized")
        router.push("/unauthorized")
      } else if (userRoles.length === 1) {
        console.log("[v0] Single role found, redirecting directly to:", userRoles[0])
        // If only one role, redirect directly
        redirectToRole(userRoles[0])
      } else {
        console.log("[v0] Multiple roles found, showing selection screen")
        setRoles(userRoles)
        setLoading(false)
      }
    }

    loadRoles()
  }, [user, router])

  const redirectToRole = (role: UserRole) => {
    console.log("[v0] Redirecting to role:", role)
    switch (role) {
      case "dispatcher":
        router.push("/dispatcher")
        break
      case "officer":
        router.push("/mdt")
        break
      case "fire":
        router.push("/mdt")
        break
      case "supervisor":
        router.push("/supervisor")
        break
      default:
        router.push("/unauthorized")
    }
  }

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case "dispatcher":
        return <Radio className="h-8 w-8" />
      case "officer":
        return <Shield className="h-8 w-8" />
      case "fire":
        return <Flame className="h-8 w-8" />
      case "supervisor":
        return <Truck className="h-8 w-8" />
    }
  }

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case "dispatcher":
        return "bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30"
      case "officer":
        return "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30"
      case "fire":
        return "bg-red-500/10 hover:bg-red-500/20 border-red-500/30"
      case "supervisor":
        return "bg-green-500/10 hover:bg-green-500/20 border-green-500/30"
    }
  }

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case "dispatcher":
        return "Dispatcher"
      case "officer":
        return "Police Officer"
      case "fire":
        return "Fire Department"
      case "supervisor":
        return "Supervisor"
    }
  }

  const getRoleDescription = (role: UserRole) => {
    switch (role) {
      case "dispatcher":
        return "Access dispatch console and manage incidents"
      case "officer":
        return "Access police MDT and respond to calls"
      case "fire":
        return "Access fire department MDT and respond to calls"
      case "supervisor":
        return "Access all systems and manage personnel"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading roles...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Select Your Role</h1>
          <p className="text-muted-foreground">Choose which system you want to access</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((role) => (
            <Card
              key={role}
              className={`cursor-pointer transition-all border-2 ${getRoleColor(role)}`}
              onClick={() => redirectToRole(role)}
            >
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4 text-primary">{getRoleIcon(role)}</div>
                <CardTitle className="text-xl">{getRoleLabel(role)}</CardTitle>
                <CardDescription>{getRoleDescription(role)}</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button className="w-full">Access {getRoleLabel(role)}</Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-6">
          <Button variant="outline" onClick={() => router.push("/login")}>
            Back to Login
          </Button>
        </div>
      </div>
    </div>
  )
}
