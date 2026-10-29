import mongoose from "mongoose"

// One document holds every store-wide setting (key = "main")
export const defaultSettings = {
    store: {
        name: "Snapcart",
        logo: "",
        address: "",
        phone: "",
        currency: "NPR",
        openTime: "07:00",
        closeTime: "21:00",
    },
    inventory: {
        lowStockThreshold: 5,
        defaultUnit: "",
        outOfStock: "show" as "hide" | "show",
        maxQtyPerOrder: 0,
    },
    delivery: {
        charge: 0,
        freeDeliveryMin: 0,
        minOrderAmount: 0,
        areas: [] as string[],
        allowCancel: true,
        cancelWindowMinutes: 0,
    },
    notifications: {
        newOrder: true,
        pendingReminder: true,
        reminderMinutes: 30,
        lowStock: true,
        email: false,
    },
}

const settingsSchema = new mongoose.Schema(
    {
        key: { type: String, unique: true, default: "main" },
        store: { type: Object, default: defaultSettings.store },
        inventory: { type: Object, default: defaultSettings.inventory },
        delivery: { type: Object, default: defaultSettings.delivery },
        notifications: { type: Object, default: defaultSettings.notifications },
    },
    { timestamps: true, minimize: false }
)

const Settings = mongoose.models.Settings || mongoose.model("Settings", settingsSchema)
export default Settings