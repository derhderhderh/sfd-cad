"use client"

import { useState, useEffect } from "react"
import { ref, onValue, push, update, set, remove } from "firebase/database"
import { database, auth } from "@/lib/firebase"
import { useAuth } from "./auth-provider"
import type { Incident, Unit, ActivityLog, UnitStatus, User } from "@/lib/types"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { ScrollArea } from "./ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { CreateIncidentDialog } from "./create-incident-dialog"
import { IncidentDetailsDialog } from "./incident-details-dialog"
import { LogOut, Radio, AlertCircle, Users, Activity, Edit2, Trash2, Plus, Settings } from "lucide-react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { Label } from "./ui/label"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { EditUserDialog } from "./edit-user-dialog"

export function DispatcherConsole() {
  const { user } = useAuth()
  const router = useRouter()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
  const [editCallSign, setEditCallSign] = useState("")
  const [editStatus, setEditStatus] = useState<UnitStatus>("available")
  const [showCreateTempUnit, setShowCreateTempUnit] = useState(false)
  const [tempUnitCallSign, setTempUnitCallSign] = useState("")
  const [tempUnitOfficerName, setTempUnitOfficerName] = useState("")
  const [tempUnitDepartment, setTempUnitDepartment] = useState<"police" | "fire">("police")
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [userData, setUserData] = useState<User | null>(null)

  useEffect(() => {
    if (user) {
      const userRef = ref(database, `users/${user.uid}`)
      const unsubscribeUser = onValue(userRef, (snapshot) => {
        const data = snapshot.val()
        if (data) {
          setUserData(data as User)
        }
      })

      return () => {
        unsubscribeUser()
      }
    }
  }, [user])

  useEffect(() => {
    const incidentsRef = ref(database, "incidents")
    const unsubscribeIncidents = onValue(incidentsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const incidentsList = Object.values(data) as Incident[]
        setIncidents(incidentsList.sort((a, b) => b.createdAt - a.createdAt))
      } else {
        setIncidents([])
      }
    })

    const unitsRef = ref(database, "units")
    const unsubscribeUnits = onValue(unitsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const unitsList = Object.values(data) as Unit[]
        setUnits(unitsList)
      } else {
        setUnits([])
      }
    })

    const logsRef = ref(database, "activityLogs")
    const unsubscribeLogs = onValue(logsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const logsList = Object.values(data) as ActivityLog[]
        setActivityLogs(logsList.sort((a, b) => b.timestamp - a.createdAt).slice(0, 50))
      } else {
        setActivityLogs([])
      }
    })

    return () => {
      unsubscribeIncidents()
      unsubscribeUnits()
      unsubscribeLogs()
    }
  }, [])

  const handleLogout = async () => {
    await auth.signOut()
    router.push("/login")
  }

  const handleIncidentClick = (incident: Incident) => {
    setSelectedIncident(incident)
    setShowDetailsDialog(true)
  }

  const handleAssignUnit = async (incidentId: string, unitId: string) => {
    const incident = incidents.find((i) => i.id === incidentId)
    const unit = units.find((u) => u.id === unitId)

    if (!incident || !unit) return

    const updatedAssignedUnits = [...(incident.assignedUnits || []), unitId]

    await update(ref(database, `incidents/${incidentId}`), {
      assignedUnits: updatedAssignedUnits,
      status: "dispatched",
      updatedAt: Date.now(),
    })

    await update(ref(database, `units/${unitId}`), {
      status: "enroute",
      assignedIncident: incidentId,
      lastUpdate: Date.now(),
    })

    const logRef = push(ref(database, "activityLogs"))
    await set(logRef, {
      id: logRef.key,
      timestamp: Date.now(),
      userId: user?.uid || "",
      userName: user?.displayName || "Dispatcher",
      action: "unit_assigned",
      details: `${unit.callSign} assigned to ${incident.caseNumber}`,
      incidentId,
      unitId,
    })
  }

  const handleEditUnit = (unit: Unit) => {
    setEditingUnit(unit)
    setEditCallSign(unit.callSign)
    setEditStatus(unit.status)
  }

  const handleSaveUnitEdit = async () => {
    if (!editingUnit) return

    await update(ref(database, `units/${editingUnit.id}`), {
      callSign: editCallSign,
      status: editStatus,
      lastUpdate: Date.now(),
    })

    const logRef = push(ref(database, "activityLogs"))
    await set(logRef, {
      id: logRef.key,
      timestamp: Date.now(),
      userId: user?.uid || "",
      userName: user?.displayName || "Dispatcher",
      action: "unit_edited",
      details: `Updated ${editingUnit.callSign} - CallSign: ${editCallSign}, Status: ${editStatus}`,
      unitId: editingUnit.id,
    })

    setEditingUnit(null)
  }

  const handleCreateTempUnit = async () => {
    if (!tempUnitCallSign || !tempUnitOfficerName) return

    const unitRef = push(ref(database, "units"))
    await set(unitRef, {
      id: unitRef.key,
      callSign: tempUnitCallSign,
      officerName: tempUnitOfficerName,
      status: "available",
      department: tempUnitDepartment,
      isTemporary: true,
      lastUpdate: Date.now(),
    })

    const logRef = push(ref(database, "activityLogs"))
    await set(logRef, {
      id: logRef.key,
      timestamp: Date.now(),
      userId: user?.uid || "",
      userName: user?.displayName || "Dispatcher",
      action: "temp_unit_created",
      details: `Created temporary unit ${tempUnitCallSign} - ${tempUnitOfficerName}`,
      unitId: unitRef.key,
    })

    setTempUnitCallSign("")
    setTempUnitOfficerName("")
    setTempUnitDepartment("police")
    setShowCreateTempUnit(false)
  }

  const handleDeleteTempUnit = async (unit: Unit) => {
    if (!unit.isTemporary) return

    await remove(ref(database, `units/${unit.id}`))

    if (unit.assignedIncident) {
      const incident = incidents.find((i) => i.id === unit.assignedIncident)
      if (incident) {
        const updatedAssignedUnits = incident.assignedUnits.filter((id) => id !== unit.id)
        await update(ref(database, `incidents/${unit.assignedIncident}`), {
          assignedUnits: updatedAssignedUnits,
        })
      }
    }

    const logRef = push(ref(database, "activityLogs"))
    await set(logRef, {
      id: logRef.key,
      timestamp: Date.now(),
      userId: user?.uid || "",
      userName: user?.displayName || "Dispatcher",
      action: "temp_unit_deleted",
      details: `Removed temporary unit ${unit.callSign} - ${unit.officerName}`,
      unitId: unit.id,
    })
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-500"
      case "busy":
        return "bg-yellow-500"
      case "enroute":
        return "bg-blue-500"
      case "on-scene":
        return "bg-orange-500"
      case "off-duty":
        return "bg-muted"
      default:
        return "bg-muted"
    }
  }

  const activeIncidents = incidents.filter((i) => i.status !== "closed")
  const availableUnits = units.filter((u) => u.status === "available")

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Radio className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">RAPID: CAD/MDT for Scarb - Dispatcher Console</h1>
              <p className="text-sm text-muted-foreground">{user?.displayName || user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-muted-foreground">System Online</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsEditingProfile(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Profile
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Active Incidents ({activeIncidents.length})
              </CardTitle>
              <Button onClick={() => setShowCreateDialog(true)}>Create Incident</Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-16rem)]">
                <div className="space-y-3">
                  {activeIncidents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No active incidents</div>
                  ) : (
                    activeIncidents.map((incident) => (
                      <Card
                        key={incident.id}
                        className="cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => handleIncidentClick(incident)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge className={getPriorityColor(incident.priority)}>{incident.priority}</Badge>
                              <Badge variant="outline">{incident.status}</Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">{incident.caseNumber}</span>
                          </div>
                          <h3 className="font-semibold text-foreground mb-1">{incident.type}</h3>
                          <p className="text-sm text-muted-foreground mb-2">{incident.location}</p>
                          <p className="text-sm text-foreground line-clamp-2">{incident.description}</p>
                          {incident.assignedUnits && incident.assignedUnits.length > 0 && (
                            <div className="mt-3 flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-muted-foreground">Assigned:</span>
                              {incident.assignedUnits.map((unitId) => {
                                const unit = units.find((u) => u.id === unitId)
                                return (
                                  <Badge key={unitId} variant="secondary" className="text-xs">
                                    {unit?.callSign || unitId}
                                  </Badge>
                                )
                              })}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Units ({units.length})
                </CardTitle>
                <Button size="sm" onClick={() => setShowCreateTempUnit(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Temp Unit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="available">Available ({availableUnits.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="all">
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {units.map((unit) => (
                        <div key={unit.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${getStatusColor(unit.status)}`} />
                            <div>
                              <p className="text-sm font-medium text-foreground flex items-center gap-1">
                                {unit.callSign}
                                {unit.isTemporary && (
                                  <Badge variant="outline" className="text-xs">
                                    TEMP
                                  </Badge>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">{unit.officerName}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {unit.status}
                            </Badge>
                            <Button variant="ghost" size="sm" onClick={() => handleEditUnit(unit)}>
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            {unit.isTemporary && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteTempUnit(unit)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="available">
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {availableUnits.map((unit) => (
                        <div key={unit.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${getStatusColor(unit.status)}`} />
                            <div>
                              <p className="text-sm font-medium text-foreground flex items-center gap-1">
                                {unit.callSign}
                                {unit.isTemporary && (
                                  <Badge variant="outline" className="text-xs">
                                    TEMP
                                  </Badge>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">{unit.officerName}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="text-xs border-l-2 border-primary pl-3 py-2">
                      <p className="text-foreground font-medium">{log.details}</p>
                      <p className="text-muted-foreground">
                        {log.userName} • {new Date(log.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      <CreateIncidentDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
      {selectedIncident && (
        <IncidentDetailsDialog
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
          incident={selectedIncident}
          units={units}
          onAssignUnit={handleAssignUnit}
        />
      )}

      <Dialog open={!!editingUnit} onOpenChange={() => setEditingUnit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Unit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="callsign">Call Sign</Label>
              <Input
                id="callsign"
                value={editCallSign}
                onChange={(e) => setEditCallSign(e.target.value)}
                placeholder="Unit-101"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Availability Status</Label>
              <Select value={editStatus} onValueChange={(value) => setEditStatus(value as UnitStatus)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="busy">Busy</SelectItem>
                  <SelectItem value="enroute">En Route</SelectItem>
                  <SelectItem value="on-scene">On Scene</SelectItem>
                  <SelectItem value="off-duty">Off Duty</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditingUnit(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveUnitEdit}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateTempUnit} onOpenChange={setShowCreateTempUnit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Temporary Unit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="temp-callsign">Call Sign</Label>
              <Input
                id="temp-callsign"
                value={tempUnitCallSign}
                onChange={(e) => setTempUnitCallSign(e.target.value)}
                placeholder="Unit-101"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="temp-officer">Officer Name</Label>
              <Input
                id="temp-officer"
                value={tempUnitOfficerName}
                onChange={(e) => setTempUnitOfficerName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="temp-dept">Department</Label>
              <Select
                value={tempUnitDepartment}
                onValueChange={(value) => setTempUnitDepartment(value as "police" | "fire")}
              >
                <SelectTrigger id="temp-dept">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="police">Police</SelectItem>
                  <SelectItem value="fire">Fire Department</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCreateTempUnit(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTempUnit}>Create Unit</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {userData && (
        <EditUserDialog
          open={isEditingProfile}
          onOpenChange={setIsEditingProfile}
          user={{ ...userData, uid: user?.uid || "", email: user?.email || "" }}
          isSupervisor={false}
          onSuccess={() => setIsEditingProfile(false)}
        />
      )}
    </div>
  )
}
