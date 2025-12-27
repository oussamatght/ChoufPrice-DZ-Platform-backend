import http from "http"
import cors from "cors"
import dotenv from "dotenv"
import express from "express"
import helmet from "helmet"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"
import morgan from "morgan"
import { WebSocketServer } from "ws"
import { User } from "./models/User.js"
import authRoutes from "./routes/auth.js"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000
const chatMessages = []
const MAX_MESSAGES = 200

// CORS configuration for both local and production
const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    process.env.FRONTEND_ORIGIN
].filter(Boolean)

app.use(helmet())
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl requests)
        if (!origin) return callback(null, true)

        if (allowedOrigins.includes(origin)) {
            callback(null, true)
        } else {
            // Also allow any vercel.app domain
            if (origin.includes('vercel.app')) {
                callback(null, true)
            } else {
                console.warn(`[CORS] Blocked origin: ${origin}`)
                callback(null, false)
            }
        }
    },
    credentials: true
}))
app.use(express.json({ limit: "1mb" }))
app.use(morgan("tiny"))

app.get("/health", (_req, res) => res.json({ status: "ok" }))
app.get("/api/chat/history", (_req, res) => {
    const recent = chatMessages.slice(-100)
    res.json({ messages: recent })
})
app.use("/api/auth", authRoutes)

app.use((err, _req, res, _next) => {
    console.error("[server] unhandled error", err)
    res.status(500).json({ message: "Server error" })
})

const start = async() => {
    try {
        if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI not set")
        if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET not set")

        await mongoose.connect(process.env.MONGODB_URI)
        console.log("✅ Connected to MongoDB")

        const server = http.createServer(app)
        setupWebSocket(server)

        server.listen(PORT, () => {
            console.log(`✅ API running on port ${PORT}`)
        })
    } catch (err) {
        console.error("❌ Failed to start server", err)
        process.exit(1)
    }
}

start()

function setupWebSocket(server) {
    const wss = new WebSocketServer({ server, path: "/ws/chat" })

    wss.on("connection", async(socket, request) => {
        const params = new URLSearchParams(request.url ? request.url.split("?")[1] || "" : "")
        const token = params.get("token")

        let userInfo = { id: "guest", name: "Guest" }

        if (token) {
            try {
                const payload = jwt.verify(token, process.env.JWT_SECRET)
                const user = await User.findById(payload.id).select("name email")
                if (user) {
                    userInfo = { id: user.id.toString(), name: user.name || user.email }
                }
            } catch (err) {
                console.warn("[ws] auth failed", err.message)
                socket.send(JSON.stringify({ type: "error", message: "auth_failed" }))
            }
        }

        socket.send(JSON.stringify({ type: "history", messages: chatMessages }))

        socket.on("message", (data) => {
            let parsed
            try {
                parsed = JSON.parse(data.toString())
            } catch (err) {
                console.warn("[ws] invalid JSON", err.message)
                return
            }

            if (parsed.type !== "message" || typeof parsed.text !== "string") return

            const cleanText = parsed.text.trim().slice(0, 2000)
            if (!cleanText) return

            const message = {
                id: new mongoose.Types.ObjectId().toString(),
                userId: userInfo.id,
                userName: userInfo.name || "Guest",
                message: cleanText,
                timestamp: new Date().toISOString(),
            }

            chatMessages.push(message)
            if (chatMessages.length > MAX_MESSAGES) chatMessages.shift()

            broadcast(wss, { type: "message", message })
        })

        socket.on("close", () => {
            // No-op for now, but placeholder for future presence tracking
        })
    })
}

function broadcast(wss, payload) {
    const data = JSON.stringify(payload)
    wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
            client.send(data)
        }
    })
}