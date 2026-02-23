# Implementation Guide - Using New Security & Validation Utils

This guide shows how to integrate the new security utilities into existing API routes.

---

## Quick Reference

### New Modules
| Module | Purpose | Location |
|--------|---------|----------|
| `security.ts` | Input sanitization & validation | `lib/security.ts` |
| `errors.ts` | Error classes & handling | `lib/errors.ts` |
| `headers.ts` | Security headers & CORS | `lib/headers.ts` |
| `validation.ts` | Type-safe validation | `lib/validation.ts` |
| `response.ts` | Standardized API responses | `lib/response.ts` |

---

## Example 1: Simple API Endpoint with Error Handling

### Before (Current)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      take: 10,
    });
    
    return NextResponse.json(
      createSuccessResponse(users),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
```

### After (With New Utils)
```typescript
import { NextRequest } from 'next/server';
import { createApiResponse } from '@/lib/response';
import { ErrorLogger } from '@/lib/errors';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const api = createApiResponse(request);
  
  try {
    const users = await prisma.user.findMany({
      take: 10,
      where: { isActive: true },
    });
    
    return api.success(users, 'Users retrieved');
  } catch (error) {
    ErrorLogger.log(error, {
      action: 'GET /api/users',
      statusCode: 500,
    });
    throw error;
  }
}
```

---

## Example 2: POST with Validation

### Before
```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Manual validation
    if (!body.email) {
      return NextResponse.json(
        createErrorResponse('Email is required'),
        { status: 400 }
      );
    }

    if (!body.email.includes('@')) {
      return NextResponse.json(
        createErrorResponse('Invalid email'),
        { status: 400 }
      );
    }

    // Create user...
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error'),
      { status: 500 }
    );
  }
}
```

### After (With Zod Validation)
```typescript
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createApiResponse } from '@/lib/response';
import { parseRequestBody, getValidationErrorMessage } from '@/lib/validation';
import { ValidationError, ErrorLogger } from '@/lib/errors';
import prisma from '@/lib/prisma';

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  const api = createApiResponse(request);
  
  try {
    const { success, data, error } = await parseRequestBody(request, createUserSchema);

    if (!success) {
      throw new ValidationError(getValidationErrorMessage(error!));
    }

    // Data is type-safe now
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        firstName: data.firstName,
        lastName: data.lastName,
        password: await hashPassword(data.password),
      },
    });

    return api.created(user, 'User created');
  } catch (error) {
    ErrorLogger.logWithContext(error, 'system', 'POST /api/users');
    
    if (error instanceof ValidationError) {
      return api.error(error);
    }
    
    throw error;
  }
}
```

---

## Example 3: File Upload with Sanitization

### Before
```typescript
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file' }, { status: 400 });
    }

    // Save file directly (unsafe!)
    const buffer = await file.arrayBuffer();
    fs.writeFileSync(`./uploads/${file.name}`, buffer);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
