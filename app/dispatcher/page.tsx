"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { DispatcherConsole } from "@/components/dispatcher-console"

export default function DispatcherPage() {
  return (
    <ProtectedRoute allowedRoles={["dispatcher"]}>
      <DispatcherConsole />
    </ProtectedRoute>
  )
}
