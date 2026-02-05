export type UserRole = "dispatcher" | "officer" | "supervisor" | "fire"

export interface User {
  uid: string
  email: string
  role: UserRole
  roles?: UserRole[]
  displayName: string
  badge?: string
  unit?: string
}

export type UnitStatus = "available" | "busy" | "enroute" | "on-scene" | "off-duty"

export interface Unit {
  id: string
  callSign: string
  officerId?: string
  officerName: string
  status: UnitStatus
  department: "police" | "fire"
  isTemporary?: boolean
  location?: {
    lat: number
    lng: number
  }
  assignedIncident?: string
  lastUpdate: number
}

export type IncidentPriority = "low" | "medium" | "high" | "critical"
export type IncidentStatus = "pending" | "dispatched" | "active" | "resolved" | "closed"

export interface Incident {
  id: string
  caseNumber: string
  type: string
  priority: IncidentPriority
  status: IncidentStatus
  location: string
  description: string
  reportedBy: string
  assignedUnits: string[]
  createdAt: number
  updatedAt: number
  dispatcherId: string
  notes?: Note[]
}

export interface Note {
  id: string
  text: string
  authorId: string
  authorName: string
  timestamp: number
}

export interface ActivityLog {
  id: string
  timestamp: number
  userId: string
  userName: string
  action: string
  details: string
  incidentId?: string
  unitId?: string
}
