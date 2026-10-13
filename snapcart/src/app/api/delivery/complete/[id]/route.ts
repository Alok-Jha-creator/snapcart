// app/api/delivery/complete/[id]/route.ts
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

    const assignment = await DeliveryAssignment.findOneAndUpdate(
      { _id: id, assignedTo: userId, status: "assigned" },
      { status: "completed" },
      { new: true }
    )
    if (!assignment) return NextResponse.json({ message: "Assignment not found" }, { status: 404 })

    const order = await Order.findById(assignment.order)
    if (order) {
      order.status = "delivered"
      if (order.paymentMethod === "cod") order.isPaid = true   // COD ko paisa delivery ma line
      await order.save()
    }

    return NextResponse.json({ message: "Marked as delivered" })
  } catch (error) {
    return NextResponse.json({ message: `Complete failed: ${error}` }, { status: 500 })
  }
}