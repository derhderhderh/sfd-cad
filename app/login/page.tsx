"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { getUserRoles } from "@/lib/auth-helpers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      console.log("[v0] User authenticated:", userCredential.user.uid)

      const roles = await getUserRoles(userCredential.user.uid)
      console.log("[v0] User roles retrieved:", roles)

      if (!roles || roles.length === 0) {
        setError("User role not configured. Contact your administrator.")
        await auth.signOut()
        return
      }

      if (roles.length > 1) {
        router.push("/select-role")
        return
      }

      // Single role - redirect directly
      const role = roles[0]
      switch (role) {
        case "dispatcher":
          router.push("/dispatcher")
          break
        case "officer":
        case "fire":
          router.push("/mdt")
          break
        case "supervisor":
          router.push("/supervisor")
          break
        default:
          setError("Invalid user role")
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to login"
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/50 shadow-xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <div className="h-10 w-10 rounded-full bg-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">RAPID: CAD/MDT</CardTitle>
          <CardDescription className="text-center">Sign in to access emergency services dispatch</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="officer@department.gov"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-md">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
