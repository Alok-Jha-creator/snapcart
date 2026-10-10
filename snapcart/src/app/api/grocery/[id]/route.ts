import connectDb from "@/lib/db";
import Grocery from "@/models/grocery.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDb()
        const { id } = await params
        const grocery = await Grocery.findById(id)
        if (!grocery) {
            return NextResponse.json(
                { message: "grocery not found" },
                { status: 404 }
            )
        }
        return NextResponse.json(grocery, { status: 200 })
    } catch (error) {
        return NextResponse.json(
            { message: `get grocery error ${error}` },
            { status: 500 }
        )
    }
}