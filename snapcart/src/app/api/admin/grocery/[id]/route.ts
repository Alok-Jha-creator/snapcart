import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Grocery from "@/models/grocery.model";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDb()
        const session = await auth()
        if (session?.user?.role !== "admin") {
            return NextResponse.json(
                { message: "you are not an admin" },
                { status: 403 }
            )
        }
        const { id } = await params
        const { name, category, unit,description, price } = await req.json()
        if (!name || !category || !unit ||!description|| !price) {
            return NextResponse.json(
                { message: "name, category, unit,description and price are required" },
                { status: 400 }
            )
        }
        const grocery = await Grocery.findByIdAndUpdate(
            id,
            { name, category, unit,description, price },
            { new: true }
        )
        if (!grocery) {
            return NextResponse.json(
                { message: "grocery not found" },
                { status: 404 }
            )
        }
        return NextResponse.json(grocery, { status: 200 })
    } catch (error) {
        return NextResponse.json(
            { message: `update grocery error ${error}` },
            { status: 500 }
        )
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDb()
        const session = await auth()
        if (session?.user?.role !== "admin") {
            return NextResponse.json(
                { message: "you are not an admin" },
                { status: 403 }
            )
        }
        const { id } = await params
        const grocery = await Grocery.findByIdAndDelete(id)
        if (!grocery) {
            return NextResponse.json(
                { message: "grocery not found" },
                { status: 404 }
            )
        }
        return NextResponse.json({ message: "grocery deleted" }, { status: 200 })
    } catch (error) {
        return NextResponse.json(
            { message: `delete grocery error ${error}` },
            { status: 500 }
        )
    }
}