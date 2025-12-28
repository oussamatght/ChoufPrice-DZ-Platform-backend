import jwt from "jsonwebtoken"
import { User } from "../models/User.js"

export const authenticateToken = async(req, res, next) => {
    try {
        const authHeader = req.headers.authorization || ""
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null

        if (!token) {
            return res.status(401).json({ message: "Unauthorized - No token provided" })
        }

        const payload = jwt.verify(token, process.env.JWT_SECRET)
        const user = await User.findById(payload.id).select("email name")

        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        req.user = { id: user._id.toString(), email: user.email, name: user.name }
        next()
    } catch (err) {
        console.error("[auth middleware] error", err)
        const status = err.name === "JsonWebTokenError" || err.name === "TokenExpiredError" ? 401 : 500
        return res.status(status).json({ message: status === 401 ? "Invalid or expired token" : "Server error" })
    }
}