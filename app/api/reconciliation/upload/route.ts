import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authorization';
import { createErrorResponse, createSuccessResponse, generateTransactionId } from '@/lib/utils';
import { parseStatement } from '@/lib/statement-parser';
import prisma from '@/lib/prisma';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit';

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '10') * 1024 * 1024;

/**
 * POST /api/reconciliation/upload
 * Upload and process bank statement
 * 
 * Security: Finance staff and above only
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication & Authorization
    const user = await requirePermission(request, 'reconciliation.upload');

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        createErrorResponse('No file provided', 'NO_FILE'),
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        createErrorResponse(
          `File size exceeds maximum of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
          'FILE_TOO_LARGE'
        ),
        { status: 400 }
      );
    }

    // Validate file type
    const allowedExtensions = ['csv', 'xlsx', 'xls'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      return NextResponse.json(
        createErrorResponse(
          'Invalid file type. Only CSV and Excel files are allowed',
          'INVALID_FILE_TYPE'
        ),
        { status: 400 }
      );
    }

    // Read file content
    const buffer = Buffer.from(await file.arrayBuffer());
    const content = fileExtension === 'csv' ? buffer.toString('utf-8') : buffer;

    // Parse statement
    const parseResult = parseStatement(file.name, content);

    if (!parseResult.success) {
      return NextResponse.json(
        createErrorResponse(
          'Failed to parse statement',
          'PARSE_ERROR',
          { errors: parseResult.errors }
        ),
        { status: 400 }
      );
    }

    if (parseResult.transactions.length === 0) {
      return NextResponse.json(
        createErrorResponse('No valid transactions found in file', 'NO_TRANSACTIONS'),
        { status: 400 }
      );
    }

    // Generate upload ID for tracking
    const statementUploadId = generateTransactionId('UPLOAD');

    // Import transactions to database
    type ImportError = { transactionId: string; error: string };

    const importResults = {
      total: parseResult.transactions.length,
      imported: 0,
      duplicates: 0,
      failed: 0,
      errors: [] as ImportError[],
    };

    for (const txn of parseResult.transactions) {
      try {
        // Check if transaction already exists (prevent duplicate imports)
        const existing = await prisma.bankTransaction.findUnique({
          where: { bankTransactionId: txn.bankTransactionId },
        });

        if (existing) {
          importResults.duplicates++;
          importResults.errors.push({
            transactionId: txn.bankTransactionId,
            error: 'Transaction already exists',
          });
          continue;
        }

        // Create bank transaction record
        await prisma.bankTransaction.create({
          data: {
            bankTransactionId: txn.bankTransactionId,
            transactionDate: txn.transactionDate,
            valueDate: txn.valueDate,
            amount: txn.amount,
            currency: txn.currency,
            reference: txn.reference,
            debitAccount: txn.debitAccount,
            creditAccount: txn.creditAccount,
            balance: txn.balance,
            status: 'PENDING',
            statementFileName: file.name,
            statementUploadId,
            rowNumber: txn.rowNumber,
            importedBy: user.userId,
          },
        });

        importResults.imported++;
      } catch (error) {
        importResults.failed++;
        importResults.errors.push({
          transactionId: txn.bankTransactionId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Create audit log
    await createAuditLog({
      userId: user.userId,
      action: 'UPLOAD_STATEMENT',
      description: `Uploaded bank statement: ${file.name} (${importResults.imported} transactions)`,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        uploadId: statementUploadId,
        results: importResults,
      },
    });

    return NextResponse.json(
      createSuccessResponse(
        {
          uploadId: statementUploadId,
          fileName: file.name,
          results: importResults,
        },
        `Successfully imported ${importResults.imported} transactions`
      ),
      { status: 200 }
    );
  } catch (error) {
    console.error('Upload error:', error);

    if (error instanceof Error) {
      if (error.message.includes('Forbidden')) {
        return NextResponse.json(
          createErrorResponse('Insufficient permissions', 'FORBIDDEN'),
          { status: 403 }
        );
      }
      if (error.message === 'Unauthorized') {
        return NextResponse.json(
          createErrorResponse('Unauthorized', 'UNAUTHORIZED'),
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
