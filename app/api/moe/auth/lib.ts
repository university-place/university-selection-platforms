import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import prisma from '@/prisma/client'
import bcrypt from 'bcrypt'
import { JWT } from 'next-auth/jwt'
import { getToken } from 'next-auth/jwt'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await prisma.user.findUnique({ where: { email: credentials.email } })
        if (!user || !user.password) return null
        const ok = await bcrypt.compare(credentials.password, user.password)
        if (!ok) return null
        // return safe user object
        return { id: user.id, email: user.email, name: user.name, role: user.role }
      }
    })
  ],
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, user }) {
      // on sign in, attach id and role
      if (user) {
        token.id = (user as any).id
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      // expose id and role on session.user
      if (session.user) {
        ;(session.user as any).id = (token as any).id
        ;(session.user as any).role = (token as any).role
      }
      return session
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export async function getJwtFromRequest(req: Request) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET })
    return token as JWT | null
  } catch (e) {
    return null
  }
}

export async function requireMoeAdmin(req: Request) {
  const token = await getJwtFromRequest(req)
  if (!token || (token as any).role !== 'MOE_ADMIN') return null
  return token
}

export default authOptions
