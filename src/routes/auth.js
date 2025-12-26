import bcrypt from "bcrypt"
import { Router } from "express"
import jwt from "jsonwebtoken"
import { User } from "../models/User.js"

const router = Router()

const isValidEmail = (email) => typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
const isValidPassword = (password) => typeof password === "string" && password.length >= 6

router.post("/register", async(req, res) => {
    try {
        const { email, password, name } = req.body || {}
        if (!isValidEmail(email)) return res.status(400).json({ message: "Invalid email" })
        if (!isValidPassword(password)) return res.status(400).json({ message: "Password must be 6+ chars" })

        const normalizedEmail = email.toLowerCase().trim()
        const existing = await User.findOne({ email: normalizedEmail })
        if (existing) return res.status(409).json({ message: "Email already in use" })

        const passwordHash = await bcrypt.hash(password, 10)
        const user = await User.create({ email: normalizedEmail, passwordHash, name })

        return res.status(201).json({
            id: user._id,
            email: user.email,
            name: user.name,
            createdAt: user.createdAt,
        })
    } catch (err) {
        console.error("[auth] register error", err)
        return res.status(500).json({ message: "Server error" })
    }
})

router.post("/login", async(req, res) => {
    try {
        const { email, password } = req.body || {}
        if (!isValidEmail(email) || !isValidPassword(password)) return res.status(400).json({ message: "Invalid credentials" })

        const normalizedEmail = email.toLowerCase().trim()
        const user = await User.findOne({ email: normalizedEmail })
        if (!user) return res.status(401).json({ message: "Invalid credentials" })

        const match = await bcrypt.compare(password, user.passwordHash)
        if (!match) return res.status(401).json({ message: "Invalid credentials" })

        const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" })

        return res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
            },
        })
    } catch (err) {
        console.error("[auth] login error", err)
        return res.status(500).json({ message: "Server error" })
    }
})

router.get("/me", async(req, res) => {
    try {
        const authHeader = req.headers.authorization || ""
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null
        if (!token) return res.status(401).json({ message: "Unauthorized" })

        const payload = jwt.verify(token, process.env.JWT_SECRET)
        const user = await User.findById(payload.id).select("email name createdAt")
        if (!user) return res.status(404).json({ message: "User not found" })

        return res.json({
            id: user._id,
            email: user.email,
            name: user.name,
            createdAt: user.createdAt,
        })
    } catch (err) {
        console.error("[auth] me error", err)
        const status = err.name === "JsonWebTokenError" ? 401 : 500
        return res.status(status).json({ message: status === 401 ? "Unauthorized" : "Server error" })
    }
})

export default router