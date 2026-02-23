import prisma from '@/lib/prisma';
import type { TransactionClient } from '@/lib/types';

interface AdjustStockInput {
  prisma?: TransactionClient;
  locationId: string;
  productId: string;
  quantityDelta: number;
  reference?: string;
  reason?: string;
  createdById: string;
}

export async function adjustStockLevel(input: AdjustStockInput) {
  const execute = async (tx: TransactionClient) => {
    const location = await tx.warehouseLocation.findUnique({
      where: { id: input.locationId },
      select: { warehouseId: true },
    });

    if (!location) {
      throw new Error('Location not found');
    }

    const level = await tx.stockLevel.upsert({
      where: {
        productId_locationId: {
          productId: input.productId,
          locationId: input.locationId,
        },
      },
      update: {
        quantity: { increment: input.quantityDelta },
      },
      create: {
        productId: input.productId,
        warehouseId: location.warehouseId,
        locationId: input.locationId,
        quantity: input.quantityDelta,
      },
    });

    await tx.product.update({
      where: { id: input.productId },
      data: { quantity: { increment: input.quantityDelta } },
    });

    await tx.stockMovement.create({
      data: {
        productId: input.productId,
        warehouseId: location.warehouseId,
        locationId: input.locationId,
        quantity: input.quantityDelta,
        movementType: 'ADJUSTMENT',
        referenceType: input.reference ? 'MANUAL' : null,
        referenceId: input.reference || null,
        notes: input.reason || null,
        createdBy: input.createdById,
      },
    });

    return level;
  };

  // If prisma is provided, it's already a transaction client
  if (input.prisma) {
    return execute(input.prisma);
  }

  // Otherwise, create a new transaction
  return prisma.$transaction(execute);
}

interface MoveStockInput {
  prisma?: TransactionClient;
  fromLocationId: string;
  toLocationId: string;
  productId: string;
  quantity: number;
  reference?: string;
  reason?: string;
  createdById: string;
}

export async function moveStockBetweenLocations(input: MoveStockInput) {
  const execute = async (tx: TransactionClient) => {
    const [fromLocation, toLocation] = await Promise.all([
      tx.warehouseLocation.findUnique({
        where: { id: input.fromLocationId },
        select: { warehouseId: true },
      }),
      tx.warehouseLocation.findUnique({
        where: { id: input.toLocationId },
        select: { warehouseId: true },
      }),
    ]);

    if (!fromLocation || !toLocation) {
      throw new Error('Location not found');
    }

    const fromLevel = await tx.stockLevel.findUnique({
      where: {
        productId_locationId: {
          productId: input.productId,
          locationId: input.fromLocationId,
        },
      },
    });

    if (!fromLevel || fromLevel.quantity < input.quantity) {
      throw new Error('Insufficient stock in source location');
    }

    await tx.stockLevel.update({
      where: { id: fromLevel.id },
      data: { quantity: { decrement: input.quantity } },
    });

    await tx.stockLevel.upsert({
      where: {
        productId_locationId: {
          productId: input.productId,
          locationId: input.toLocationId,
        },
      },
      update: { quantity: { increment: input.quantity } },
      create: {
        productId: input.productId,
        warehouseId: toLocation.warehouseId,
        locationId: input.toLocationId,
        quantity: input.quantity,
      },
    });

    await tx.stockMovement.create({
      data: {
        productId: input.productId,
        warehouseId: fromLocation.warehouseId,
        locationId: input.fromLocationId,
        quantity: -input.quantity,
        movementType: 'TRANSFER_OUT',
        referenceType: input.reference ? 'TRANSFER' : null,
        referenceId: input.reference || null,
        notes: input.reason || null,
        createdBy: input.createdById,
      },
    });

    await tx.stockMovement.create({
      data: {
        productId: input.productId,
        warehouseId: toLocation.warehouseId,
        locationId: input.toLocationId,
        quantity: input.quantity,
        movementType: 'TRANSFER_IN',
        referenceType: input.reference ? 'TRANSFER' : null,
        referenceId: input.reference || null,
        notes: input.reason || null,
        createdBy: input.createdById,
      },
    });
  };

  // If prisma is provided, it's already a transaction client
  if (input.prisma) {
    return execute(input.prisma);
  }

  // Otherwise, create a new transaction
  return prisma.$transaction(execute);
}
