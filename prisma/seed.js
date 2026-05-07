require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    console.log('🌱 Starting seed...');
    
    // Try multiple candidate files (CSV or JSON)
    const candidates = [
      'moe_students_batch_001.csv',
      
    ].map(f => path.join(process.cwd(), 'sample-data', f));

    let filePath = null;
    for (const c of candidates) if (fs.existsSync(c)) { filePath = c; break }
    if (!filePath) throw new Error('No sample file found in sample-data (checked moe_students_v1.csv, moe_students_batch_001.csv, moe_students_v1.json)');

    console.log('📁 Reading file:', filePath);

    const ext = path.extname(filePath).toLowerCase();
    let records = [];
    if (ext === '.csv' || ext === '.txt') {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const { parse } = require('csv-parse/sync');
      records = parse(fileContent, { columns: true, skip_empty_lines: true });
    } else if (ext === '.json') {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(fileContent);
      records = Array.isArray(parsed) ? parsed : parsed.students || [];
    } else {
      throw new Error('Unsupported sample file format: ' + ext);
    }

    console.log(`📚 Found ${records.length} students to import`);

    // Clear existing data
    await prisma.student.deleteMany({});
    console.log('🧹 Cleared existing students');

    // Reset Postgres serial sequence so IDs start from 1
    try {
      await prisma.$executeRawUnsafe('ALTER SEQUENCE "Student_id_seq" RESTART WITH 1');
      console.log('🔁 Reset Student_id_seq to start from 1');
    } catch (e) {
      console.warn('⚠️ Could not reset sequence Student_id_seq:', e && e.message);
    }

    // Prepare batches and insert using createMany for performance
    const BATCH_SIZE = 1000;
    let batch = [];
    let totalInserted = 0;

    for (const r of records) {
  try {
    const dob = r.dateOfBirth ? new Date(r.dateOfBirth) : null;
    const math = r.mathScore ? Number(r.mathScore) : null;
    const eng = r.englishScore ? Number(r.englishScore) : null;
    
    // ✅ CALCULATE TOTAL
    const total = (math || 0) + (eng || 0);

    batch.push({
      examID: String(r.examID).trim(),
      dateOfBirth: dob,
      studentNationalID: r.studentNationalID || null,
      firstName: r.firstName || null,
      lastName: r.lastName || null,
      email: r.email || null,
      phone: r.phone || null,
      region: r.region || null,
      // ✅ STORE TOTAL IN examResults
      examResults: { 
        mathematics: math, 
        english: eng,
        total: total
      },
      
      dataVersion: null,
      lastSyncedAt: null
    });
      } catch (e) {
        console.warn('⚠️ Skipping record due to parse error', e && e.message);
      }
    }

    if (batch.length > 0) {
      const res = await prisma.student.createMany({ data: batch, skipDuplicates: true });
      totalInserted += res.count ?? 0;
    }

    // Verify the import
    const count = await prisma.student.count();
    console.log(`✅ Successfully imported ${totalInserted} students (DB count: ${count})!`);

  } catch (error) {
    console.error('❌ Error during seed:', error);
  } finally {
    await prisma.$disconnect();
    console.log('👋 Disconnected from database');
  }
}

main();