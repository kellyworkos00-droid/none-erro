# MongoDB Setup Guide

This project now uses **MongoDB** as the primary database for all environments.

## Quick Start

### Option 1: MongoDB Atlas (Cloud - Recommended for Production)

1. **Create MongoDB Atlas Account**
   - Go to [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
   - Sign up for a free account (M0 cluster is free)
   - Create a new organization and project

2. **Create a Cluster**
   - Click "Create" to build a new cluster
   - Choose: `M0 Sandbox` (free tier)
   - Select your region (e.g., AWS us-east-1)
   - Click "Create Cluster" and wait 2-3 minutes

3. **Create Database User**
   - Go to "Database Access" → Add Database User
   - Enter username: `kelly_os_user`
   - Generate secure password (or copy generated password): `your-secure-password`
   - Click "Add User"

4. **Allow IP Access**
   - Go to "Network Access" → Add IP Address
   - For development: Click "Allow Access from Anywhere" (0.0.0.0/0)
   - For production: Add only your server IP address

5. **Get Connection String**
   - Go to "Clusters" → Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string:
   ```
   mongodb+srv://kelly_os_user:your-secure-password@cluster-name.mongodb.net/kelly_os?retryWrites=true&w=majority
   ```

6. **Set Environment Variables**
   - Update your `.env` files:
   ```env
   DATABASE_URL="mongodb+srv://kelly_os_user:your-secure-password@cluster-name.mongodb.net/kelly_os?retryWrites=true&w=majority"
   ```

### Option 2: Local MongoDB (Development)

1. **Install MongoDB Community**
   - Windows: Download from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
   - Mac: `brew install mongodb-community`
   - Linux: Follow [official docs](https://docs.mongodb.com/manual/administration/install-on-linux/)

2. **Start MongoDB Service**
   - Windows: MongoDB runs as a service automatically
   - Mac/Linux: `brew services start mongodb-community`

3. **Set Connection String**
   ```env
   DATABASE_URL="mongodb://localhost:27017/kelly_os"
   ```

4. **Create Database**
   ```bash
   # Optional - MongoDB creates database automatically on first write
   # But you can verify with mongosh:
   mongosh
   > use kelly_os
   > db.createCollection("users")
   ```

## Environment Setup

### Local Development (.env)
```env
DATABASE_URL="mongodb+srv://kelly_os_user:password@cluster.mongodb.net/kelly_os?retryWrites=true&w=majority"
JWT_SECRET="your-secret-key-min-32-characters-long"
NODE_ENV="development"
```

### Vercel Production
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add new variable:
   - **Name:** `DATABASE_URL`
   - **Value:** Your MongoDB Atlas connection string (with real credentials)
3. Redeploy

## Verify Connection

```bash
# Test MongoDB connection
npm run dev

# The app should start without database connection errors
# Check terminal for: "Generated Prisma Client"
```

## Troubleshooting

### "Authentication failed" error
- Verify username and password in connection string
- Check user exists in MongoDB Atlas → Database Access
- Ensure IP is in Network Access allow list

### "Too many requests" error
- Increase rate limit in `.env`:
  ```env
  RATE_LIMIT_MAX_REQUESTS=1000
  ```

### "Connection timeout" error
- Check MongoDB Atlas cluster is running
- Verify IP address is allowed
- Try increasing connection timeout:
  ```env
  DATABASE_URL="...?retryWrites=true&w=majority&maxPoolSize=10"
  ```

## Data Migration

If you have existing data from SQLite/PostgreSQL:

1. **Export from old database**
   ```bash
   # SQLite
   sqlite3 dev.db ".dump" > dump.sql
   ```

2. **Import to MongoDB**
   - Use MongoDB Compass to import JSON
   - Or use MongoDB Atlas data migration tools

## MongoDB Best Practices

1. **Backup Strategy**
   - Enable automated backups in MongoDB Atlas
   - Set retention to 30+ days
   - Test restore procedures regularly

2. **Security**
   - Use strong passwords (20+ characters)
   - Enable IP whitelist (don't use 0.0.0.0)
   - Rotate credentials monthly
   - Use TLS/SSL (enabled by default in Atlas)

3. **Performance**
   - Monitor Atlas metrics dashboard
   - Enable compression for large documents
   - Use indexes on frequently queried fields

4. **Scaling**
   - Monitor storage usage
   - Upgrade cluster tier if needed
   - Implement sharding if collection sizes exceed 10GB

## Useful Commands

```bash
# Test Prisma connection
npx prisma db push

# View database
mongosh
> use kelly_os
> db.users.find()

# Create indexes
npx prisma migrate reset

# Check schema
npx prisma db pull

# Generate Prisma Client
npx prisma generate
```

## Support

For MongoDB support:
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Prisma MongoDB Guide](https://www.prisma.io/docs/orm/overview/databases/mongodb)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
