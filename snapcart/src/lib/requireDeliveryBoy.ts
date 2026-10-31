import { auth } from "@/auth"
import connectDb from "@/lib/db"
import User from "@/models/user.model"
import DeliveryBoy from "@/models/deliveryBoy.model"

// Checks the logged in user is an active delivery boy and returns their User and DeliveryBoy records.
// Same idea as requireAdmin, but it also tells you why it said no.
export async function requireDeliveryBoy() {
    const session = await auth()
    const id = session?.user?.id
    if (!id) return { ok: false as const, status: 401, message: "Please log in again." }

    await connectDb()
    const user = await User.findById(id)
    if (!user || user.role !== "deliveryBoy") {
        return { ok: false as const, status: 403, message: "This page is only for delivery boys." }
    }

    const boy = await DeliveryBoy.findOne({ user: user._id })
    if (!boy) {
        return { ok: false as const, status: 403, message: "Your delivery profile was not found. Please contact the admin." }
    }
    if (!boy.isActive) {
        return { ok: false as const, status: 403, message: "Your account is deactivated. Please contact the admin." }
    }
    return { ok: true as const, user, boy }
}
