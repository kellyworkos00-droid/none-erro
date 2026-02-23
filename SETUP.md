# 🚀 SETUP GUIDE - Kelly OS ERP Suite

## Step-by-Step Installation

### 1️⃣ Prerequisites Check

Ensure you have the following installed:

```powershell
# Check Node.js version (should be 18+)
node --version

# Check npm version (should be 9+)
npm --version

# Check PostgreSQL (should be 14+)
psql --version
```

If any are missing:
- **Node.js**: Download from https://nodejs.org/
- **PostgreSQL**: Download from https://www.postgresql.org/download/

---

### 2️⃣ Database Setup

#### Create Database

Open PostgreSQL command line or pgAdmin and run:

```sql
CREATE DATABASE kelly_os;
CREATE USER kelly_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE kelly_os TO kelly_user;
```

#### Configure Connection

Update `.env` file with your database credentials:

```env
DATABASE_URL="postgresql://kelly_user:your_secure_password@localhost:5432/kelly_os?schema=public"
```

---

### 3️⃣ Install Dependencies

```powershell
cd c:\Users\USER\Desktop\el
npm install
```

This will install:
- Next.js 14
- Prisma ORM
- Authentication libraries
- UI components
- And all other dependencies (~200MB)

---

### 4️⃣ Environment Configuration

1. Copy the example environment file:
```powershell
copy .env.example .env
```

2. Edit `.env` and update:

```env
# Database (REQUIRED)
DATABASE_URL="postgresql://kelly_user:your_password@localhost:5432/kelly_os?schema=public"

# JWT Secret (REQUIRED - Generate a secure random string)
JWT_SECRET="your-super-secret-key-at-least-32-characters-long-random-string"

# Other settings (optional, defaults provided)
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
MAX_FILE_SIZE_MB=10
```

**Security Note:** Never commit `.env` to version control!

---

### 5️⃣ Database Migration & Seeding

Run these commands in order:

```powershell
# 1. Generate Prisma Client
npm run prisma:generate

# 2. Create database tables
npm run prisma:migrate

# 3. Seed initial data (users, accounts, sample customers)
npm run prisma:seed
```

You should see:
```
✅ Admin user created: admin@kellyos.com
✅ Finance manager created: finance@kellyos.com
✅ Chart of accounts created
✅ Sample customers created
🎉 Database seeding completed successfully!
```

---

### 6️⃣ Verify Setup

#### Check Database Tables

```powershell
npm run prisma:studio
```

This opens Prisma Studio in your browser where you can:
- View all tables
- Verify seeded data
- Inspect records

---

### 7️⃣ Start Development Server

```powershell
npm run dev
```

You should see:
```
✓ Ready in 2.5s
○ Local:        http://localhost:3000
```

---

### 8️⃣ First Login

1. Open browser: http://localhost:3000
2. You'll be redirected to `/login`
3. Use default credentials:

**Admin Login:**
- Email: `admin@kellyos.com`
- Password: `Admin@123!`

**Finance Manager Login:**
- Email: `finance@kellyos.com`
- Password: `Finance@123!`

---

## 🧪 Testing the System

### Test Workflow

1. **Login** with admin credentials
2. **Upload Sample Statement**
   - Go to "Upload Statement"
   - Use the provided `sample-bank-statement.csv`
   - Verify successful import
3. **Auto-Reconcile**
   - Go to "Reconcile"
   - Click "Auto-Match All"
   - Check matched transactions
4. **Manual Match**
   - Select an unmatched transaction
   - Choose customer and invoice
   - Confirm match
5. **View Dashboard**
   - Check summary cards
   - Review recent transactions
   - See top customers

---

## 🔧 Troubleshooting

### Issue: Database Connection Failed

**Error:** `Can't reach database server`

**Solution:**
1. Verify PostgreSQL is running:
```powershell
# Check service status
Get-Service -Name postgresql*
```

2. Test connection:
```powershell
psql -U kelly_user -d kelly_os
```

3. Check firewall settings

---

### Issue: Prisma Migration Failed

**Error:** `Migration failed to apply`

**Solution:**
1. Reset database:
```powershell
npm run prisma:migrate reset
```

2. Re-run migration:
```powershell
npm run prisma:migrate
```

---

### Issue: Port 3000 Already in Use

**Error:** `Port 3000 is already in use`

**Solution:**
1. Find and kill process:
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process (replace PID)
taskkill /PID <PID> /F
```

2. Or change port in `package.json`:
```json
"dev": "next dev -p 3001"
```

---

### Issue: JWT Error

**Error:** `JWT secret not set or too short`

**Solution:**
1. Generate a secure secret:
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

2. Update `.env`:
```env
JWT_SECRET="<generated-secret>"
```

---

### Issue: File Upload Failed

**Error:** `Failed to parse statement`

**Solution:**
1. Verify CSV format matches expected structure
2. Check sample file: `sample-bank-statement.csv`
3. Ensure file has headers
4. Verify date format (YYYY-MM-DD)

---

## 📊 Database Management

### View Data
```powershell
npm run prisma:studio
```

### Reset Database
```powershell
# ⚠️ WARNING: Deletes all data
npm run prisma:migrate reset
```

### Backup Database
```powershell
pg_dump -U kelly_user kelly_os > backup_$(date +%Y%m%d).sql
```

### Restore Database
```powershell
psql -U kelly_user kelly_os < backup_20240211.sql
```

---

## 🚀 Going to Production

### Pre-Production Checklist

- [ ] Generate new JWT_SECRET (64+ characters)
- [ ] Update DATABASE_URL with production database
- [ ] Change default admin password
- [ ] Remove or disable seed data
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Set up database backups
- [ ] Enable production logging
- [ ] Configure monitoring
- [ ] Set up error tracking (e.g., Sentry)
- [ ] Review and test all security settings
- [ ] Load test with realistic data volume
- [ ] Verify audit log retention
- [ ] Document deployment process

### Build for Production

```powershell
npm run build
npm run start
```

### Environment Variables for Production

```env
NODE_ENV="production"
DATABASE_URL="postgresql://user:pass@production-host:5432/kelly_os"
JWT_SECRET="<64-character-random-string>"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
ENABLE_AUDIT_LOGGING=true
LOG_RETENTION_DAYS=2555  # 7 years for financial records
```

---

## 📞 Support & Resources

### Documentation
- Main README: `README.md`
- Database Schema: `prisma/schema.prisma`
- API Routes: `app/api/`
- Sample Data: `sample-bank-statement.csv`

### Prisma Documentation
- https://www.prisma.io/docs

### Next.js Documentation
- https://nextjs.org/docs

### PostgreSQL Documentation
- https://www.postgresql.org/docs/

---

## 🎯 Next Steps

After successful setup:

1. ✅ Customize customer and invoice data
2. ✅ Adapt CSV parser to your bank's format
3. ✅ Configure additional user accounts
4. ✅ Set up backup schedule
5. ✅ Review and adjust matching rules
6. ✅ Configure email notifications (optional)
7. ✅ Set up monitoring dashboard
8. ✅ Document internal procedures

---

**Congratulations! Your Kelly OS ERP Suite is now ready.** 🎉

For production deployment, carefully review the security checklist and ensure all credentials are properly secured.
