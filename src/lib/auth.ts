import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "./db";
import { User } from "../models/User";
import Clinic from "../models/Clinic";

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

        // Auto-assign a clinic if old account doesn't have one
        let clinicId = user.clinicId?.toString() || "";
        if (!clinicId) {
          const defaultClinic = await Clinic.findOne({ isActive: true });
          if (defaultClinic) {
            user.clinicId = defaultClinic._id;
            await user.save();
            clinicId = defaultClinic._id.toString();
          }
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

      // If clinicId is missing from an existing session token,
      // do a one-time DB lookup to recover it (fixes old sessions).
      // Super admins don't need a clinicId — skip the recovery for them.
      if (token.id && !token.clinicId && token.role !== "super_admin") {
        try {
          await connectDB();
          const dbUser = await User.findById(token.id).select("clinicId").lean();
          if (dbUser && (dbUser as any).clinicId) {
            token.clinicId = (dbUser as any).clinicId.toString();
          } else {
            // Last resort: assign the default clinic
            const defaultClinic = await Clinic.findOne({ isActive: true }).lean();
            if (defaultClinic) {
              token.clinicId = (defaultClinic as any)._id.toString();
              await User.updateOne(
                { _id: token.id },
                { $set: { clinicId: (defaultClinic as any)._id } }
              );
            }
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
