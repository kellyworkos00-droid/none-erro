# Kelly OS - ERP Suite

**Production-Ready Financial Software**

A secure, enterprise-grade ERP suite built for Kelly OS using Next.js, TypeScript, PostgreSQL, and Prisma ORM. This system handles real money transactions with proper accounting principles, security, and audit trails.

---

## 🏗️ System Architecture

### Core Features

✅ **Secure Bank Statement Upload** - CSV/Excel parsing with validation  
✅ **Automatic Transaction Matching** - Intelligent matching engine with multiple strategies  
✅ **Manual Matching** - User-friendly interface for manual matches  
✅ **Double-Entry Accounting** - Proper financial ledger system  
✅ **Role-Based Access Control** - Admin, Finance Manager, Finance Staff, Viewer  
✅ **Audit Logging** - Complete audit trail for all operations  
✅ **Duplicate Prevention** - Transaction ID-based deduplication  
✅ **Premium UI/UX** - Clean, modern dashboard inspired by Stripe  

---

## 📋 Prerequisites

- **Node.js** 18.x or higher
- **PostgreSQL** 14.x or higher
- **npm** 9.x or higher

---

## 🚀 Quick Start

### 1. Clone and Install

```bash
cd c:\Users\USER\Desktop\el
npm install
```

### 2. Configure Environment

Copy the example environment file and configure it:

```bash
copy .env.example .env
```

Edit `.env` and update the following:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/kelly_os?schema=public"
JWT_SECRET="your-secret-key-min-32-characters-long-change-in-production"
```

### 3. Setup Database

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed initial data
npm run prisma:seed
```

### 4. Start Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

---

## 🔐 Default Login Credentials

### Administrator
- **Email:** admin@kellyos.com
- **Password:** Admin@123!
- **Role:** Full system access

### Finance Manager
- **Email:** finance@kellyos.com
- **Password:** Finance@123!
- **Role:** ERP Suite and financial operations

---

## 📊 Database Schema

### Core Models

1. **User** - Authentication and authorization
2. **Customer** - Customer master data
3. **Invoice** - Sales invoices
4. **BankTransaction** - Raw imported bank transactions
5. **Payment** - Reconciled payments linking bank to customers
6. **LedgerEntry** - Double-entry accounting ledger
7. **Account** - Chart of accounts
8. **ReconciliationLog** - Audit trail for statement matching
9. **AuditLog** - System-wide activity logging

### Key Relationships

```
BankTransaction → Payment → Customer → Invoice
Payment → LedgerEntry → Account
```

---

## 🎯 Usage Guide

### 1. Upload Bank Statement

1. Navigate to **Upload Statement**
2. Drag & drop or browse for CSV/Excel file
3. System validates and imports transactions
4. Duplicates are automatically detected and skipped

**Supported Formats:**
- CSV with headers: Transaction Date, Transaction ID, Reference, Credit/Debit, Balance
- Excel (.xlsx, .xls) with similar structure

### 2. Auto-Matching

1. Go to **Reconcile** page
2. Click **Auto-Match All**
3. System attempts to match transactions using:
   - Invoice number extraction
   - Customer code matching
   - Fuzzy name matching
   - Amount-based matching
4. High-confidence matches (≥80%) are automatically matched

### 3. Manual Matching

For unmatched transactions:

1. Click **Match** on any pending/unmatched transaction
2. Select the customer
3. Optionally select a specific invoice
4. Confirm the match
5. System creates payment and posts to ledger

---

## 🔒 Security Features

### Authentication
- JWT-based authentication
- Bcrypt password hashing (12 rounds)
- Session management with token expiry

### Authorization
- Role-based access control (RBAC)
- Permission-based API protection
- Finance operations restricted to authorized roles

### Data Protection
- Input validation using Zod schemas
- SQL injection prevention via Prisma
- XSS protection
- CSRF protection
- Secure HTTP headers

### Audit Trail
- All financial operations logged
- User actions tracked with IP and user agent
- Immutable ledger entries
- Transaction history preserved

---

## 💰 Accounting Principles

### Double-Entry System

Every transaction creates balanced ledger entries:

**Payment Received:**
```
DR: DTB Bank Account (Asset +)
CR: Accounts Receivable (Asset -)
```

**Invoice Created:**
```
DR: Accounts Receivable (Asset +)
CR: Sales Revenue (Revenue +)
```

### Key Rules

1. **Immutability** - Ledger entries cannot be edited
2. **Reversals** - Use reversal entries instead of deletions
3. **Balance Verification** - All transactions must balance (DR = CR)
4. **Atomicity** - All operations in database transactions

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), React, TypeScript |
| Styling | Tailwind CSS |
| Backend | Next.js API Routes |
| Database | PostgreSQL 14+ |
| ORM | Prisma 5 |
| Authentication | JWT, bcryptjs |
| Validation | Zod |
| File Parsing | PapaParse (CSV), XLSX (Excel) |