```

### After (With Security)
```typescript
import { sanitizeFileUpload } from '@/lib/security';
import { createApiResponse } from '@/lib/response';
import { ValidationError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  const api = createApiResponse(request);
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw new ValidationError('File is required');
    }

    // Validate file
    const validation = sanitizeFileUpload(
      file.name,
      file.size,
      file.type,
      {
        maxSize: 52428800, // 50MB
        allowedMimes: ['text/csv', 'application/vnd.ms-excel'],
        allowedExtensions: ['csv', 'xls', 'xlsx'],
      }
    );

    if (!validation.valid) {
      throw new ValidationError(validation.error);
    }

    // Process file with sanitized name
    const buffer = await file.arrayBuffer();
    fs.writeFileSync(`./uploads/${validation.sanitizedName}`, buffer);

    return api.created({ filename: validation.sanitizedName });
  } catch (error) {
    if (error instanceof ValidationError) {
      return api.error(error);
    }
    throw error;
  }
}
```

---

## Example 4: Input Sanitization for XSS Prevention

### Before
```typescript
export async function POST(request: NextRequest) {
  try {
    const { name, description } = await request.json();

    // Directly save user input (XSS vulnerability!)
    const project = await prisma.project.create({
      data: {
        name: name,
        description: description,
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
```

### After (With Sanitization)
```typescript
import { sanitizeHtml, checkForAttackPatterns } from '@/lib/security';
import { createApiResponse } from '@/lib/response';
import { ValidationError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  const api = createApiResponse(request);
  
  try {
    const { name, description } = await request.json();

    // Check for attack patterns
    const nameCheck = checkForAttackPatterns(name);
    if (!nameCheck.safe) {
      throw new ValidationError(`Security threat detected: ${nameCheck.threat}`);
    }

    // Sanitize input
    const cleanName = sanitizeHtml(name);
    const cleanDescription = sanitizeHtml(description);

    const project = await prisma.project.create({
      data: {
        name: cleanName,
        description: cleanDescription,
      },
    });

    return api.created(project);
  } catch (error) {
    if (error instanceof ValidationError) {
      return api.error(error);
    }
    throw error;
  }
}
```

---

## Example 5: Permission-Based Access Control

### Before
```typescript
import { requirePermission } from '@/lib/authorization';

export async function DELETE(request: NextRequest, { params }) {
  try {
    await requirePermission(request, 'customer.delete');
    
    const user = await prisma.user.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    throw error;
  }
}
```

### After (With Error Classes)
```typescript
import { requirePermission } from '@/lib/authorization';
import { createApiResponse } from '@/lib/response';
import { NotFoundError, AuthorizationError } from '@/lib/errors';

export async function DELETE(request: NextRequest, { params }) {
  const api = createApiResponse(request);
  
  try {
    const user = await requirePermission(request, 'customer.delete');
    
    const target = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!target) {
      throw new NotFoundError('User');
    }

    if (user.id === params.id) {
      throw new AuthorizationError('Cannot delete your own account');
    }

    await prisma.user.delete({
      where: { id: params.id },
    });

    return api.noContent();
  } catch (error) {
    if (error instanceof (NotFoundError || AuthorizationError)) {
      return api.error(error);
    }
    throw error;
  }
}
```

---

## Example 6: Batch Validation

### Before
```typescript
export async function POST(request: NextRequest) {
  try {
    const { items } = await request.json();

    // No validation of array items
    const results = await Promise.all(
      items.map(item => 
        prisma.expense.create({ data: item })
      )
    );

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
```

### After (With Batch Validation)
```typescript
import { validateBatch } from '@/lib/validation';
import { createApiResponse } from '@/lib/response';
import { ValidationError } from '@/lib/errors';
import { z } from 'zod';

const expenseSchema = z.object({
  amount: z.number().positive(),
  category: z.string(),
  description: z.string(),
});

export async function POST(request: NextRequest) {
  const api = createApiResponse(request);
  
  try {
    const { items } = await request.json();

    const validation = validateBatch(items, expenseSchema, 100);

    if (!validation.success) {
      throw new ValidationError('Batch validation failed', validation.errors);
    }

    const results = await Promise.all(
      validation.data!.map(item =>
        prisma.expense.create({ data: item })
      )
    );

    return api.created(results, `Created ${results.length} expenses`);
  } catch (error) {
    if (error instanceof ValidationError) {
      return api.error(error);
    }
    throw error;
  }
}
```

---

## Example 7: Query Parameter Validation

### Before
```typescript
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page');
    const limit = searchParams.get('limit');

    // Manual parsing (error-prone)
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 20;

    const users = await prisma.user.findMany({
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    });

    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
```

### After (Type-Safe)
```typescript
import { validateQuery } from '@/lib/validation';
import { createApiResponse } from '@/lib/response';
import { ValidationError } from '@/lib/errors';
import { z } from 'zod';

const querySchema = z.object({
  page: z.string().default('1').transform(Number),
  limit: z.string().default('20').transform(Number),
  search: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const api = createApiResponse(request);
  
  try {
    const { searchParams } = new URL(request.url);
    const { success, data, error } = validateQuery(searchParams, querySchema);

    if (!success) {
      throw new ValidationError('Invalid query parameters', error);
    }

    const users = await prisma.user.findMany({
      skip: (data.page - 1) * data.limit,
      take: data.limit,
      ...(data.search && {
        where: {
          OR: [
            { email: { contains: data.search, mode: 'insensitive' } },
            { firstName: { contains: data.search, mode: 'insensitive' } },
          ],
        },
      }),
    });

    return api.paginated(users, {
      page: data.page,
      limit: data.limit,
      total: await prisma.user.count(),
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return api.error(error);
    }
    throw error;
  }
}
```

---

## Integration Checklist

When updating existing endpoints:

- [ ] Replace `createErrorResponse` with error classes
- [ ] Replace `createSuccessResponse` with `createApiResponse`
- [ ] Add Zod schemas for request validation
- [ ] Use `parseRequestBody` for body parsing
- [ ] Use `validateQuery` for query params
- [ ] Add input sanitization where needed
- [ ] Use `ErrorLogger` for error logging
- [ ] Test with invalid/malicious input

---

## Error Handling Pattern

```typescript
import { createApiResponse } from '@/lib/response';
import { ErrorLogger, AppError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  const api = createApiResponse(request);
  
  try {
    // Your endpoint logic
    const result = await someOperation();
    return api.success(result);
  } catch (error) {
    // Log error with context
    ErrorLogger.logWithContext(error, userId, 'operation_name');
    
    // Handle specific errors
    if (error instanceof SpecificError) {
      return api.error(error);
    }
    
    // Re-throw for global handler
    throw error;
  }
}
```

---

## Testing the New Utils

```typescript
import { sanitizeHtml, checkForAttackPatterns } from '@/lib/security';
import { ValidationError } from '@/lib/errors';

// Test XSS prevention
console.assert(
  sanitizeHtml('<script>alert("xss")</script>') === 'scriptalertxssscript',
  'XSS sanitization failed'
);

// Test attack detection
const result = checkForAttackPatterns('DROP TABLE users');
console.assert(result.safe === false, 'SQL injection not detected');

// Test error handling
try {
  throw new ValidationError('Test error', { field: 'test' });
} catch (error) {
  console.assert(error instanceof ValidationError, 'Error class mismatch');
}
```

---

**Next Steps:**
1. Start refactoring high-priority endpoints
2. Add comprehensive tests
3. Update documentation
4. Deploy to staging environment
5. Run security audit
