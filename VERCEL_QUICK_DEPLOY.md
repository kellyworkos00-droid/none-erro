# 🚀 Quick Vercel Deployment Guide

## Create New Repository & Deploy in 10 Minutes

### Prerequisites
- GitHub account: https://github.com
- Vercel account: https://vercel.com  
- PostgreSQL database (Neon): https://neon.tech

---

## Step 1: Create New GitHub Repository (2 minutes)

### Option A: Using Web UI
1. Go to https://github.com/new
2. Repository name: `elegante-erp` (or your preferred name)
3. Description: `Production-ready ERP suite for Kelly OS`
4. Choose: **Public** or **Private**
5. ❌ Do NOT initialize with README (we have one)
6. Click "Create repository"

### Option B: Using GitHub CLI
```bash
cd c:\Users\zachn\OneDrive\Desktop\elegante-main

# Create repo (replace USERNAME with your GitHub username)
gh repo create elegante-erp --source=. --remote=origin --push

# Or specify visibility:
gh repo create elegante-erp --source=. --remote=origin --push --private
```

### Option C: Manual Git Commands
```bash
cd c:\Users\zachn\OneDrive\Desktop\elegante-main

# Add new remote
git remote add new-origin https://github.com/YOUR_USERNAME/elegante-erp.git

# Push all branches
git branch -M main
git push -u new-origin main

# Verify
git remote -v
```

---

## Step 2: Prepare Environment Variables (3 minutes)

### Get Your Database Connection Strings

**From Neon Database:**
1. Login to https://console.neon.tech
2. Select your project
3. Copy connection string format:
   ```
   postgresql://user:password@host/dbname?sslmode=require
   ```

**Generate JWT Secret:**
```bash
# Windows PowerShell
$bytes = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
$buffer = [byte[]]::new(32)
$bytes.GetBytes($buffer)
-join ($buffer | ForEach-Object { $_.ToString("x2") })

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Environment Variables Needed:
```
DATABASE_URL=postgresql://neondb_owner:password@ep-xxx-pooler.c-x.region.aws.neon.tech/neondb?sslmode=require

DIRECT_URL=postgresql://neondb_owner:password@ep-xxx.c-x.region.aws.neon.tech/neondb?sslmode=require

JWT_SECRET=<generated-32-char-secret>

JWT_REFRESH_SECRET=<generated-32-char-secret>

NEXT_PUBLIC_APP_URL=https://elegante-erp.vercel.app

NODE_ENV=production
```

Leave other variables as defaults shown in `.env.example`

---

## Step 3: Deploy to Vercel (5 minutes)

### Step 3A: Connect to Vercel
1. Go to https://vercel.com/new
2. Click "Continue with GitHub"
3. Authorize Vercel to access your repositories
4. Click your GitHub username/org
5. Search and select `elegante-erp` repository
6. Click "Import"

### Step 3B: Configure Project
1. **Framework Preset:** Next.js (should auto-detect)
2. **Project Name:** `elegante-erp` (or your preference)
3. **Root Directory:** `./` (default)
4. **Build Command:** `prisma generate && next build`
5. **Install Command:** `npm install`
6. **Output Directory:** `.next`

### Step 3C: Add Environment Variables
1. Scroll down to "Environment Variables"
2. Add each variable:
   ```
   Name: DATABASE_URL
   Value: [Your Neon connection string]
   
   Name: DIRECT_URL
   Value: [Your Neon direct connection string]
   
   Name: JWT_SECRET
   Value: [Generated secret]
   
   Name: JWT_REFRESH_SECRET
   Value: [Generated secret]
   
   Name: NEXT_PUBLIC_APP_URL
   Value: https://elegante-erp.vercel.app
   
   Name: NODE_ENV
   Value: production
   ```

3. Leave other settings as defaults
4. Click "Deploy"

### Step 3D: Wait for Deployment
- Build takes 2-5 minutes
- Watch build logs in Vercel dashboard
- Look for "✓ Ready" message

---

## Step 4: Verify Deployment (1 minute)

Once deployment completes:

### Test Application
1. Click "Visit" button or go to: `https://elegante-erp.vercel.app`
2. You should see the login page
3. Test login with existing credentials

### Test API Endpoint
```bash
# Open browser console and run:
fetch('https://elegante-erp.vercel.app/api/health')
  .then(r => r.json())
  .then(d => console.log(d))
```

### Check Vercel Logs
1. Go to Vercel Dashboard
2. Click your project
3. Click "Deployments"
4. Click "View Logs" to see build/runtime logs

---

## 🎯 Complete Checklist

### Before Deployment
- [ ] Created new GitHub repository
- [ ] Pushed code to new repository
- [ ] Generated JWT secrets
- [ ] Have Neon database connection strings ready
- [ ] Reviewed vercel.json (auto-created or use provided)

### During Deployment
- [ ] All environment variables entered correctly
- [ ] Selected Node.js 18.x runtime
- [ ] Build command is set correctly
- [ ] Waited for deployment to complete

### After Deployment
- [ ] Application loads without errors
- [ ] Login page displays
- [ ] Can navigate to dashboard
- [ ] API endpoints respond
- [ ] Database connection works

---

## ❌ Common Issues & Solutions

### Issue: Build Fails - "Prisma Error"
```
Error: @prisma/client was not initialized!
```
**Solution:** 
- Ensure `DATABASE_URL` is set in environment variables
- Ensure `DIRECT_URL` is set for database migrations
- Restart deployment after adding variables

### Issue: Blank Page / 500 Error
```
Application error: a client-side exception has occurred
```
**Solution:**
- Check browser console for errors
- Click "Logs" in Vercel dashboard to see server errors
- Verify environment variables are loaded

### Issue: Database Connection Timeout
```
ECONNREFUSED or ETIMEDOUT
```
**Solution:**
- Verify Neon database is running
- Check connection string is correct and includes `?sslmode=require`
- Increase serverSessionIdleTimeout in vercel.json if needed

### Issue: 401 Unauthorized on API Calls
```
401: Unauthorized
```
**Solution:**
- Ensure JWT_SECRET and JWT_REFRESH_SECRET match between Vercel and local `.env`
- Check authorization header format: `Bearer YOUR_TOKEN`
- Verify token is valid and not expired

---

## 🔗 Useful Links

- Vercel Dashboard: https://vercel.com/dashboard
- GitHub Repository: https://github.com/your-username/elegante-erp
- Neon Console: https://console.neon.tech
- Vercel Logs: https://vercel.com/docs/observability/logs

---

## Next Steps (Optional)

### 1. Configure Custom Domain
1. Go to Vercel Dashboard → Project → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration steps

### 2. Set Up GitHub Deployments
1. Auto-deploys on every push to `main` branch (default)
2. Can create preview deployments for pull requests
3. Configure in Vercel → Settings → Git

### 3. Enable Analytics
1. Go to Vercel Dashboard → Analytics
2. View real-time visitor analytics
3. Monitor performance metrics

### 4. Set Up Error Tracking
1. Install Sentry: `npm install @sentry/nextjs`
2. Configure SENTRY_DSN in environment variables
3. Monitor errors in real-time

---

## ✨ You're Done!

Your ERP application is now live on Vercel! 🎉

**Production URL:** https://elegante-erp.vercel.app
**Auto-deploy:** Every `git push` to main branch

Need help? Check logs in Vercel Dashboard or refer to [VERCEL_DEPLOYMENT_CHECKLIST.md](./VERCEL_DEPLOYMENT_CHECKLIST.md)
