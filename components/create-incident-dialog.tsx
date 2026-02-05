"use client"

import type React from "react"

import { useState } from "react"
import { ref, push, set } from "firebase/database"
import { database } from "@/lib/firebase"
import { useAuth } from "./auth-provider"
import type { IncidentPriority, IncidentStatus } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"

interface CreateIncidentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateIncidentDialog({ open, onOpenChange }: CreateIncidentDialogProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    type: "",
    priority: "medium" as IncidentPriority,
    location: "",
    description: "",
    reportedBy: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const incidentRef = push(ref(database, "incidents"))
      const caseNumber = `CASE-${Date.now().toString().slice(-6)}`

      await set(incidentRef, {
        id: incidentRef.key,
        caseNumber,
        type: formData.type,
        priority: formData.priority,
        status: "pending" as IncidentStatus,
        location: formData.location,
        description: formData.description,
        reportedBy: formData.reportedBy,
        assignedUnits: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        dispatcherId: user?.uid || "",
      })

      // Log activity
      const logRef = push(ref(database, "activityLogs"))
      await set(logRef, {
        id: logRef.key,
        timestamp: Date.now(),
        userId: user?.uid || "",
        userName: user?.displayName || "Dispatcher",
        action: "incident_created",
        details: `Created incident ${caseNumber} - ${formData.type}`,
        incidentId: incidentRef.key,
      })

      setFormData({
        type: "",
        priority: "medium",
        location: "",
        description: "",
        reportedBy: "",
      })
      onOpenChange(false)
    } catch (error) {
      console.error("[v0] Error creating incident:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Incident</DialogTitle>
          <DialogDescription>Enter the details for the new incident report.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Incident Type</Label>
              <Input
                id="type"
                placeholder="e.g. Traffic Stop, Burglary, Medical"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value as IncidentPriority })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="Street address or intersection"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reportedBy">Reported By</Label>
            <Input
              id="reportedBy"
              placeholder="Name or phone number"
              value={formData.reportedBy}
              onChange={(e) => setFormData({ ...formData, reportedBy: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Detailed description of the incident"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Incident"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
