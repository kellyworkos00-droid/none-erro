# User Management Guide

**Status**: ✅ Complete  
**Date**: February 23, 2026  
**Scope**: User creation, verification, and management

---

## 📋 Overview

The Elegante ERP system includes comprehensive user management with role-based access control (RBAC), authentication, and activity tracking.

---

## 👥 User Roles

### Available Roles

| Role | Permissions | Access Level |
|---|---|---|
| **ADMIN** | Full system access | 🔴 Unrestricted |
| **FINANCE_MANAGER** | Finance operations, approvals | 🟠 Manager |
| **FINANCE_STAFF** | Data entry, basic operations | 🟡 Operator |
| **VIEWER** | Read-only access | 🟢 Limited |

---

## 🔑 Default Users

### Pre-configured Test Users

#### Admin User
```
Email:    admin@kellyos.com
Password: Admin@123
Role:     ADMIN
Status:   ✅ Active
```

#### Finance Manager
```
Email:    pkingori14@gmail.com
Password: owner@2026
Role:     FINANCE_MANAGER
Status:   ✅ Active
```

---

## 🚀 User Management Scripts

### 1. Check All Users

**Purpose**: View all users in the system with details

```bash
ts-node scripts/check-users.ts
```

**Output**:
```
📊 Total Users: 2

1. [✅] Admin Kelly
   Email: admin@kellyos.com
   Role: ADMIN (ADMIN)
   Created: 2/23/2026
   Last Login: 2/23/2026, 10:30:45 AM

2. [✅] Peter Kingori
   Email: pkingori14@gmail.com
   Role: FINANCE_MANAGER
   Created: 2/23/2026
   Last Login: Never

🔐 CREDENTIAL STATUS

✅ PASSWORD_MATCH admin@kellyos.com
   Name: Admin Kelly
   Role: ADMIN ✅
   Active: ✅ Yes

✅ PASSWORD_MATCH pkingori14@gmail.com
   Name: Peter Kingori
   Role: FINANCE_MANAGER ✅
   Active: ✅ Yes
```

### 2. Verify Credentials

**Purpose**: Check if user passwords match expected values

```bash
ts-node scripts/check-credentials.ts
```

**Output**:
```
admin@kellyos.com -> PASSWORD_MATCH | role=ADMIN | active=true
pkingori14@gmail.com -> PASSWORD_MATCH | role=FINANCE_MANAGER | active=true
```

### 3. Create/Update Users

**Purpose**: Create or update default users in database

```bash
ts-node scripts/create-users.ts
```

**Output**:
```
✅ Created/Updated Admin user: admin@kellyos.com
✅ Created/Updated Finance Manager user: pkingori14@gmail.com

📧 Users created successfully!

Login credentials:
1. Email: admin@kellyos.com | Password: Admin@123 | Role: ADMIN
2. Email: pkingori14@gmail.com | Password: owner@2026 | Role: FINANCE_MANAGER
```

### 4. Check Database Connection

**Purpose**: Verify database connection and table access

```bash
ts-node scripts/check-database.ts
```

---

## 🔐 Authentication System

### Login Process

**Endpoint**: `POST /api/auth/login`

