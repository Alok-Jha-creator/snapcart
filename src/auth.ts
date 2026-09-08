import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import connectDb from "./lib/db";
import User from "./models/user.model";
import bcrypt from "bcryptjs";
 
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        try {
          await connectDb();

          const email = credentials?.email as string;
          const password = credentials?.password as string;

          if (!email || !password) {
            throw new Error("Missing email or password");
          }

          const user = await User.findOne({ email });
          if (!user) {
            throw new Error("User not found");
          }

          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
            throw new Error("Invalid password");
          }

          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
          };
        } catch (error) {
          console.error(error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    // tocken bhitra user ko data rakhxa callbacks le
    jwt({token,user}) {
        if(user) {
            token.id = user.id,
            token.name = user.name,
            token.email = user.email
            token.role = user.role

        }
        return token;
    },
    session({session,token}) {
        if(session.user) {
            session.user.id = token.id as string;
            session.user.name = token.name as string;
            session.user.email = token.email as string;
            session.user.role = token.role as string;
           
        }
        return session;
    }

  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 10 * 24 * 60 * 60, // 10 days
  },
  secret: process.env.AUTH_SECRET,

})