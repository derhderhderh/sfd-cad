"use client"

import type React from "react"

import { useState } from "react"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { setUserRole } from "@/lib/auth-helpers"
import type { UserRole } from "@/lib/types"
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Label } from "./ui/label"
import { Input } from "./ui/input"
import { Alert, AlertDescription } from "./ui/alert"
import { UserPlus, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { Checkbox } from "./ui/checkbox"

interface FormData {
  email: string
  password: string
  displayName: string
  roles: UserRole[] // Changed from single role to array
  badge?: string
  unit?: string
}

export function UserManagementDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    displayName: "",
    roles: [], // Initialize as empty array
    badge: "",
    unit: "",
  })

  const handleRoleToggle = (role: UserRole) => {
    if (formData.roles.includes(role)) {
      setFormData({
        ...formData,
        roles: formData.roles.filter((r) => r !== role),
      })
    } else {
      setFormData({
        ...formData,
        roles: [...formData.roles, role],
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)

    if (!formData.email || !formData.password || !formData.displayName || formData.roles.length === 0) {
      setError("Please fill in all required fields and select at least one role")
      setLoading(false)
      return
    }

    try {
      console.log("[v0] Creating user with roles:", formData.roles)

      // Create the user account
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password)

      await setUserRole(userCredential.user.uid, formData.roles[0], formData.email, formData.displayName)

      const { ref, update } = await import("firebase/database")
      const { database } = await import("@/lib/firebase")
      const userRef = ref(database, `users/${userCredential.user.uid}`)

      const updateData: any = {
        roles: formData.roles, // Store all roles as array
        role: formData.roles[0], // Keep first role as default for backward compatibility
      }

      if (formData.badge) {
        updateData.badge = formData.badge
      }

      if (formData.unit) {
        updateData.unit = formData.unit
      }

      console.log("[v0] Updating user with data:", updateData)
      await update(userRef, updateData)

      console.log("[v0] User created successfully with roles:", formData.roles)

      // Sign out the newly created user (they were automatically signed in)
      await auth.signOut()

      setSuccess(true)
      setTimeout(() => {
        setOpen(false)
        setSuccess(false)
        setFormData({
          email: "",
          password: "",
          displayName: "",
          roles: [],
          badge: "",
          unit: "",
        })
      }, 2000)
    } catch (err: any) {
      console.error("[v0] User creation error:", err)
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered")
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters")
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address")
      } else {
        setError(`Failed to create user: ${err.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const hasFieldRole = formData.roles.some((r) => r === "officer" || r === "fire")

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Create User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Create login credentials for dispatchers, officers, firefighters, or supervisors.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@department.gov"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              placeholder="Minimum 6 characters"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name *</Label>
            <Input
              id="displayName"
              type="text"
              placeholder="John Doe"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label>Roles * (select one or more)</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="role-dispatcher"
                  checked={formData.roles.includes("dispatcher")}
                  onCheckedChange={() => handleRoleToggle("dispatcher")}
                  disabled={loading}
                />
                <label
                  htmlFor="role-dispatcher"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Dispatcher
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="role-officer"
                  checked={formData.roles.includes("officer")}
                  onCheckedChange={() => handleRoleToggle("officer")}
                  disabled={loading}
                />
                <label
                  htmlFor="role-officer"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Police Officer
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="role-fire"
                  checked={formData.roles.includes("fire")}
                  onCheckedChange={() => handleRoleToggle("fire")}
                  disabled={loading}
                />
                <label
                  htmlFor="role-fire"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Fire Department
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="role-supervisor"
                  checked={formData.roles.includes("supervisor")}
                  onCheckedChange={() => handleRoleToggle("supervisor")}
                  disabled={loading}
                />
                <label
                  htmlFor="role-supervisor"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Supervisor
                </label>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Users with multiple roles can select which role to use when logging in
            </p>
          </div>

          {hasFieldRole && (
            <>
              <div className="space-y-2">
                <Label htmlFor="badge">Badge Number</Label>
                <Input
                  id="badge"
                  type="text"
                  placeholder="1234"
                  value={formData.badge}
                  onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Unit Call Sign</Label>
                <Input
                  id="unit"
                  type="text"
                  placeholder="Unit-101"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  disabled={loading}
                />
              </div>
            </>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">User created successfully!</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create User"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