**Request**:
```json
{
  "email": "admin@kellyos.com",
  "password": "Admin@123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "admin@kellyos.com",
      "firstName": "Admin",
      "lastName": "Kelly",
      "role": "ADMIN"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### JWT Token Structure

**Contains**:
- `userId` - Unique user identifier
- `email` - User email
- `role` - User role (ADMIN, FINANCE_MANAGER, etc.)
- `iat` - Issued at timestamp
- `exp` - Expiration timestamp

**Used In**: All API requests with `Authorization: Bearer <token>`

---

## 🔒 User Model (Database)

```typescript
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String   // Hashed with bcrypt
  firstName String
  lastName  String
  role      String   @default("VIEWER")
  isActive  Boolean  @default(true)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  lastLogin DateTime?
  
  // Relations to other entities
  payments             Payment[]
  reconciliationLogs   ReconciliationLog[]
  ledgerEntries        LedgerEntry[]
  auditLogs            AuditLog[]
  // ... more relations
}
```

---

## ➕ Creating New Users

### Method 1: Direct Database Insert (Admin Only)

```sql
INSERT INTO users (
  id, email, password, firstName, lastName, role, 
  isActive, createdAt, updatedAt
) VALUES (
  'user_new123',
  'newuser@company.com',
  '$2a$10$...',  -- bcrypt hashed password
  'John',
  'Doe',
  'FINANCE_STAFF',
  true,
  NOW(),
  NOW()
);
```

### Method 2: Prisma CLI

```typescript
const user = await prisma.user.create({
  data: {
    email: 'newuser@company.com',
    password: hashedPassword,
    firstName: 'John',
    lastName: 'Doe',
    role: 'FINANCE_STAFF',
    isActive: true,
  },
});
```

### Method 3: Extend create-users.ts Script

Edit `scripts/create-users.ts`:

```typescript
// User 3: New User
const hashedPassword3 = await bcrypt.hash('newPassword@123', 10);
const user3 = await prisma.user.upsert({
  where: { email: 'newuser@company.com' },
  update: { password: hashedPassword3 },
  create: {
    email: 'newuser@company.com',
    password: hashedPassword3,
    firstName: 'John',
    lastName: 'Doe',
    role: 'FINANCE_STAFF',
    isActive: true,
  },
});
```

---

## ✏️ Modifying Users

### Change User Role

```typescript
const updatedUser = await prisma.user.update({
  where: { email: 'pkingori14@gmail.com' },
  data: { role: 'FINANCE_MANAGER' },
});
```

### Disable User Account

```typescript
const deactivatedUser = await prisma.user.update({
  where: { email: 'user@company.com' },
  data: { isActive: false },
});
```

### Update Password

```typescript
const hashedPassword = await bcrypt.hash('newPassword@123', 10);
const updatedUser = await prisma.user.update({
  where: { email: 'user@company.com' },
  data: { password: hashedPassword },
});
```

---

## 🗑️ Deleting Users

### Soft Delete (Recommended)

```typescript
// Deactivate instead of delete
await prisma.user.update({
  where: { email: 'user@company.com' },
  data: { isActive: false },
});
```

### Hard Delete (Use Carefully)

```typescript
// Remove user completely
await prisma.user.delete({
  where: { email: 'user@company.com' },
});
```

---

## 🔍 Audit Logging

All user activities are logged in `audit_logs` table:

```typescript
model AuditLog {
  id          String   @id @default(cuid())
  userId      String
  action      String   // LOGIN, CREATE_INVOICE, etc.
  description String
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())
}
```

### View User Activity

```sql
SELECT * FROM audit_logs
WHERE userId = 'user_123'
ORDER BY createdAt DESC
LIMIT 100;
```

---

## 🔐 Security Best Practices

### Password Requirements
- ✅ Minimum 8 characters
- ✅ Must include uppercase letter
- ✅ Must include lowercase letter
- ✅ Must include number
- ✅ Should include special character

### Authentication
- ✅ Passwords hashed with bcrypt (10 rounds)
- ✅ JWT tokens with 24-hour expiration
- ✅ Token refresh mechanism available
- ✅ Rate limiting on login (5 attempts/15 min)

### Access Control
- ✅ Role-based permissions enforced
- ✅ All API routes protected
- ✅ Public routes whitelist maintained
- ✅ Audit logging on all changes

---

## 🛠️ Troubleshooting

### User Not Found

**Problem**: Login fails with "User not found"

**Solution**:
```bash
# 1. Check if user exists
ts-node scripts/check-users.ts

# 2. Create default users
ts-node scripts/create-users.ts

# 3. Verify email spelling
```

### Password Incorrect

**Problem**: Login fails with "Invalid credentials"

**Solution**:
```bash
# 1. Check credentials
ts-node scripts/check-credentials.ts

# 2. Reset password
# UPDATE users SET password = '$2a$10$...' 
# WHERE email = 'admin@kellyos.com';

# 3. Or recreate users
ts-node scripts/create-users.ts
```

### Account Disabled

**Problem**: Login fails with "Account is disabled"

**Solution**:
```sql
UPDATE users SET isActive = true 
WHERE email = 'user@company.com';
```

### Database Connection Failed

**Problem**: Scripts fail to connect

**Solution**:
```bash
# 1. Verify DATABASE_URL
echo $env:DATABASE_URL

# 2. Check PostgreSQL running
# 3. Check connection string format
# 4. Test connection:
ts-node scripts/check-database.ts
```

---

## 📊 User Statistics

### Current Users

```
Total Users: 2
├── ADMIN: 1 (100% active)
├── FINANCE_MANAGER: 1 (100% active)
├── FINANCE_STAFF: 0
└── VIEWER: 0

Active: 2
Inactive: 0
```

---

## 🎯 Next Steps

1. **Test Login**: Try logging in with default credentials
2. **Create Test Users**: Add additional users for testing
3. **Verify Roles**: Test permission boundaries for each role
4. **Set Up 2FA**: Enable two-factor authentication
5. **Configure SSO**: Connect to corporate directory

---

## 📞 Reference

### User-Related Tables

| Table | Purpose |
|---|---|
| `users` | Core user data |
| `audit_logs` | User activity history |
| `system_logs` | Detailed operation logs |

### User-Related Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/auth/login` | POST | User login |
| `/api/auth/me` | GET | Get current user |
| `/api/customers` | GET | Customer management |
| `/api/users` | GET/POST | User admin (future) |

### Environment Variables

```env
DATABASE_URL=postgresql://...
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRATION=24h
```

---

**Last Updated**: February 23, 2026  
**Version**: 1.0  
**Status**: ✅ Production Ready

