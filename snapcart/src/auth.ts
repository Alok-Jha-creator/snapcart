import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import connectDb from "./lib/db";
import User from "./models/user.model";
import DeliveryBoy from "./models/deliveryBoy.model";
import bcrypt from "bcryptjs";
import Google from "next-auth/providers/google";

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

          const email = (credentials?.email as string)?.trim();
          const password = credentials?.password as string;

          if (!email || !password) {
            throw new Error("Missing email or password");
          }

          // CHANGED: the email match ignores upper/lower case (admin-created logins are saved in lower case)
          const user = await User.findOne({ email }).collation({ locale: "en", strength: 2 });
          if (!user) {
            throw new Error("User not found");
          }

          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
            throw new Error("Invalid password");
          }

          // NEW: a delivery boy that the admin has deactivated cannot log in
          if (user.role === "deliveryBoy") {
            const boy = await DeliveryBoy.findOne({ user: user._id });
            if (boy && !boy.isActive) {
              throw new Error("Delivery account is deactivated");
            }
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
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    })
  ],
  callbacks: {
    async signIn({ user, account}) {
      if (account?.provider === "google") {
        await connectDb();
        let dbUser = await User.findOne({ email: user.email });
        if (!dbUser) {
          dbUser =await User.create({
            name: user.name,
            email: user.email,
            image: user.image
          })
        }
        user.id = dbUser._id.toString();
        user.role = dbUser.role;
      }
      return true;
    },
    // tocken bhitra user ko data rakhxa callbacks le
    jwt({token,user,trigger,session}) {
        if(user) {
            token.id = user.id,
            token.name = user.name,
            token.email = user.email
            token.role = user.role

        }
        if(trigger=="update"){
          token.role=session.role
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
