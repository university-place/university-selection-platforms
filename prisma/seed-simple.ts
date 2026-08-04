import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🌱 Starting seed...')
    
    // Clear existing data
    await prisma.student.deleteMany({})
    console.log('🧹 Cleared existing students')

    // Insert students with individual subject scores
    const students = [
      {
        examID: "EXM-2024-001",
        dateOfBirth: new Date("2004-05-15"),
        studentNationalID: "1000000000001",
        firstName: "Abebe",
        lastName: "Kebede",
        email: "abebe@example.com",
        phone: "+251911111001",
        region: "Addis Ababa",
        examResults: {
          mathematics: 185,
          english: 178,
          physics: 65,
          chemistry: 63,
          biology: 64,
          total: 555
        },
        status: "PASS",
        gender: "Male",
        disability: "none",
        school: "Addis Ababa University",
        photo: "https://randomuser.me/api/portraits/men/1.jpg",
        academicYear: "2024",
        isRegistered: false
      },
      {
        examID: "EXM-2024-003",
        dateOfBirth: new Date("2005-02-10"),
        studentNationalID: "1000000000003",
        firstName: "Habtamu",
        lastName: "Tadesse",
        email: "habtamu@example.com",
        phone: "+251911111003",
        region: "Bahir Dar",
        examResults: {
          mathematics: 176,
          english: 182,
          physics: 55,
          chemistry: 54,
          biology: 56,
          total: 523
        },
        status: "PASS",
        gender: "Male",
        disability: "none",
        school: "Bahir Dar University",
        photo: "https://randomuser.me/api/portraits/men/2.jpg",
        academicYear: "2024",
        isRegistered: false
      },
      {
        examID: "EXM-2024-005",
        dateOfBirth: new Date("2003-03-14"),
        studentNationalID: "1000000000005",
        firstName: "Senayit",
        lastName: "Wolde",
        email: "senayit@example.com",
        phone: "+251911111005",
        region: "Hawassa",
        examResults: {
          mathematics: 179,
          english: 181,
          physics: 63,
          chemistry: 62,
          biology: 63,
          total: 548
        },
        status: "PASS",
        gender: "Female",
        disability: "none",
        school: "Hawassa University",
        photo: "https://randomuser.me/api/portraits/women/1.jpg",
        academicYear: "2024",
        isRegistered: false
      },
      {
        examID: "EXM-2024-002",
        dateOfBirth: new Date("2003-08-22"),
        studentNationalID: "1000000000002",
        firstName: "Almaz",
        lastName: "Getnet",
        email: "redugetahun21@gmail.com",
        phone: "+251911111002",
        region: "Dire Dawa",
        examResults: { english: 188, history: 172, geography: 180, economics: 165, civics: 78, total: 540 },
        gender: "Female",
        disability: "visual",
        photo: "https://randomuser.me/api/portraits/women/1.jpg",
        school: "Tewodros High School",
        academicYear: "2024",
        isRegistered: false,
        status: "PASS"
      },
      {
        examID: "EXM-2024-004",
        dateOfBirth: new Date("2004-11-30"),
        studentNationalID: "1000000000004",
        firstName: "Eleni",
        lastName: "Tadesse",
        email: "eleni.t@example.com",
        phone: "+251911111004",
        region: "Mekele",
        examResults: { english: 190, history: 185, geography: 178, economics: 170, civics: 82, total: 553 },
        gender: "Female",
        disability: "none",
        photo: "https://randomuser.me/api/portraits/women/2.jpg",
        school: "Mekele Comprehensive Secondary School",
        academicYear: "2024",
        isRegistered: false,
        status: "PASS"
      },
      {
        examID: "EXM-2024-006",
        dateOfBirth: new Date("2004-07-18"),
        studentNationalID: "1000000000006",
        firstName: "Hanna",
        lastName: "Samuel",
        email: "hanna.s@example.com",
        phone: "+251911111006",
        region: "Gambela",
        examResults: { english: 190, history: 176, geography: 182, economics: 168, civics: 75, total: 548 },
        gender: "Female",
        disability: "hearing",
        photo: "https://randomuser.me/api/portraits/women/3.jpg",
        school: "Gambela Secondary School",
        academicYear: "2024",
        isRegistered: false,
        status: "PASS"
      },
      {
        examID: "EXM-2024-008",
        dateOfBirth: new Date("2004-09-25"),
        studentNationalID: "1000000000008",
        firstName: "Liya",
        lastName: "Negash",
        email: "liya.n@example.com",
        phone: "+251911111008",
        region: "Benshangul",
        examResults: { english: 176, history: 183, geography: 169, economics: 172, civics: 72, total: 528 },
        gender: "Female",
        disability: "physical",
        photo: "https://randomuser.me/api/portraits/women/4.jpg",
        school: "Benshangul Comprehensive School",
        academicYear: "2024",
        isRegistered: false,
        status: "PASS"
      },
      {
        examID: "EXM-2024-010",
        dateOfBirth: new Date("2005-01-20"),
        studentNationalID: "1000000000010",
        firstName: "Selam",
        lastName: "Abate",
        email: "selam.a@example.com",
        phone: "+251911111010",
        region: "Afar",
        examResults: { english: 164, history: 159, geography: 171, economics: 158, civics: 65, total: 494 },
        gender: "Female",
        disability: "none",
        photo: "https://randomuser.me/api/portraits/women/5.jpg",
        school: "Afar Preparatory School",
        academicYear: "2024",
        isRegistered: false,
        status: "PASS"
      },
      {
        examID: "EXM-2024-012",
        dateOfBirth: new Date("2003-10-10"),
        studentNationalID: "1000000000012",
        firstName: "Samuel",
        lastName: "Bekele",
        email: "samuel.b@example.com",
        phone: "+251911111012",
        region: "Oromia",
        examResults: { english: 180, history: 182, geography: 177, economics: 175, civics: 80, total: 539 },
        gender: "Male",
        disability: "learning",
        photo: "https://randomuser.me/api/portraits/men/1.jpg",
        school: "Oromia Preparatory School",
        academicYear: "2024",
        isRegistered: false,
        status: "PASS"
      },
      {
        examID: "EXM-2024-014",
        dateOfBirth: new Date("2003-05-05"),
        studentNationalID: "1000000000014",
        firstName: "Getachew",
        lastName: "Yared",
        email: "getachew.a@example.com",
        phone: "+251911111014",
        region: "Amhara",
        examResults: { english: 170, history: 173, geography: 168, economics: 165, civics: 72, total: 511 },
        gender: "Male",
        disability: "none",
        photo: "https://randomuser.me/api/portraits/men/2.jpg",
        school: "Amhara Science Academy",
        academicYear: "2024",
        isRegistered: false,
        status: "PASS"
      },
      {
        examID: "EXM-2024-016",
        dateOfBirth: new Date("2004-11-11"),
        studentNationalID: "1000000000016",
        firstName: "Mesfin",
        lastName: "Hailu",
        email: "mesfin.h@example.com",
        phone: "+251911111016",
        region: "Gambela",
        examResults: { english: 174, history: 178, geography: 172, economics: 168, civics: 70, total: 524 },
        gender: "Male",
        disability: "visual",
        photo: "https://randomuser.me/api/portraits/men/3.jpg",
        school: "Gambela Secondary School",
        academicYear: "2024",
        isRegistered: false,
        status: "PASS"
      },
      {
        examID: "EXM-2024-018",
        dateOfBirth: new Date("2003-03-03"),
        studentNationalID: "1000000000018",
        firstName: "Abel",
        lastName: "Fantu",
        email: "abel.f@example.com",
        phone: "+251911111018",
        region: "Harari",
        examResults: { english: 168, history: 165, geography: 171, economics: 160, civics: 68, total: 504 },
        gender: "Male",
        disability: "none",
        photo: "https://randomuser.me/api/portraits/men/4.jpg",
        school: "Harari Regional High School",
        academicYear: "2024",
        isRegistered: false,
        status: "PASS"
      }
    ]

    for (const student of students) {
      console.log(`📝 Importing: ${student.firstName} ${student.lastName} (${student.examID})`)
      await prisma.student.create({ data: student })
    }

    const count = await prisma.student.count()
    console.log(`✅ Successfully imported ${count} students!`)

    // Show example
    const example = await prisma.student.findFirst({
      where: { examID: "EXM-2024-003" }
    })
    if (example) {
      console.log('\n📊 Example student (EXM-2024-003):')
      console.log(JSON.stringify(example.examResults, null, 2))
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()