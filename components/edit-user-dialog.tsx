"use client"

import type React from "react"
import { useState } from "react"
import { ref, update } from "firebase/database"
import { database } from "@/lib/firebase"
import type { User, UserRole } from "@/lib/types"
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog"
import { Label } from "./ui/label"
import { Input } from "./ui/input"
import { Alert, AlertDescription } from "./ui/alert"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { Checkbox } from "./ui/checkbox"

interface EditUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User
  isSupervisor?: boolean
  onSuccess?: () => void
}

export function EditUserDialog({ open, onOpenChange, user, isSupervisor = false, onSuccess }: EditUserDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    displayName: user.displayName || "",
    email: user.email || "",
    password: "",
    roles: user.roles || [user.role], // Support both old single role and new multiple roles
    badge: user.badge || "",
    unit: user.unit || "",
  })

  const handleRoleToggle = (role: UserRole) => {
    const currentRoles = formData.roles || []
    if (currentRoles.includes(role)) {
      // Remove role if already selected
      setFormData({
        ...formData,
        roles: currentRoles.filter((r) => r !== role),
      })
    } else {
      // Add role
      setFormData({
        ...formData,
        roles: [...currentRoles, role],
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)

    if (isSupervisor && formData.roles.length === 0) {
      setError("Please select at least one role")
      setLoading(false)
      return
    }

    try {
      console.log("[v0] Updating user roles:", {
        uid: user.uid,
        roles: formData.roles,
        primaryRole: formData.roles[0],
      })

      // Update user data in database
      const updates: any = {
        displayName: formData.displayName,
        email: formData.email,
      }

      if (isSupervisor && formData.roles.length > 0) {
        updates.roles = formData.roles
        // Keep the first role as the default "role" for backward compatibility
        updates.role = formData.roles[0]
      }

      if (formData.badge) {
        updates.badge = formData.badge
      }

      if (formData.unit) {
        updates.unit = formData.unit
      }

      console.log("[v0] Database update payload:", updates)
      await update(ref(database, `users/${user.uid}`), updates)

      console.log("[v0] User updated successfully in database")

      // Password update is only available to supervisors
      if (isSupervisor && formData.password && formData.password.length >= 6) {
        // Note: This requires the user to be signed in as the target user
        // In production, you'd use Firebase Admin SDK on the backend
        console.log("[v0] Password update requested for user:", user.uid)
        // For now, we'll just log this - proper implementation needs backend
      }

      setSuccess(true)
      setTimeout(() => {
        onOpenChange(false)
        setSuccess(false)
        if (onSuccess) onSuccess()
      }, 1500)
    } catch (err: any) {
      console.error("[v0] User update error:", err)
      setError(`Failed to update user: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const hasFieldRole = formData.roles.some((r) => r === "officer" || r === "fire")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isSupervisor ? "Edit User" : "Edit Profile"}</DialogTitle>
          <DialogDescription>
            {isSupervisor ? "Update user information and permissions" : "Update your profile information"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={loading || !isSupervisor}
            />
            {!isSupervisor && (
              <p className="text-xs text-muted-foreground">Contact your supervisor to change your email</p>
            )}
          </div>

          {isSupervisor && (
            <>
              <div className="space-y-2">
                <Label htmlFor="password">New Password (optional)</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Leave blank to keep current password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  disabled={loading}
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground">Note: Password changes require backend implementation</p>
              </div>

              <div className="space-y-2">
                <Label>Roles (select one or more)</Label>
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
            </>
          )}

          {hasFieldRole && (
            <>
              <div className="space-y-2">
                <Label htmlFor="badge">Badge Number</Label>
                <Input
                  id="badge"
                  type="text"
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
              <AlertDescription className="text-green-800">Profile updated successfully!</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
