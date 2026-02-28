import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authorization';
import { createSuccessResponse } from '@/lib/utils';

/**
 * GET /api/messages/templates
 * Get available message templates
 */
export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'customer.view');

    const templates = [
      {
        id: 'payment_reminder',
        name: 'Payment Reminder',
        category: 'PAYMENT',
        description: 'Remind customer about outstanding balance',
        template: 'Hi {customerName},\n\nThis is a friendly reminder that you have an outstanding balance of KES {balance}.\n\nPlease contact us to arrange payment.\n\nThank you,\nElegant Steel',
        variables: ['customerName', 'balance'],
      },
      {
        id: 'promotion',
        name: 'Promotion Offer',
        category: 'PROMOTION',
        description: 'Special discount or offer',
        template: 'Hi {customerName},\n\nSpecial offer! Get {discount}% off your next order.\n\nContact us today to take advantage of this limited-time offer.\n\nElegant Steel',
        variables: ['customerName', 'discount'],
      },
      {
        id: 'delivery',
        name: 'Delivery Notification',
        category: 'GENERAL',
        description: 'Notify customer about delivery',
        template: 'Hi {customerName},\n\nYour order {orderNumber} has been dispatched and will be delivered soon.\n\nThank you for your business!\n\nElegant Steel',
        variables: ['customerName', 'orderNumber'],
      },
      {
        id: 'announcement',
        name: 'General Announcement',
        category: 'ANNOUNCEMENT',
        description: 'General business announcement',
        template: 'Hi {customerName},\n\n{announcement}\n\nThank you,\nElegant Steel',
        variables: ['customerName', 'announcement'],
      },
      {
        id: 'thank_you',
        name: 'Thank You Message',
        category: 'GENERAL',
        description: 'Thank customer for their business',
        template: 'Hi {customerName},\n\nThank you for your business! We appreciate your continued support.\n\nElegant Steel',
        variables: ['customerName'],
      },
      {
        id: 'new_product',
        name: 'New Product Announcement',
        category: 'ANNOUNCEMENT',
        description: 'Announce new product',
        template: 'Hi {customerName},\n\nWe have a new product: {productName}!\n\nContact us for more details and pricing.\n\nElegant Steel',
        variables: ['customerName', 'productName'],
      },
    ];

    return NextResponse.json(
      createSuccessResponse({
        templates,
        total: templates.length,
      })
    );
  } catch (error) {
    console.error('Error getting message templates:', error);
    return NextResponse.json(
      createSuccessResponse({
        templates: [],
        total: 0,
      })
    );
  }
}
