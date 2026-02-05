"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { OfficerMDT } from "@/components/officer-mdt"

export default function MDTPage() {
  return (
    <ProtectedRoute allowedRoles={["officer", "fire"]}>
      <OfficerMDT />
    </ProtectedRoute>
  )
}
