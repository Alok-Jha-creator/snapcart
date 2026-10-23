// app/api/delivery/location/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"                       // tapai ko auth import anusar milaunus
import connectDb from "@/lib/db"
import User from "@/models/user.model"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

    const { latitude, longitude } = await req.json()
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json({ message: "Invalid location" }, { status: 400 })
    }

    await connectDb()
    await User.findByIdAndUpdate(userId, {
      location: { type: "Point", coordinates: [longitude, latitude] },   // [longitude, latitude] ko order
      isOnline: true,
    })

    return NextResponse.json({ message: "Location updated" })
  } catch (error) {
    return NextResponse.json({ message: `Location update failed: ${error}` }, { status: 500 })
  }
}