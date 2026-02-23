/**
 * Bank Statement Parser
 * 
 * Securely parse DTB bank statements from CSV or Excel format
 * Production-ready with validation and error handling
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { parseAmount, parseDate } from './utils';

export interface ParsedTransaction {
  bankTransactionId: string;
  transactionDate: Date;
  valueDate?: Date;
  amount: number;
  reference: string;
  debitAccount?: string;
  creditAccount?: string;
  balance?: number;
  currency: string;
  rowNumber: number;
}

export interface ParseResult {
  success: boolean;
  transactions: ParsedTransaction[];
  errors: Array<{
    row: number;
    message: string;
  }>;
  totalRows: number;
  validRows: number;
}

/**
 * Parse CSV bank statement
 * @param fileContent - CSV file content as string
 * @returns Parse result with transactions and errors
 */
export function parseCSV(fileContent: string): ParseResult {
  const result: ParseResult = {
    success: false,
    transactions: [],
    errors: [],
    totalRows: 0,
    validRows: 0,
  };

  try {
    const parsed = Papa.parse<Record<string, string>>(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    result.totalRows = parsed.data.length;

    if (parsed.errors.length > 0) {
      parsed.errors.forEach((error) => {
        result.errors.push({
          row: error.row || 0,
          message: error.message,
        });
      });
    }

    // Process each row
    parsed.data.forEach((row: Record<string, string>, index: number) => {
      try {
        const rowNumber = index + 2; // +2 because index starts at 0 and we skip header

        // Validate required fields
        if (!row['Transaction Date'] || !row['Transaction ID']) {
          result.errors.push({
            row: rowNumber,
            message: 'Missing required fields',
          });
          return;
        }

        // Determine amount (Credit or Debit)
        let amount = 0;
        const creditValue = String(row['Credit'] || '').replace(/,/g, '');
        const debitValue = String(row['Debit'] || '').replace(/,/g, '');

        if (creditValue && parseFloat(creditValue) > 0) {
          amount = parseAmount(creditValue);
        } else if (debitValue && parseFloat(debitValue) > 0) {
          amount = parseAmount(debitValue);
        } else {
          result.errors.push({
            row: rowNumber,
            message: 'No valid amount found in Credit or Debit column',
          });
          return;
        }

        // Parse transaction
        const transaction: ParsedTransaction = {
          bankTransactionId: String(row['Transaction ID']).trim(),
          transactionDate: parseDate(String(row['Transaction Date'])),
          valueDate: row['Value Date'] ? parseDate(String(row['Value Date'])) : undefined,
          amount,
          reference: String(row['Reference'] || '').trim(),
          balance: row['Balance'] ? parseAmount(String(row['Balance'])) : undefined,
          currency: 'KES',
          rowNumber,
        };

        // Validate transaction ID is unique in this batch
        const duplicate = result.transactions.find(
          (t) => t.bankTransactionId === transaction.bankTransactionId
        );

        if (duplicate) {
          result.errors.push({
            row: rowNumber,
            message: `Duplicate transaction ID: ${transaction.bankTransactionId}`,
          });
          return;
        }

        result.transactions.push(transaction);
        result.validRows++;
      } catch (error) {
        result.errors.push({
          row: index + 2,
          message: error instanceof Error ? error.message : 'Failed to parse row',
        });
      }
    });

    result.success = result.validRows > 0;
  } catch (error) {
    result.errors.push({
      row: 0,
      message: error instanceof Error ? error.message : 'Failed to parse CSV',
    });
  }

  return result;
}

/**
 * Parse Excel bank statement
 * @param buffer - Excel file buffer
 * @returns Parse result with transactions and errors
 */
export function parseExcel(buffer: Buffer): ParseResult {
  const result: ParseResult = {
    success: false,
    transactions: [],
    errors: [],
    totalRows: 0,
    validRows: 0,
  };

  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Use first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      result.errors.push({
        row: 0,
        message: 'No sheets found in Excel file',
      });
      return result;
    }

    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
      raw: false,
      defval: '',
    });

    result.totalRows = data.length;

    // Process each row
    data.forEach((row: Record<string, string>, index: number) => {
      try {
        const rowNumber = index + 2; // +2 for header and 0-based index

        // Validate required fields - try different possible column names
        const transactionDate =
          row['Transaction Date'] || row['Date'] || row['Trans. Date'];
        const transactionId =
          row['Transaction ID'] || row['Transaction No'] || row['Trans. ID'] || row['Reference No'];
        const reference = row['Reference'] || row['Description'] || row['Narration'];

        if (!transactionDate || !transactionId) {
          result.errors.push({
            row: rowNumber,
            message: 'Missing required fields (Date or Transaction ID)',
          });
          return;
        }

        // Determine amount
        let amount = 0;
        const credit = row['Credit'] || row['Credit Amount'] || row['Deposit'];
        const debit = row['Debit'] || row['Debit Amount'] || row['Withdrawal'];

        if (credit && parseFloat(String(credit).replace(/,/g, '')) > 0) {
          amount = parseAmount(String(credit));
        } else if (debit && parseFloat(String(debit).replace(/,/g, '')) > 0) {
          amount = parseAmount(String(debit));
        } else {
          result.errors.push({
            row: rowNumber,
            message: 'No valid amount found',
          });
          return;
        }

        // Parse transaction
        const transaction: ParsedTransaction = {
          bankTransactionId: String(transactionId).trim(),
          transactionDate: parseDate(transactionDate),
          valueDate: row['Value Date'] ? parseDate(row['Value Date']) : undefined,
          amount,
          reference: String(reference || '').trim(),
          balance: row['Balance'] ? parseAmount(String(row['Balance'])) : undefined,
          currency: 'KES',
          rowNumber,
        };

        // Check for duplicates
        const duplicate = result.transactions.find(
          (t) => t.bankTransactionId === transaction.bankTransactionId
        );

        if (duplicate) {
          result.errors.push({
            row: rowNumber,
            message: `Duplicate transaction ID: ${transaction.bankTransactionId}`,
          });
          return;
        }

        result.transactions.push(transaction);
        result.validRows++;
      } catch (error) {
        result.errors.push({
          row: index + 2,
          message: error instanceof Error ? error.message : 'Failed to parse row',
        });
      }
    });

    result.success = result.validRows > 0;
  } catch (error) {
    result.errors.push({
      row: 0,
      message: error instanceof Error ? error.message : 'Failed to parse Excel file',
    });
  }

  return result;
}

/**
 * Validate file type and parse accordingly
 * @param fileName - Name of the file
 * @param fileContent - File content (string for CSV, Buffer for Excel)
 * @returns Parse result
 */
export function parseStatement(
  fileName: string,
  fileContent: string | Buffer
): ParseResult {
  const extension = fileName.split('.').pop()?.toLowerCase();

  if (extension === 'csv') {
    if (typeof fileContent !== 'string') {
      return {
        success: false,
        transactions: [],
        errors: [{ row: 0, message: 'Invalid file content for CSV' }],
        totalRows: 0,
        validRows: 0,
      };
    }
    return parseCSV(fileContent);
  } else if (extension === 'xlsx' || extension === 'xls') {
    if (Buffer.isBuffer(fileContent)) {
      return parseExcel(fileContent);
    } else {
      return {
        success: false,
        transactions: [],
        errors: [{ row: 0, message: 'Invalid file content for Excel' }],
        totalRows: 0,
        validRows: 0,
      };
    }
  } else {
    return {
      success: false,
      transactions: [],
      errors: [{ row: 0, message: `Unsupported file type: ${extension}` }],
      totalRows: 0,
      validRows: 0,
    };
  }
}
