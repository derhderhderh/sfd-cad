"use client"

import { useState, useEffect, useMemo } from "react"
import { ref, onValue, remove, get, push, set } from "firebase/database"
import { database, auth } from "@/lib/firebase"
import { useAuth } from "./auth-provider"
import type { Incident, Unit, ActivityLog, User } from "@/lib/types"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { ScrollArea } from "./ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { LogOut, Shield, Activity, Users, AlertCircle, TrendingUp, Clock, MonitorSmartphone } from "lucide-react"
import { useRouter } from "next/navigation"
import { UserManagementDialog } from "./user-management-dialog"
import { DispatcherConsole } from "./dispatcher-console"
import { OfficerMDT } from "./officer-mdt"
import { EditUserDialog } from "./edit-user-dialog"
import { Edit2, Trash2 } from "lucide-react"

export function SupervisorPanel() {
  const { user } = useAuth()
  const router = useRouter()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [systemUsers, setSystemUsers] = useState<User[]>([])
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)

  useEffect(() => {
    // Listen for incidents
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

    // Listen for units
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

    // Listen for activity logs
    const logsRef = ref(database, "activityLogs")
    const unsubscribeLogs = onValue(logsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const logsList = Object.values(data) as ActivityLog[]
        setActivityLogs(logsList.sort((a, b) => b.timestamp - a.timestamp))
      } else {
        setActivityLogs([])
      }
    })

    const usersRef = ref(database, "users")
    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const usersList = Object.values(data) as User[]
        setSystemUsers(usersList)
      } else {
        setSystemUsers([])
      }
    })

    return () => {
      unsubscribeIncidents()
      unsubscribeUnits()
      unsubscribeLogs()
      unsubscribeUsers()
    }
  }, [])

  const stats = useMemo(() => {
    const activeIncidents = incidents.filter((i) => i.status !== "closed")
    const criticalIncidents = activeIncidents.filter((i) => i.priority === "critical")
    const highPriorityIncidents = activeIncidents.filter((i) => i.priority === "high")
    const availableUnits = units.filter((u) => u.status === "available")
    const busyUnits = units.filter((u) => u.status === "busy" || u.status === "enroute" || u.status === "on-scene")

    // Response time calculation (mock - would be calculated from actual timestamps)
    const avgResponseTime = "8m 23s"

    return {
      total: incidents.length,
      active: activeIncidents.length,
      critical: criticalIncidents.length,
      highPriority: highPriorityIncidents.length,
      availableUnits: availableUnits.length,
      busyUnits: busyUnits.length,
      totalUnits: units.length,
      avgResponseTime,
    }
  }, [incidents, units])

  const handleLogout = async () => {
    await auth.signOut()
    router.push("/login")
  }

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return
    }

    try {
      await remove(ref(database, `users/${userId}`))

      // Also remove their unit if they have one
      const unitsRef = ref(database, "units")
      const unitsSnapshot = await get(unitsRef)
      if (unitsSnapshot.exists()) {
        const units = unitsSnapshot.val()
        Object.keys(units).forEach(async (unitId) => {
          if (units[unitId].officerId === userId) {
            await remove(ref(database, `units/${unitId}`))
          }
        })
      }

      // Log the deletion
      const logRef = push(ref(database, "activityLogs"))
      await set(logRef, {
        id: logRef.key,
        timestamp: Date.now(),
        userId: user?.uid || "",
        userName: user?.displayName || "Supervisor",
        action: "user_deleted",
        details: `Deleted user account`,
      })

      setDeletingUser(null)
    } catch (err) {
      console.error("[v0] Error deleting user:", err)
      alert("Failed to delete user")
    }
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">RAPID: CAD/MDT for scarb - Supervisor Panel</h1>
              <p className="text-sm text-muted-foreground">{user?.displayName || user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-muted-foreground">Monitoring Active</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto p-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Active Incidents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.active}</div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="destructive" className="text-xs">
                  {stats.critical} Critical
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {stats.highPriority} High
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Unit Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {stats.availableUnits}/{stats.totalUnits}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {stats.availableUnits} Available, {stats.busyUnits} In Field
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Avg Response Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.avgResponseTime}</div>
              <div className="flex items-center gap-1 mt-2 text-green-500 text-sm">
                <TrendingUp className="h-3 w-3" />
                <span>12% faster</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Total Incidents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.total}</div>
              <p className="text-sm text-muted-foreground mt-2">Last 24 hours</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="cad">
              <MonitorSmartphone className="h-4 w-4 mr-2" />
              CAD Console
            </TabsTrigger>
            <TabsTrigger value="mdt">
              <MonitorSmartphone className="h-4 w-4 mr-2" />
              MDT View
            </TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Incidents List */}
              <Card>
                <CardHeader>
                  <CardTitle>All Incidents</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-28rem)]">
                    <div className="space-y-3">
                      {incidents.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">No incidents recorded</div>
                      ) : (
                        incidents.map((incident) => (
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
                              <p className="text-sm text-muted-foreground mb-2">{incident.location}</p>
                              <p className="text-xs text-muted-foreground">
                                Created: {new Date(incident.createdAt).toLocaleString()}
                              </p>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Selected Incident Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Incident Details</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedIncident ? (
                    <ScrollArea className="h-[calc(100vh-28rem)]">
                      <div className="space-y-4 pr-4">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold text-foreground">{selectedIncident.type}</h3>
                            <div className="flex items-center gap-2">
                              <Badge className={getPriorityColor(selectedIncident.priority)}>
                                {selectedIncident.priority}
                              </Badge>
                              <Badge variant="outline">{selectedIncident.status}</Badge>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{selectedIncident.caseNumber}</p>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium text-foreground">Location:</span>
                            <p className="text-muted-foreground">{selectedIncident.location}</p>
                          </div>
                          <div>
                            <span className="font-medium text-foreground">Reported By:</span>
                            <p className="text-muted-foreground">{selectedIncident.reportedBy}</p>
                          </div>
                          <div>
                            <span className="font-medium text-foreground">Description:</span>
                            <p className="text-muted-foreground">{selectedIncident.description}</p>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium text-foreground mb-2">Assigned Units</h4>
                          {selectedIncident.assignedUnits && selectedIncident.assignedUnits.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {selectedIncident.assignedUnits.map((unitId) => {
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

                        {selectedIncident.notes && selectedIncident.notes.length > 0 && (
                          <div>
                            <h4 className="font-medium text-foreground mb-2">Notes</h4>
                            <div className="space-y-2">
                              {selectedIncident.notes.map((note) => (
                                <div key={note.id} className="bg-muted/50 p-3 rounded-md">
                                  <p className="text-sm text-foreground">{note.text}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {note.authorName} • {new Date(note.timestamp).toLocaleString()}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="h-[calc(100vh-28rem)] flex items-center justify-center">
                      <p className="text-muted-foreground">Select an incident to view details</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Unit Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {units.map((unit) => (
                        <Card key={unit.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className="font-semibold text-foreground">{unit.callSign}</h3>
                                <p className="text-sm text-muted-foreground">{unit.officerName}</p>
                              </div>
                              <div className={`h-3 w-3 rounded-full ${getStatusColor(unit.status)}`} />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Status:</span>
                                <Badge variant="outline" className="text-xs">
                                  {unit.status}
                                </Badge>
                              </div>
                              {unit.assignedIncident && (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Assigned:</span>
                                  <span className="text-foreground text-xs">
                                    {incidents.find((i) => i.id === unit.assignedIncident)?.caseNumber || "Unknown"}
                                  </span>
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground pt-2">
                                Last update: {new Date(unit.lastUpdate).toLocaleTimeString()}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-2">
                      {activityLogs.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">No activity logged</div>
                      ) : (
                        activityLogs.slice(0, 20).map((log) => (
                          <div key={log.id} className="border-l-2 border-primary pl-4 py-3 bg-muted/30 rounded-r">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-foreground">{log.details}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-muted-foreground">{log.userName}</span>
                                  <span className="text-xs text-muted-foreground">•</span>
                                  <span className="text-xs text-muted-foreground">{log.action.replace(/_/g, " ")}</span>
                                </div>
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                                {new Date(log.timestamp).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="cad">
            <DispatcherConsole />
          </TabsContent>

          <TabsContent value="mdt">
            <OfficerMDT />
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>System Users & Access Control</CardTitle>
                <UserManagementDialog />
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-24rem)]">
                  <div className="space-y-3">
                    {systemUsers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">No users found</div>
                    ) : (
                      systemUsers.map((systemUser) => (
                        <Card key={systemUser.uid}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-semibold text-foreground">{systemUser.displayName}</h3>
                                  {systemUser.roles && systemUser.roles.length > 0 ? (
                                    systemUser.roles.map((role) => (
                                      <Badge key={role} variant="outline" className="capitalize">
                                        {role}
                                      </Badge>
                                    ))
                                  ) : (
                                    <Badge variant="outline" className="capitalize">
                                      {systemUser.role}
                                    </Badge>
                                  )}
                                  {systemUser.uid === user?.uid && (
                                    <Badge variant="secondary" className="text-xs">
                                      You
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mb-1">{systemUser.email}</p>
                                {systemUser.badge && (
                                  <p className="text-xs text-muted-foreground">Badge: {systemUser.badge}</p>
                                )}
                                {systemUser.unit && (
                                  <p className="text-xs text-muted-foreground">Unit: {systemUser.unit}</p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setEditingUser(systemUser)}>
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                {systemUser.uid !== user?.uid && (
                                  <Button variant="outline" size="sm" onClick={() => handleDeleteUser(systemUser.uid)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {editingUser && (
        <EditUserDialog
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          user={editingUser}
          isSupervisor={true}
          onSuccess={() => setEditingUser(null)}
        />
      )}
    </div>
  )
}
