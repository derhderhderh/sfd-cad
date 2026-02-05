"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { SupervisorPanel } from "@/components/supervisor-panel"

export default function SupervisorPage() {
  return (
    <ProtectedRoute allowedRoles={["supervisor"]}>
      <SupervisorPanel />
    </ProtectedRoute>
  )
}
