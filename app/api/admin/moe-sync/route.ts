import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import Papa from 'papaparse';

const prisma = new PrismaClient();

interface StudentRecord {
  examID: string;
  dateOfBirth: string; // Format: YYYY-MM-DD
  studentNationalID: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  region?: string;
  examResults?: string; // JSON string
}

interface SyncResponse {
  success: boolean;
  message: string;
  summary: {
    totalRecords: number;
    addedRecords: number;
    updatedRecords: number;
    unchangedRecords: number;
    deactivatedRecords: number;
  };
  dataVersion: string;
  errors?: { rowIndex: number; error: string }[];
}

async function parseCSVFile(file: File): Promise<StudentRecord[]> {
  const text = await file.text();
  
  return new Promise((resolve, reject) => {
    Papa.parse<StudentRecord>(text, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error(`CSV parsing error: ${results.errors[0].message}`));
        }
        resolve(results.data);
      },
      error: (error) => {
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      },
    });
  });
}

async function parseJSONFile(file: File): Promise<StudentRecord[]> {
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : data.students || [];
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${(error as Error).message}`);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<SyncResponse>> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const dataVersion = (formData.get('dataVersion') as string) || new Date().toISOString();

    // Validation
    if (!file) {
      return NextResponse.json(
        {
          success: false,
          message: 'No file provided. Please upload a CSV or JSON file.',
          summary: { totalRecords: 0, addedRecords: 0, updatedRecords: 0, unchangedRecords: 0, deactivatedRecords: 0 },
          dataVersion: '',
        },
        { status: 400 }
      );
    }

    if (!['text/csv', 'application/json', 'text/plain'].includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid file type. Please upload a CSV or JSON file.',
          summary: { totalRecords: 0, addedRecords: 0, updatedRecords: 0, unchangedRecords: 0, deactivatedRecords: 0 },
          dataVersion: '',
        },
        { status: 400 }
      );
    }

    // Check if this version already exists
    const existingSync = await prisma.moESyncLog.findUnique({
      where: { dataVersion },
    });

    if (existingSync) {
      return NextResponse.json(
        {
          success: false,
          message: `Data version "${dataVersion}" already synced. Please use a different version number.`,
          summary: { totalRecords: 0, addedRecords: 0, updatedRecords: 0, unchangedRecords: 0, deactivatedRecords: 0 },
          dataVersion,
        },
        { status: 409 }
      );
    }

    // Parse file based on type
    let records: StudentRecord[] = [];
    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      records = await parseCSVFile(file);
    } else {
      records = await parseJSONFile(file);
    }

    if (records.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'No valid records found in the file.',
          summary: { totalRecords: 0, addedRecords: 0, updatedRecords: 0, unchangedRecords: 0, deactivatedRecords: 0 },
          dataVersion,
        },
        { status: 400 }
      );
    }

    // Track sync statistics
    const stats = {
      totalRecords: records.length,
      addedRecords: 0,
      updatedRecords: 0,
      unchangedRecords: 0,
      deactivatedRecords: 0,
    };
    const errors: { rowIndex: number; error: string }[] = [];
    const examIDsInFile = new Set<string>();

    // Process each record
    for (let i = 0; i < records.length; i++) {
      try {
        const record = records[i];

        // Validate required fields
        if (!record.examID || !record.dateOfBirth || !record.studentNationalID) {
          errors.push({
            rowIndex: i + 1,
            error: 'Missing required fields: examID, dateOfBirth, studentNationalID',
          });
          continue;
        }

        examIDsInFile.add(record.examID);

        // Parse date of birth
        const dateOfBirth = new Date(record.dateOfBirth);
        if (isNaN(dateOfBirth.getTime())) {
          errors.push({
            rowIndex: i + 1,
            error: `Invalid date format: ${record.dateOfBirth}. Use YYYY-MM-DD.`,
          });
          continue;
        }

        // Check if student exists
        const existingStudent = await prisma.student.findUnique({
          where: { examID: record.examID },
        });

        if (existingStudent) {
          // Check if record has changed
          const hasChanged =
            existingStudent.dateOfBirth.getTime() !== dateOfBirth.getTime() ||
            existingStudent.studentNationalID !== record.studentNationalID ||
            existingStudent.firstName !== record.firstName ||
            existingStudent.lastName !== record.lastName ||
            existingStudent.email !== (record.email || null) ||
            existingStudent.phone !== (record.phone || null) ||
            existingStudent.region !== (record.region || null);

          if (hasChanged) {
            // Update existing student
            await prisma.student.update({
              where: { examID: record.examID },
              data: {
                dateOfBirth,
                studentNationalID: record.studentNationalID,
                firstName: record.firstName,
                lastName: record.lastName,
                email: record.email || null,
                phone: record.phone || null,
                region: record.region || null,
                examResults: record.examResults ? JSON.parse(record.examResults) : null,
                dataVersion,
                lastSyncedAt: new Date(),
                isActive: true,
              },
            });
            stats.updatedRecords++;
          } else {
            // Record unchanged
            stats.unchangedRecords++;
          }
        } else {
          // Create new student
          await prisma.student.create({
            data: {
              examID: record.examID,
              dateOfBirth,
              studentNationalID: record.studentNationalID,
              firstName: record.firstName,
              lastName: record.lastName,
              email: record.email || null,
              phone: record.phone || null,
              region: record.region || null,
              examResults: record.examResults ? JSON.parse(record.examResults) : null,
              dataVersion,
              lastSyncedAt: new Date(),
              isActive: true,
            },
          });
          stats.addedRecords++;
        }
      } catch (error) {
        errors.push({
          rowIndex: i + 1,
          error: `Error processing record: ${(error as Error).message}`,
        });
      }
    }

    // Mark students not in the new file as inactive
    const allStudents = await prisma.student.findMany({
      where: { isActive: true },
    });

    for (const student of allStudents) {
      if (!examIDsInFile.has(student.examID)) {
        await prisma.student.update({
          where: { id: student.id },
          data: { isActive: false },
        });
        stats.deactivatedRecords++;
      }
    }

    // Log the sync
    const syncStatus = errors.length === 0 ? 'success' : errors.length < records.length ? 'partial' : 'failed';
    await prisma.moESyncLog.create({
      data: {
        dataVersion,
        fileName: file.name,
        totalRecords: stats.totalRecords,
        addedRecords: stats.addedRecords,
        updatedRecords: stats.updatedRecords,
        unchangedRecords: stats.unchangedRecords,
        deactivatedRecords: stats.deactivatedRecords,
        syncStatus,
        syncMessage: errors.length > 0 ? `${errors.length} records had errors` : 'All records synced successfully',
      },
    });

    return NextResponse.json(
      {
        success: syncStatus === 'success',
        message:
          syncStatus === 'success'
            ? 'MOE data synchronized successfully'
            : syncStatus === 'partial'
              ? 'MOE data synchronized with some errors'
              : 'MOE data synchronization failed',
        summary: stats,
        dataVersion,
        ...(errors.length > 0 && { errors }),
      },
      { status: syncStatus === 'success' ? 200 : syncStatus === 'partial' ? 207 : 400 }
    );
  } catch (error) {
    console.error('MOE Sync Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: `Sync failed: ${(error as Error).message}`,
        summary: { totalRecords: 0, addedRecords: 0, updatedRecords: 0, unchangedRecords: 0, deactivatedRecords: 0 },
        dataVersion: '',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    const syncLogs = await prisma.moESyncLog.findMany({
      orderBy: { syncedAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      message: 'Retrieved recent MOE sync logs',
      data: syncLogs,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: `Failed to retrieve sync logs: ${(error as Error).message}`,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
