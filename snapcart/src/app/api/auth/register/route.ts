import connectDb from "@/lib/db";
import User from "@/models/user.model";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        await connectDb();
        const body = await req.json();
        // CHANGED: name and email are trimmed, and the email is saved in lower case,
        // so "Ram@Gmail.com " and "ram@gmail.com" are the same person at login
        const name = String(body?.name ?? "").trim();
        const email = String(body?.email ?? "").trim().toLowerCase();
        const password = String(body?.password ?? "");

        if (!name || !email) {
            return NextResponse.json({message: "Name and email are required"}, {status: 400});
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({message: "Enter a valid email address"}, {status: 400});
        }
        const existUser = await User.findOne({email}).collation({ locale: "en", strength: 2 });
        if(existUser) {
            return NextResponse.json({message: "Email already exists"}, {status: 400});
        }
        if(password.length < 6){
            return NextResponse.json({message: "Password must be at least 6 characters"}, {status: 400});
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({name, email, password: hashedPassword});
        // CHANGED: the old response sent the password hash back to the browser. Now it does not.
        return NextResponse.json({message: "User created successfully", user: {_id: user._id, name: user.name, email: user.email}}, {status: 201});
    } catch (error) {
        return NextResponse.json({message:`register error ${error}`}, {status: 500});
    }
}