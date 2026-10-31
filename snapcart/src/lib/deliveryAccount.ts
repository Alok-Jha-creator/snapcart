import User from "@/models/user.model"

export const PHONE = /^[0-9+\-\s]{7,15}$/
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const MIN_PASSWORD = 8

// Is this email already used by a User? Upper/lower case is ignored.
export const emailTaken = (email: string, exceptUserId?: unknown) =>
    User.findOne(exceptUserId ? { email, _id: { $ne: exceptUserId } } : { email })
        .collation({ locale: "en", strength: 2 })
        .lean()
