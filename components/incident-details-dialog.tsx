"use client"

import { useState } from "react"
import { ref, update, remove } from "firebase/database"
import { database } from "@/lib/firebase"
import { useAuth } from "./auth-provider"
import type { Incident, Unit } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Textarea } from "./ui/textarea"
import { ScrollArea } from "./ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Clock, MapPin, User, FileText, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog"

interface IncidentDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  incident: Incident
  units: Unit[]
  onAssignUnit: (incidentId: string, unitId: string) => void
}

export function IncidentDetailsDialog({
  open,
  onOpenChange,
  incident,
  units,
  onAssignUnit,
}: IncidentDetailsDialogProps) {
  const { user } = useAuth()
  const [note, setNote] = useState("")
  const [selectedUnit, setSelectedUnit] = useState("")
  const [editingStatus, setEditingStatus] = useState(incident.status)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const availableUnits = units.filter((u) => u.status === "available")

  const handleAddNote = async () => {
    if (!note.trim()) return

    const noteObj = {
      id: Date.now().toString(),
      text: note,
      authorId: user?.uid || "",
      authorName: user?.displayName || "Dispatcher",
      timestamp: Date.now(),
    }

    const updatedNotes = [...(incident.notes || []), noteObj]

    await update(ref(database, `incidents/${incident.id}`), {
      notes: updatedNotes,
      updatedAt: Date.now(),
    })

    setNote("")
  }

  const handleAssign = () => {
    if (selectedUnit) {
      onAssignUnit(incident.id, selectedUnit)
      setSelectedUnit("")
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    setEditingStatus(newStatus as any)
    await update(ref(database, `incidents/${incident.id}`), {
      status: newStatus,
      updatedAt: Date.now(),
    })
  }

  const handleDeleteIncident = async () => {
    await remove(ref(database, `incidents/${incident.id}`))
    setShowDeleteConfirm(false)
    onOpenChange(false)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-500 text-white"
      case "high":
        return "bg-orange-500 text-white"
      case "medium":
        return "bg-yellow-500 text-black"
      case "low":
        return "bg-green-500 text-white"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl">Incident Details</DialogTitle>
              <div className="flex items-center gap-2">
                <Badge className={getPriorityColor(incident.priority)}>{incident.priority}</Badge>
                <Select value={editingStatus} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="dispatched">Dispatched</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => setShowDeleteConfirm(true)}
                  title="Delete incident"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{incident.caseNumber}</p>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-6 pr-4">
              {/* Basic Info */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg text-foreground">{incident.type}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span className="text-foreground">{incident.location}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span className="text-foreground">Reported by: {incident.reportedBy}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span className="text-foreground">{new Date(incident.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-foreground">Description</h4>
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">{incident.description}</p>
              </div>

              {/* Assigned Units */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-foreground">Assigned Units</h4>
                {incident.assignedUnits && incident.assignedUnits.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {incident.assignedUnits.map((unitId) => {
                      const unit = units.find((u) => u.id === unitId)
                      return (
                        <Badge key={unitId} variant="secondary">
                          {unit?.callSign || unitId}
                        </Badge>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No units assigned</p>
                )}
              </div>

              {/* Assign Unit */}
              {availableUnits.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-foreground">Assign Unit</h4>
                  <div className="flex gap-2">
                    <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select a unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUnits.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.callSign} - {unit.officerName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleAssign} disabled={!selectedUnit}>
                      Assign
                    </Button>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notes
                </h4>
                {incident.notes && incident.notes.length > 0 ? (
                  <div className="space-y-2 mb-3">
                    {incident.notes.map((n) => (
                      <div key={n.id} className="bg-muted/50 p-3 rounded-md">
                        <p className="text-sm text-foreground">{n.text}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {n.authorName} • {new Date(n.timestamp).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mb-3">No notes added</p>
                )}
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Add a note..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    className="flex-1"
                  />
                  <Button onClick={handleAddNote} disabled={!note.trim()}>
                    Add Note
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Incident</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete incident {incident.caseNumber}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteIncident} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
