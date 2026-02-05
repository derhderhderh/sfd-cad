# RAPID: CAD/MDT for MSRP - Setup Instructions

## Quick Start Guide

### 1. Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. Enter project name: "rapid-cad-mdt" (or your preferred name)
4. Disable Google Analytics (optional)
5. Click "Create project"

### 2. Enable Authentication

1. In Firebase Console, go to "Authentication"
2. Click "Get started"
3. Enable "Email/Password" sign-in method
4. Click "Save"

### 3. Enable Realtime Database

1. In Firebase Console, go to "Realtime Database"
2. Click "Create Database"
3. Choose location (e.g., United States)
4. Start in "test mode" for initial setup
5. Click "Enable"

### 4. Apply Security Rules

1. In Realtime Database, go to "Rules" tab
2. Copy the following rules and paste into the rules editor:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null && (auth.uid === $uid || root.child('users').child(auth.uid).child('role').val() === 'supervisor' || root.child('users').child(auth.uid).child('role').val() === 'dispatcher')",
        ".write": "auth != null && (auth.uid === $uid || root.child('users').child(auth.uid).child('role').val() === 'supervisor')"
      }
    },
    "units": {
      ".read": "auth != null",
      "$unitId": {
        ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'supervisor' || root.child('users').child(auth.uid).child('role').val() === 'dispatcher' || root.child('units').child($unitId).child('officerId').val() === auth.uid || $unitId === 'unit-' + auth.uid)"
      }
    },
    "incidents": {
      ".read": "auth != null",
      "$incidentId": {
        ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'supervisor' || root.child('users').child(auth.uid).child('role').val() === 'dispatcher')",
        "notes": {
          ".write": "auth != null"
        }
      }
    },
    "activityLogs": {
      ".read": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'supervisor' || root.child('users').child(auth.uid).child('role').val() === 'dispatcher')",
      ".write": "auth != null"
    }
  }
}
```

3. Click "Publish"

**Important Changes**: These updated rules now allow:
- Officers and FD members can create their own units (unit-{userID})
- Officers can update their own unit information
- Officers can add notes to incidents
- All authenticated users can add activity logs

### 5. Get Firebase Configuration

1. In Firebase Console, go to Project Settings (gear icon)
2. Scroll to "Your apps" section
3. Click the web icon (</>)
4. Register app name: "CAD-MDT"
5. Copy the firebaseConfig object

### 6. Configure Environment Variables

In v0, add the following environment variables in the **Vars** section (sidebar):

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

For local development, create `.env.local` in your project root with the same variables.

### 7. Initial Supervisor Setup

**On first deployment**, visit `/setup` to create the default supervisor account:

1. Navigate to: `https://your-app-url.com/setup`
2. Click "Create Supervisor Account"
3. This creates the supervisor with credentials:
   - Email: `wilkinsr542@gmail.com`
   - Password: `Petfan11!willie`

4. After creation, you'll be redirected to the login page

### 8. Login and Start Using

1. Go to `/login`
2. Login with supervisor credentials
3. Create additional users (dispatchers, officers, and fire department members) from the admin panel
4. Officers and FD members can create their own callsign/unit by clicking the edit icon next to their name in the MDT

## Creating Additional Users

### Option 1: Via Admin Panel (Recommended)

Once logged in as supervisor, use the admin panel to create additional users with appropriate roles:
- **supervisor**: Full system access
- **dispatcher**: CAD console access, can manage incidents and units, create temporary units
- **officer**: Police MDT access (blue theme)
- **fire**: Fire Department MDT access (red theme)

### Option 2: Manual Creation via Firebase Console

1. Go to Firebase Console → Authentication
2. Click "Add user"
3. Enter email and password
4. Note the User UID
5. Go to Realtime Database
6. Navigate to `/users/[UID]`
7. Add user data:

```json
{
  "uid": "user-uid-here",
  "email": "newuser@dept.gov",
  "role": "officer",
  "displayName": "New User",
  "createdAt": 1234567890
}
```

**Note**: Officers and fire department members will create their own units when they first log in by clicking the edit icon next to their name.

## User Roles

- **Supervisor**: Full access to all features, can view MDT/CAD systems, manage users and edit login info/roles
- **Dispatcher**: Can create and manage incidents, view all units, edit officer availability and callsigns, create temporary units
- **Officer**: Police MDT access, can create/edit own unit, view incidents, update status, and add notes (blue theme)
- **Fire**: Fire Department MDT access, can create/edit own unit, view incidents, update status, and add notes (red theme)

## Key Features

### Self-Service Unit Management
- Officers and FD members can create their own callsigns/units
- Click the edit icon next to your name in the MDT header
- Enter a callsign like "UNIT-301" for police or "ENGINE-1" for fire

### Dispatcher Controls
- Edit any officer's availability status
- Update unit callsigns
- Assign units to incidents
- Create temporary units for officers without accounts
- Remove temporary units when they go off duty

### Temporary Units
- Dispatchers can create temporary units without requiring account creation
- Useful for mutual aid, volunteers, or temporary personnel
- Temporary units are marked with a "TEMP" badge
- Can be quickly removed with the trash icon when off duty
- Stored in the database like regular units but can be deleted by dispatchers

### Supervisor Access
- View both CAD Console and MDT systems
- Manage all users, roles, and login information
- Full oversight of all operations

## Troubleshooting

### "Permission denied" errors:
- Check that Firebase security rules are published
- Verify user has correct role in `/users/[uid]/role`
- Ensure user is authenticated

### Real-time updates not working:
- Check Firebase Database URL is correct (must include `-default-rtdb`)
- Verify Realtime Database is enabled (not Firestore)
- Check browser console for connection errors

### Login fails:
- Verify Email/Password authentication is enabled
- Check environment variables are correct
- Clear browser cache and try again

### Setup page shows error:
- Ensure Firebase security rules allow user creation
- Check that environment variables are properly configured
- Verify Firebase project has Email/Password auth enabled

## Production Deployment

### Deploy to Vercel:

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard (under Settings → Environment Variables)
4. Deploy
5. Visit `https://your-app.vercel.app/setup` to create supervisor account

### Security Best Practices:

1. Change the default supervisor password immediately after first login
2. Use strong passwords for all accounts
3. Regularly review user access and permissions
4. Enable Firebase App Check for additional security
5. Monitor Firebase usage and set up billing alerts

## Next Steps

After setup:
1. Change default supervisor password
2. Create dispatcher and officer accounts
3. Customize incident types for your agency
4. Configure unit call signs and naming conventions
5. Add location tracking with GPS (optional)
6. Set up backup procedures
7. Train users on the system

## Support

For issues, check:
1. Firebase Console for errors
2. Browser developer console
3. Network tab for failed requests
4. Firebase security rules
5. Environment variable configuration
