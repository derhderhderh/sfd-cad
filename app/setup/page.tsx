"use client"

import { useState } from "react"
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { setUserRole, getUserRole } from "@/lib/auth-helpers"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

const SUPERVISOR_EMAIL = "wilkinsr542@gmail.com"
const SUPERVISOR_PASSWORD = "Petfan11!willie"
const SUPERVISOR_NAME = "Ryan Wilkins"

export default function SetupPage() {
  const [status, setStatus] = useState<"idle" | "checking" | "creating" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [alreadyExists, setAlreadyExists] = useState(false)
  const router = useRouter()

  const handleSetup = async () => {
    setStatus("checking")
    setMessage("Checking for existing supervisor...")

    try {
      try {
        await signInWithEmailAndPassword(auth, SUPERVISOR_EMAIL, SUPERVISOR_PASSWORD)
        // If sign in succeeds, account already exists
        const user = auth.currentUser
        if (user) {
          const role = await getUserRole(user.uid)
          console.log("[v0] Existing account role:", role)

          if (role === "supervisor") {
            await auth.signOut()
            setAlreadyExists(true)
            setStatus("success")
            setMessage("Supervisor account already exists. You can now login.")
            return
          }
        }
      } catch (signInError: any) {
        // If sign in fails, account doesn't exist yet - continue to create it
        if (
          signInError.code !== "auth/user-not-found" &&
          signInError.code !== "auth/wrong-password" &&
          signInError.code !== "auth/invalid-credential"
        ) {
          throw signInError
        }
      }

      // Create supervisor account
      setStatus("creating")
      setMessage("Creating supervisor account...")

      const userCredential = await createUserWithEmailAndPassword(auth, SUPERVISOR_EMAIL, SUPERVISOR_PASSWORD)
      console.log("[v0] Supervisor user created:", userCredential.user.uid)

      await setUserRole(userCredential.user.uid, "supervisor", SUPERVISOR_EMAIL, SUPERVISOR_NAME)
      console.log("[v0] Supervisor role data written using setUserRole")

      const verifiedRole = await getUserRole(userCredential.user.uid)
      console.log("[v0] Verification - role value:", verifiedRole)

      // Sign out after creation
      await auth.signOut()

      setStatus("success")
      setMessage("Supervisor account created successfully! Redirecting to login...")

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } catch (error: any) {
      console.error("[v0] Setup error:", error)
      setStatus("error")
      if (error.code === "auth/email-already-in-use") {
        setMessage("Supervisor account already exists. You can now login.")
        setAlreadyExists(true)
        setTimeout(() => {
          router.push("/login")
        }, 2000)
      } else {
        setMessage(`Setup failed: ${error.message}`)
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Initial Setup</CardTitle>
          <CardDescription>Set up the default supervisor account to get started</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "idle" && (
            <>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>This will create a supervisor account with the following credentials:</p>
                <div className="bg-muted p-3 rounded-lg space-y-1 font-mono text-xs">
                  <div>
                    <strong>Email:</strong>
                  </div>
                  <div>
                    <strong>Password:</strong>
                  </div>
                </div>
                <p className="text-xs">You can change these credentials after logging in.</p>
              </div>
              <Button onClick={handleSetup} className="w-full">
                Create Supervisor Account
              </Button>
            </>
          )}

          {status === "checking" && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {status === "creating" && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {status === "success" && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{message}</AlertDescription>
            </Alert>
          )}

          {status === "error" && !alreadyExists && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {(status === "success" || alreadyExists) && (
            <Button onClick={() => router.push("/login")} className="w-full">
              Go to Login
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
