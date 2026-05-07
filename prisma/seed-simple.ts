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