---

## 📁 Project Structure

```
kelly-os-erp-suite/
├── app/
│   ├── api/                    # API routes
│   │   ├── auth/              # Authentication endpoints
│   │   ├── reconciliation/    # ERP Suite endpoints
│   │   ├── customers/         # Customer endpoints
│   │   └── invoices/          # Invoice endpoints
│   ├── dashboard/             # Dashboard pages
│   ├── login/                 # Login page
│   ├── layout.tsx             # Root layout
│   └── globals.css            # Global styles
├── lib/
│   ├── prisma.ts             # Prisma client
│   ├── auth.ts               # Authentication utilities
│   ├── authorization.ts      # Authorization middleware
│   ├── accounting.ts         # Double-entry accounting
│   ├── matching-engine.ts    # Matching logic
│   ├── statement-parser.ts   # CSV/Excel parser
│   ├── validations.ts        # Zod schemas
│   ├── utils.ts              # Helper functions
│   └── audit.ts              # Audit logging
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed.ts               # Seed data
├── .env.example              # Environment template
├── package.json              # Dependencies
└── README.md                 # This file
```

---

## 🔧 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

npm run prisma:generate   # Generate Prisma client
npm run prisma:migrate    # Run database migrations
npm run prisma:studio     # Open Prisma Studio
npm run prisma:seed       # Seed database
```

---

## 📝 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### ERP Suite APIs
- `POST /api/reconciliation/upload` - Upload statement
- `GET /api/reconciliation/transactions` - List transactions
- `POST /api/reconciliation/auto-match` - Auto-match
- `POST /api/reconciliation/manual-match` - Manual match
- `GET /api/reconciliation/dashboard` - Dashboard stats

### Data
- `GET /api/customers` - List customers
- `GET /api/invoices` - List invoices

All endpoints require authentication via `Authorization: Bearer <token>` header.

---

## 🎨 UI Components

### Dashboard
- Summary cards (collected, outstanding, pending, unmatched)
- Recent transactions list
- Top customers chart

### Upload Interface
- Drag & drop file upload
- Progress indicator
- Validation feedback
- Import results summary

### Matching Screen
- Transaction list with filters
- Search functionality
- Status badges
- Manual matching modal

### Responsive Design
- Mobile-friendly sidebar
- Tablet-optimized layouts
- Desktop-first experience

---

## 🧪 Testing Workflow

1. **Login** with demo credentials
2. **Upload** a sample bank statement (CSV/Excel)
3. **Auto-match** pending transactions
4. **Manually match** remaining unmatched transactions
5. **Review** dashboard for ERP Suite summary
6. **Check** customers and invoices for updated balances

---

## 🚨 Production Checklist

Before deploying to production:

- [ ] Change JWT_SECRET to a strong random string (≥32 chars)
- [ ] Update database credentials
- [ ] Enable HTTPS/SSL
- [ ] Configure environment variables
- [ ] Set up database backups
- [ ] Configure rate limiting
- [ ] Enable production logging
- [ ] Review and update CORS settings
- [ ] Test with real bank statement format
- [ ] Verify double-entry accounting balances
- [ ] Set up monitoring and alerts

---

## 📚 Additional Documentation

### Bank Statement Format

DTB CSV format should contain:
- **Transaction Date** - Date of transaction
- **Transaction ID** - Unique identifier
- **Reference** - Customer reference/description
- **Credit** - Incoming amount
- **Debit** - Outgoing amount (if applicable)
- **Balance** - Running balance

### Matching Strategies

1. **Exact Invoice Match** - Extract invoice number from reference
2. **Customer Code Match** - Match customer code pattern
3. **Fuzzy Name Match** - Match customer name in reference
4. **Amount Match** - Match unique invoice amounts

### Confidence Levels

- **95%+** - Exact invoice match
- **80-94%** - Customer code + invoice match
- **60-79%** - Fuzzy matching
- **<60%** - Requires manual review

---

## 🤝 Support

For issues or questions:
1. Check the documentation above
2. Review audit logs for transaction history
3. Verify database integrity using Prisma Studio
4. Check server logs for errors

---

## 📄 License

Proprietary - Kelly OS Financial Software

---

## ⚠️ Important Notes

1. **Data Integrity** - Never manually edit financial records in the database
2. **Backups** - Maintain regular database backups before bulk operations
3. **Testing** - Test thoroughly with sample data before processing real transactions
4. **Audit Trail** - All actions are logged for compliance and debugging
5. **Reversals** - Use the reversal system instead of deleting records

---

**Built with precision for production use. Handle with care. 💼**
