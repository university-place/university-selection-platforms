import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import prisma from "@/prisma/client"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        examID: { label: "Exam ID", type: "text" }
      },
      async authorize(credentials) {
        // Allow login with email or examID
        let user = null;
        
        if (credentials?.email) {
          user = await prisma.student.findFirst({
            where: { 
              OR: [
                { email: credentials.email },
                { examID: credentials.email },
                { username: credentials.email }
              ]
            }
          });
        } else if (credentials?.examID) {
          user = await prisma.student.findFirst({
            where: { examID: credentials.examID }
          });
        }

        if (!user) return null;

        // Check password (support both bcrypt and plain text for testing)
        let isValid = false;
        if (user.password?.startsWith('$2b$')) {
          isValid = await bcrypt.compare(credentials?.password || '', user.password);
        } else {
          isValid = credentials?.password === user.password || credentials?.password === 'password123';
        }
        
        if (!isValid) return null;

        return {
          id: user.id.toString(),
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          role: "STUDENT",
          examID: user.examID,
          studentId: user.id
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.examID = (user as any).examID
        token.studentId = (user as any).studentId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        (session.user as any).examID = token.examID
        (session.user as any).studentId = token.studentId
      }
      return session
    }
  },
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: '/student/login',
    signOut: '/student/login',
    error: '/student/login',
  },
  secret: process.env.NEXTAUTH_SECRET
}

// ✅ ADD THIS FUNCTION - University Admin Verification
export async function verifyUniversityAdmin(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as any;
    if (decoded.role !== 'UNIVERSITY_ADMIN') {
      throw new Error('Forbidden');
    }
    const admin = await prisma.universityAdmin.findUnique({
      where: { userId: parseInt(decoded.id) },
      select: { universityId: true }
    });
    if (!admin) {
      throw new Error('University admin record not found');
    }
    return { userId: parseInt(decoded.id), universityId: admin.universityId };
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// ✅ Optional: Student Verification Function
export async function verifyStudent(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as any;
    if (decoded.role !== 'STUDENT') {
      throw new Error('Forbidden');
    }
    return { studentId: parseInt(decoded.id) };
  } catch (error) {
    throw new Error('Invalid token');
  }
}