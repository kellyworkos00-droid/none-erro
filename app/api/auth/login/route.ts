import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, generateToken, toPublicUser, type UserRole } from '@/lib/auth';
import { loginSchema } from '@/lib/validations';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit';

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        createErrorResponse('Invalid input', 'VALIDATION_ERROR', validation.error.errors),
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        createErrorResponse('Invalid credentials', 'INVALID_CREDENTIALS'),
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        createErrorResponse('Account is disabled', 'ACCOUNT_DISABLED'),
        { status: 403 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        createErrorResponse('Invalid credentials', 'INVALID_CREDENTIALS'),
        { status: 401 }
      );
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Create audit log
    await createAuditLog({
      userId: user.id,
      action: 'LOGIN',
      description: `User ${user.email} logged in`,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
    });

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
    });

    return NextResponse.json(
      createSuccessResponse({
        token,
        user: toPublicUser(user),
      }, 'Login successful'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
