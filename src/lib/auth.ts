import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "./db";
import { User } from "../models/User";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {},
        password: {},
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        await connectDB();

        const user = await User.findOne({
          email: credentials.email,
        });

        if (!user) return null;
        if (!user.isActive) return null;

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isValid) return null;

        // Super admins don't need a clinicId
        if (user.role === "super_admin") {
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            clinicId: "",
          };
        }

        // A non-super-admin account with no clinic is a broken account, not a
        // login to be repaired on the fly. Falling back to "the first active
        // clinic" would drop this user into an arbitrary tenant's data, so
        // refuse the sign-in and let an administrator fix the record.
        const clinicId = user.clinicId?.toString() || "";
        if (!clinicId) {
          console.error(
            `Refusing login for ${user.email}: account has no clinicId assigned.`
          );
          return null;
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          clinicId,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.clinicId = user.clinicId;
      }

      // If clinicId is missing from an existing session token, recover it from
      // the user's own record. If the record has no clinic either, the token
      // stays without one and requireAuth() will reject the request — we never
      // substitute a different clinic to paper over the gap.
      if (token.id && !token.clinicId && token.role !== "super_admin") {
        try {
          await connectDB();
          const dbUser = await User.findById(token.id).select("clinicId").lean();
          if (dbUser && (dbUser as any).clinicId) {
            token.clinicId = (dbUser as any).clinicId.toString();
          }
        } catch {
          // Silently fail — next request will retry
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.clinicId = token.clinicId as string;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};
