// app/api/delivery/assignments/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"                       // tapai ko auth import anusar milaunus
import connectDb from "@/lib/db"
import DeliveryAssignment from "@/models/deliveryAssignment.model"
import "@/models/order.model"

export async function GET() {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

    await connectDb()

    const [available, mine, completed] = await Promise.all([
      DeliveryAssignment.find({ broadcastedTo: userId, status: "broadcasted" })
        .populate("order").sort({ createdAt: -1 }).lean(),
      DeliveryAssignment.find({ assignedTo: userId, status: "assigned" })
        .populate("order").sort({ acceptedAt: -1 }).lean(),
      DeliveryAssignment.find({ assignedTo: userId, status: "completed" })
        .populate("order").sort({ updatedAt: -1 }).limit(50).lean(),
    ])

    // Accept garnu aghi customer ko phone dekhaudainau (privacy)
    const safeAvailable = (available as any[]).map((a) => ({
      ...a,
      order: a.order && { ...a.order, address: { ...a.order.address, mobile: undefined } },
    }))

    return NextResponse.json({ available: safeAvailable, mine, completed })
  } catch (error) {
    return NextResponse.json({ message: `Failed to load assignments: ${error}` }, { status: 500 })
  }
}