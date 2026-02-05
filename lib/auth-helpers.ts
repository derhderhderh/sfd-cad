import { ref, get, set } from "firebase/database"
import { database } from "./firebase"
import type { User, UserRole } from "./types"

export async function getUserRole(uid: string): Promise<UserRole | null> {
  console.log("[v0] Getting user role for uid:", uid)
  const userRef = ref(database, `users/${uid}`)
  const snapshot = await get(userRef)

  if (snapshot.exists()) {
    const userData = snapshot.val()
    console.log("[v0] User data from database:", userData)

    // Backward compatibility
    if (Array.isArray(userData.roles) && userData.roles.length > 0) {
      return userData.roles[0]
    }

    return userData.role ?? null
  }

  console.log("[v0] No user data found")
  return null
}

export async function getUserRoles(uid: string): Promise<UserRole[]> {
  console.log("[v0] Getting user roles for uid:", uid)
  const userRef = ref(database, `users/${uid}`)
  const snapshot = await get(userRef)

  if (snapshot.exists()) {
    const userData = snapshot.val()
    console.log("[v0] Full user data from database:", userData)

    if (Array.isArray(userData.roles)) {
      return userData.roles
    }

    if (userData.role) {
      return [userData.role]
    }
  }

  console.log("[v0] No user data found for uid:", uid)
  return []
}

export async function getUserData(uid: string): Promise<User | null> {
  console.log("[v0] Getting full user data for uid:", uid)
  const userRef = ref(database, `users/${uid}`)
  const snapshot = await get(userRef)

  if (snapshot.exists()) {
    const userData = snapshot.val()

    // Normalize roles
    return {
      ...userData,
      roles: Array.isArray(userData.roles)
        ? userData.roles
        : userData.role
        ? [userData.role]
        : [],
    }
  }

  console.log("[v0] No user found")
  return null
}

export async function setUserRole(
  uid: string,
  role: UserRole,
  email: string,
  displayName: string
): Promise<void> {
  console.log("[v0] Setting initial user data:", { uid, role, email, displayName })
  const userRef = ref(database, `users/${uid}`)

  await set(userRef, {
    uid,
    email,
    role,          // legacy support
    roles: [role], // modern multi-role system
    displayName,
    createdAt: Date.now(),
  })

  console.log("[v0] Initial user data set successfully")
}
