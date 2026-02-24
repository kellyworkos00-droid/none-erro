import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { errorResponse, successResponse } from '@/lib/response';

/**
 * GET /api/socket.io endpoint info
 * This endpoint provides WebSocket connection information
 * The actual Socket.IO server is initialized in lib/websocket-manager.ts
 * and connected via a custom server configuration if needed
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    return successResponse({
      data: {
        message: 'WebSocket connection available',
        userId: user.id,
        socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL || `${process.env.NEXT_PUBLIC_APP_URL || ''}`,
      },
    });
  } catch (error) {
    console.error('Error getting socket info:', error);
    return errorResponse('Failed to get socket info', 500);
  }
}
