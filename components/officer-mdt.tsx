"use client"

import { useState, useEffect } from "react"
import { ref, onValue, update, set, push } from "firebase/database"
import { database, auth } from "@/lib/firebase"
import { useAuth } from "./auth-provider"
import type { Incident, Unit, UnitStatus, User } from "@/lib/types"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { ScrollArea } from "./ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { LogOut, Radio, AlertCircle, MapPin, Clock, FileText, Edit2, Settings } from "lucide-react"
import { useRouter } from "next/navigation"
import { Textarea } from "./ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { EditUserDialog } from "./edit-user-dialog"

export function OfficerMDT() {
  const { user } = useAuth()
  const router = useRouter()
  const [myUnit, setMyUnit] = useState<Unit | null>(null)
  const [userData, setUserData] = useState<User | null>(null)
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [assignedIncidents, setAssignedIncidents] = useState<Incident[]>([])
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [note, setNote] = useState("")
  const [isEditingCallsign, setIsEditingCallsign] = useState(false)
  const [newCallSign, setNewCallSign] = useState("")
  const [isEditingProfile, setIsEditingProfile] = useState(false)

  useEffect(() => {
    if (!user) return

    console.log("[v0] User authenticated:", user.uid)

    const userRef = ref(database, `users/${user.uid}`)
    const unsubscribeUser = onValue(userRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setUserData(data as User)
        console.log("[v0] User role retrieved:", data.role)
      }
    })

    const unitsRef = ref(database, "units")
    const unsubscribeUnits = onValue(unitsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const unitsList = Object.values(data) as Unit[]
        const myUnitData = unitsList.find((u) => u.officerId === user.uid)
        console.log("[v0] Units found:", unitsList.length, "My unit:", myUnitData?.callSign || "none")
        setMyUnit(myUnitData || null)
      } else {
        console.log("[v0] No units in database")
        setMyUnit(null)
      }
    })

    const incidentsRef = ref(database, "incidents")
    const unsubscribeIncidents = onValue(incidentsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const incidentsList = Object.values(data) as Incident[]
        setIncidents(incidentsList.filter((i) => i.status !== "closed"))

        if (myUnit) {
          const assigned = incidentsList.filter(
            (i) => i.assignedUnits && i.assignedUnits.includes(myUnit.id) && i.status !== "closed",
          )
          setAssignedIncidents(assigned)
          if (assigned.length > 0 && !selectedIncident) {
            setSelectedIncident(assigned[0])
          }
        }
      } else {
        setIncidents([])
        setAssignedIncidents([])
      }
    })

    return () => {
      unsubscribeUser()
      unsubscribeUnits()
      unsubscribeIncidents()
    }
  }, [user, myUnit])

  const handleSaveCallSign = async () => {
    if (!user || !newCallSign.trim()) return

    const unitId = myUnit?.id || `unit-${user.uid}`
    const unitData: Unit = {
      id: unitId,
      callSign: newCallSign.trim(),
      officerId: user.uid,
      officerName: user.displayName || user.email || "Officer",
      status: myUnit?.status || "available",
      lastUpdate: Date.now(),
    }

    await set(ref(database, `units/${unitId}`), unitData)

    const logRef = push(ref(database, "activityLogs"))
    await set(logRef, {
      id: logRef.key,
      timestamp: Date.now(),
      userId: user.uid,
      userName: user.displayName || newCallSign.trim(),
      action: myUnit ? "callsign_updated" : "unit_created",
      details: `${myUnit ? "Updated" : "Created"} callsign to ${newCallSign.trim()}`,
      unitId,
    })

    setIsEditingCallsign(false)
    setNewCallSign("")
  }

  const handleStatusChange = async (newStatus: UnitStatus) => {
    if (!myUnit) return

    await update(ref(database, `units/${myUnit.id}`), {
      status: newStatus,
      lastUpdate: Date.now(),
    })

    const logRef = push(ref(database, "activityLogs"))
    await set(logRef, {
      id: logRef.key,
      timestamp: Date.now(),
      userId: user?.uid || "",
      userName: user?.displayName || myUnit.callSign,
      action: "status_change",
      details: `${myUnit.callSign} changed status to ${newStatus}`,
      unitId: myUnit.id,
    })
  }

  const handleAddNote = async () => {
    if (!note.trim() || !selectedIncident) return

    const authorName = myUnit?.callSign || user?.displayName || user?.email || "Unknown"

    const noteObj = {
      id: Date.now().toString(),
      text: note,
      authorId: user?.uid || "",
      authorName,
      timestamp: Date.now(),
    }

    const updatedNotes = [...(selectedIncident.notes || []), noteObj]

    await update(ref(database, `incidents/${selectedIncident.id}`), {
      notes: updatedNotes,
      updatedAt: Date.now(),
    })

    const logRef = push(ref(database, "activityLogs"))
    await set(logRef, {
      id: logRef.key,
      timestamp: Date.now(),
      userId: user?.uid || "",
      userName: authorName,
      action: "note_added",
      details: `${authorName} added note to ${selectedIncident.caseNumber}`,
      incidentId: selectedIncident.id,
      unitId: myUnit?.id,
    })

    setNote("")
  }

  const handleLogout = async () => {
    await auth.signOut()
    router.push("/login")
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
        return "text-green-500"
      case "busy":
        return "text-yellow-500"
      case "enroute":
        return "text-blue-500"
      case "on-scene":
        return "text-orange-500"
      case "off-duty":
        return "text-muted-foreground"
      default:
        return "text-muted-foreground"
    }
  }

  const getDepartmentColor = () => {
    if (userData?.role === "fire") {
      return {
        primary: "text-red-600",
        bg: "bg-red-600",
        border: "border-red-600",
      }
    }
    return {
      primary: "text-blue-600",
      bg: "bg-blue-600",
      border: "border-blue-600",
    }
  }

  const departmentColors = getDepartmentColor()
  const departmentName = userData?.role === "fire" ? "Fire Department" : "Police Department"

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className={`border-b-2 ${departmentColors.border} bg-card`}>
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Radio className={`h-6 w-6 ${departmentColors.primary}`} />
            <div>
              <h1 className={`text-xl font-bold ${departmentColors.primary}`}>RAPID: Emergency Services MDT</h1>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  {myUnit ? myUnit.callSign : "No Unit"} - {user?.displayName || user?.email}
                </p>
                <Dialog open={isEditingCallsign} onOpenChange={setIsEditingCallsign}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => {
                        setNewCallSign(myUnit?.callSign || "")
                        setIsEditingCallsign(true)
                      }}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{myUnit ? "Edit Callsign" : "Create Unit"}</DialogTitle>
                      <DialogDescription>
                        {myUnit
                          ? "Update your unit callsign"
                          : "Create your unit by setting a callsign (e.g., UNIT-301, ENGINE-1)"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="callsign">Callsign</Label>
                        <Input
                          id="callsign"
                          placeholder="Enter callsign..."
                          value={newCallSign}
                          onChange={(e) => setNewCallSign(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSaveCallSign()
                            }
                          }}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsEditingCallsign(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveCallSign} disabled={!newCallSign.trim()}>
                        {myUnit ? "Update" : "Create"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {myUnit && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Select value={myUnit.status} onValueChange={(value) => handleStatusChange(value as UnitStatus)}>
                  <SelectTrigger className="w-32">
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
            )}
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

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-6">
        {/* Left Column - Incidents List */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                {myUnit ? "Assignments" : "Active Incidents"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={myUnit ? "assigned" : "all"}>
                {myUnit && (
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="assigned">My Calls ({assignedIncidents.length})</TabsTrigger>
                    <TabsTrigger value="all">All Active ({incidents.length})</TabsTrigger>
                  </TabsList>
                )}
                {myUnit && (
                  <TabsContent value="assigned">
                    <ScrollArea className="h-[calc(100vh-20rem)]">
                      <div className="space-y-3">
                        {assignedIncidents.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">No assigned incidents</div>
                        ) : (
                          assignedIncidents.map((incident) => (
                            <Card
                              key={incident.id}
                              className={`cursor-pointer transition-colors ${
                                selectedIncident?.id === incident.id ? "border-primary" : "hover:bg-accent"
                              }`}
                              onClick={() => setSelectedIncident(incident)}
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
                                <p className="text-sm text-muted-foreground">{incident.location}</p>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                )}
                <TabsContent value="all">
                  <ScrollArea className="h-[calc(100vh-20rem)]">
                    <div className="space-y-3">
                      {incidents.map((incident) => (
                        <Card
                          key={incident.id}
                          className="cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => setSelectedIncident(incident)}
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
                            <p className="text-sm text-muted-foreground">{incident.location}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Incident Details */}
        <div className="space-y-4">
          {selectedIncident ? (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Incident Details</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(selectedIncident.priority)}>{selectedIncident.priority}</Badge>
                      <Badge variant="outline">{selectedIncident.status}</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedIncident.caseNumber}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg text-foreground mb-3">{selectedIncident.type}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <span className="text-foreground">{selectedIncident.location}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <span className="text-foreground">{new Date(selectedIncident.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-foreground">Description</h4>
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                      {selectedIncident.description}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-foreground">Reported By</h4>
                    <p className="text-sm text-foreground">{selectedIncident.reportedBy}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Field Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedIncident.notes && selectedIncident.notes.length > 0 ? (
                    <ScrollArea className="h-48">
                      <div className="space-y-2 pr-4">
                        {selectedIncident.notes.map((n) => (
                          <div key={n.id} className="bg-muted/50 p-3 rounded-md">
                            <p className="text-sm text-foreground">{n.text}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {n.authorName} • {new Date(n.timestamp).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <p className="text-sm text-muted-foreground">No notes added</p>
                  )}
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Add a field note..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                    />
                    <Button onClick={handleAddNote} disabled={!note.trim()} className="w-full">
                      Add Note
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Select an incident to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Profile Edit Dialog */}
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
