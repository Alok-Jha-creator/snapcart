// app/api/delivery/accept/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import connectDb from "@/lib/db"
import DeliveryAssignment from "@/models/deliveryAssignment.model"
import Order from "@/models/order.model"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

    const { id } = await params
    await connectDb()
    // Atomic update: duita delivery boy le ek-sath accept garda ek jana le matra paunchha
    const assignment = await DeliveryAssignment.findOneAndUpdate(
      { _id: id, status: "broadcasted", broadcastedTo: userId },
      { status: "assigned", assignedTo: userId, acceptedAt: new Date() },
      { new: true }
    )
    if (!assignment) {
      return NextResponse.json({ message: "Order already taken by someone else" }, { status: 409 })
    }

    await Order.findByIdAndUpdate(assignment.order, {
      assignedDeliveryBoy: userId,
      assignement: assignment._id,
    })

    return NextResponse.json({ message: "Order accepted" })
  } catch (error) {
    return NextResponse.json({ message: `Accept failed: ${error}` }, { status: 500 })
  }
}