import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import { requireDeliveryBoy } from "@/lib/requireDeliveryBoy"

type Me = Extract<Awaited<ReturnType<typeof requireDeliveryBoy>>, { ok: true }>
type Ctx = { req: NextRequest; id: string; user: Me["user"]; boy: Me["boy"] }

// Wraps a /api/delivery/<action>/[id] route: checks the delivery boy, validates the id,
// and turns unexpected errors into a 500, so each route only holds its own logic.
export function deliveryRoute(handler: (ctx: Ctx) => Promise<NextResponse>) {
    return async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
        try {
            const me = await requireDeliveryBoy()
            if (!me.ok) return NextResponse.json({ message: me.message }, { status: me.status })

            const { id } = await context.params
            if (!mongoose.isValidObjectId(id)) {
                return NextResponse.json({ message: "Invalid delivery" }, { status: 400 })
            }
            return await handler({ req, id, user: me.user, boy: me.boy })
        } catch (error) {
            return NextResponse.json({ message: `Something went wrong: ${error}` }, { status: 500 })
        }
    }
}
