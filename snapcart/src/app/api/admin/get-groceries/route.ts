import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Grocery from "@/models/grocery.model";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        await connectDb()
        const session = await auth()
        if (session?.user?.role !== "admin") {
            return NextResponse.json(
                { message: "you are not an admin" },
                { status: 403 }
            )
        }
        const groceries = await Grocery.find({}).sort({ createdAt: -1 })
        return NextResponse.json(groceries, { status: 200 })
    } catch (error) {
        return NextResponse.json(
            { message: `get groceries error ${error}` },
            { status: 500 }
        )
    }
}