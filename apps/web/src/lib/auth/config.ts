import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import MicrosoftEntraId from 'next-auth/providers/microsoft-entra-id';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { LoginSchema } from '@golab/shared';
import { logAuditActivity, AuditActions } from '@/lib/audit/prisma-audit-middleware';

const oauthEnabled = process.env.NEXT_PUBLIC_OAUTH_ENABLED === 'true';

export const authConfig: NextAuthConfig = {
  providers: [
    ...(oauthEnabled
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
          MicrosoftEntraId({
            clientId: process.env.MICROSOFT_CLIENT_ID,
            clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
          }),
        ]
      : []),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = LoginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            role: true,
            organizationId: true,
            isActive: true,
          },
        });

        if (!user?.passwordHash || !user.isActive) {
          logAuditActivity({
            action: AuditActions.LOGIN_FAILED,
            entityType: 'User',
            actorEmail: email,
            actorType: 'user',
            metadata: { reason: !user ? 'User not found' : 'Account inactive' },
          });
          return null;
        }

        const passwordValid = await bcrypt.compare(password, user.passwordHash);
        if (!passwordValid) {
          logAuditActivity({
            action: AuditActions.LOGIN_FAILED,
            entityType: 'User',
            entityId: user.id,
            actorEmail: email,
            actorType: 'user',
            metadata: { reason: 'Invalid password' },
          });
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
        };
      },
    }),
  ],
  pages: {
    signIn: '/login',
    newUser: '/register',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as unknown as Record<string, unknown>).role;
        token.organizationId = (user as unknown as Record<string, unknown>).organizationId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as unknown as Record<string, unknown>).role = token.role;
        (session.user as unknown as Record<string, unknown>).organizationId = token.organizationId;
      }
      return session;
    },
    async authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnPortal =
        nextUrl.pathname.startsWith('/admin') ||
        nextUrl.pathname.startsWith('/customer') ||
        nextUrl.pathname.startsWith('/finance') ||
        nextUrl.pathname.startsWith('/lab');
      const isOnAuth =
        nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/register');

      if (isOnPortal) {
        if (!isLoggedIn) return false;

        const role = (auth?.user as Record<string, unknown> | undefined)?.role as
          | string
          | undefined;

        if (nextUrl.pathname.startsWith('/admin')) {
          if (!['GOLAB_ADMIN', 'GOLAB_REVIEWER', 'GOLAB_FINANCE'].includes(role ?? ''))
            return false;
        }
        if (nextUrl.pathname.startsWith('/finance')) {
          if (!['GOLAB_ADMIN', 'GOLAB_FINANCE'].includes(role ?? '')) return false;
        }
        if (nextUrl.pathname.startsWith('/lab')) {
          if (!['GOLAB_ADMIN', 'LAB_ADMIN', 'LAB_TECHNICIAN'].includes(role ?? '')) return false;
        }
        if (nextUrl.pathname.startsWith('/customer')) {
          if (!['CUSTOMER_ADMIN', 'CUSTOMER_USER'].includes(role ?? '')) return false;
        }

        return true;
      }

      if (isLoggedIn && isOnAuth) {
        const role = (auth?.user as Record<string, unknown> | undefined)?.role as
          | string
          | undefined;

        if (['GOLAB_ADMIN', 'GOLAB_REVIEWER'].includes(role ?? '')) {
          return Response.redirect(new URL('/admin', nextUrl));
        }
        if (['GOLAB_FINANCE'].includes(role ?? '')) {
          return Response.redirect(new URL('/finance', nextUrl));
        }
        if (['LAB_ADMIN', 'LAB_TECHNICIAN'].includes(role ?? '')) {
          return Response.redirect(new URL('/lab', nextUrl));
        }
        return Response.redirect(new URL('/customer', nextUrl));
      }

      return true;
    },
  },
  events: {
    async signIn({ user }) {
      await logAuditActivity({
        action: AuditActions.LOGIN_SUCCESS,
        entityType: 'User',
        entityId: user.id ?? null,
        entityLabel: user.email ?? null,
        actorId: user.id ?? null,
        actorName: user.name ?? null,
        actorEmail: user.email ?? null,
        actorType: 'user',
      });
    },
    async signOut(message) {
      const tk = ('token' in message ? message.token : null) as Record<string, unknown> | null;
      await logAuditActivity({
        action: AuditActions.LOGOUT,
        entityType: 'User',
        entityId: (tk?.id as string) ?? null,
        actorId: (tk?.id as string) ?? null,
        actorEmail: (tk?.email as string) ?? null,
        actorType: 'user',
      });
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
