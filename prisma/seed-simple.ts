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
        examID: "EXM-2024-007",
        dateOfBirth: new Date("2004-06-22"),
        studentNationalID: "1000000000007",
        firstName: "Bruk",
        lastName: "Assefa",
        email: "bruk@example.com",
        phone: "+251911111007",
        region: "Addis Ababa",
        examResults: { mathematics: 190, english: 185, physics: 75, chemistry: 70, biology: 68, total: 588 },
        gender: "Male",
        disability: "none",
        photo: "https://randomuser.me/api/portraits/men/3.jpg",
        school: "St. Joseph School",
        academicYear: "2024",
        isRegistered: false,
        status: "PASS"
      },
      {
        examID: "EXM-2024-009",
        dateOfBirth: new Date("2003-12-11"),
        studentNationalID: "1000000000009",
        firstName: "Betelhem",
        lastName: "Mekonnen",
        email: "betelhem@example.com",
        phone: "+251911111009",
        region: "Oromia",
        examResults: { mathematics: 180, english: 182, physics: 68, chemistry: 65, biology: 70, total: 565 },
        gender: "Female",
        disability: "none",
        photo: "https://randomuser.me/api/portraits/women/4.jpg",
        school: "Bishoftu Preparatory",
        academicYear: "2024",
        isRegistered: false,
        status: "PASS"
      },
      {
        examID: "EXM-2024-011",
        dateOfBirth: new Date("2005-01-30"),
        studentNationalID: "1000000000011",
        firstName: "Dawit",
        lastName: "Hailu",
        email: "dawit@example.com",
        phone: "+251911111011",
        region: "Amhara",
        examResults: { mathematics: 195, english: 188, physics: 80, chemistry: 78, biology: 75, total: 616 },
        gender: "Male",
        disability: "visual",
        photo: "https://randomuser.me/api/portraits/men/5.jpg",
        school: "Fasiladas School",
        academicYear: "2024",
        isRegistered: false,
        status: "PASS"
      },
      {
        examID: "EXM-2024-013",
        dateOfBirth: new Date("2004-04-18"),
        studentNationalID: "1000000000013",
        firstName: "Fasika",
        lastName: "Girma",
        email: "fasika@example.com",
        phone: "+251911111013",
        region: "Tigray",
        examResults: { mathematics: 170, english: 175, physics: 60, chemistry: 62, biology: 64, total: 531 },
        gender: "Female",
        disability: "none",
        photo: "https://randomuser.me/api/portraits/women/5.jpg",
        school: "Kalamino Special High School",
        academicYear: "2024",
        isRegistered: false,
        status: "PASS"
      },
      {
        examID: "EXM-2024-015",
        dateOfBirth: new Date("2003-09-05"),
        studentNationalID: "1000000000015",
        firstName: "Yosef",
        lastName: "Bekele",
        email: "yosef@example.com",
        phone: "+251911111015",
        region: "Dire Dawa",
        examResults: { mathematics: 188, english: 180, physics: 72, chemistry: 75, biology: 73, total: 588 },
        gender: "Male",
        disability: "none",
        photo: "https://randomuser.me/api/portraits/men/6.jpg",
        school: "Dire Dawa Preparatory",
        academicYear: "2024",
        isRegistered: false,
        status: "PASS"
      },
      {
        examID: "EXM-2024-017",
        dateOfBirth: new Date("2004-08-14"),
        studentNationalID: "1000000000017",
        firstName: "Mekdes",
        lastName: "Alemu",
        email: "mekdes@example.com",
        phone: "+251911111017",
        region: "SNNPR",
        examResults: { mathematics: 175, english: 178, physics: 65, chemistry: 60, biology: 66, total: 544 },
        gender: "Female",
        disability: "hearing",
        photo: "https://randomuser.me/api/portraits/women/6.jpg",
        school: "Hawassa Tabor",
        academicYear: "2024",
        isRegistered: false,
        status: "PASS"
      },
      {
        examID: "EXM-2024-019",
        dateOfBirth: new Date("2004-03-25"),
        studentNationalID: "1000000000019",
        firstName: "Samuel",
        lastName: "Tilahun",
        email: "samuel@example.com",
        phone: "+251911111019",
        region: "Sidama",
        examResults: { mathematics: 182, english: 184, physics: 70, chemistry: 72, biology: 68, total: 576 },
        gender: "Male",
        disability: "none",
        photo: "https://randomuser.me/api/portraits/men/7.jpg",
        school: "Yirgalem School",
        academicYear: "2024",
        isRegistered: false,
        status: "PASS"
      },
      {
        examID: "EXM-2024-021",
        dateOfBirth: new Date("2005-05-05"),
        studentNationalID: "1000000000021",
        firstName: "Rahel",
        lastName: "Dessie",
        email: "rahel@example.com",
        phone: "+251911111021",
        region: "Addis Ababa",
        examResults: { mathematics: 198, english: 195, physics: 85, chemistry: 82, biology: 80, total: 640 },
        gender: "Female",
        disability: "none",
        photo: "https://randomuser.me/api/portraits/women/7.jpg",
        school: "Ethio-Parents School",
        academicYear: "2024",
        isRegistered: false,
        status: "PASS"
      },
      {
        examID: "EXM-2024-023",
        dateOfBirth: new Date("2003-11-20"),
        studentNationalID: "1000000000023",
        firstName: "Kaleb",
        lastName: "Woldemariam",
        email: "kaleb@example.com",
        phone: "+251911111023",
        region: "Amhara",
        examResults: { mathematics: 172, english: 168, physics: 62, chemistry: 64, biology: 60, total: 526 },
        gender: "Male",
        disability: "physical",
        photo: "https://randomuser.me/api/portraits/men/8.jpg",
        school: "Bahir Dar Academy",
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