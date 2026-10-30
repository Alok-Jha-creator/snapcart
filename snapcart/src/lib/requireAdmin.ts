import { auth } from "@/auth"
import User from "@/models/user.model"

export default async function requireAdmin() {
    const session = await auth()
    if (!session?.user?.email) return null
    const user = await User.findOne({ email: session.user.email })
    return user && user.role === "admin" ? user : null
}