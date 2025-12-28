import express from "express"
import { createServer } from "http"
import { WebSocketServer } from "ws"
import mongoose from "mongoose"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import dotenv from "dotenv"

import authRoutes from "./routes/auth.js"
import reportsRoutes from "./routes/reports.js"

dotenv.config()

const app = express()
const httpServer = createServer(app)

// Middleware
app.use(helmet())
app.use(cors({
    origin: [
        "http://localhost:3000",
        "http://localhost:5173",
        /\.vercel\.app$/
    ],
    credentials: true
}))
app.use(morgan("dev"))
app.use(express.json())

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/reports", reportsRoutes)

// Health check
app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() })
})

// WebSocket Server for Chat
const wss = new WebSocketServer({ noServer: true })

const chatClients = new Map()
const chatHistory = []

wss.on("connection", (ws, user) => {
    const clientId = Math.random().toString(36).substring(7)
    chatClients.set(clientId, { ws, user })

    console.log(`[ws] Client connected: ${user ? user.name : "Guest"} (${clientId})`)

    // Send chat history
    ws.send(JSON.stringify({
        type: "history",
        messages: chatHistory
    }))

    ws.on("message", (data) => {
        try {
            const parsed = JSON.parse(data.toString())

            if (parsed.type === "message") {
                // Accept either 'message' or legacy 'text' field
                const content = typeof parsed.message === "string" ? parsed.message : parsed.text
                if (!content || !content.trim()) {
                    ws.send(JSON.stringify({ type: "error", message: "Empty message" }))
                    return
                }

                const message = {
                    id: Date.now().toString(),
                    userId: user ? user.id : null,
                    userName: user ? user.name : "Guest",
                    message: content.trim(),
                    timestamp: new Date().toISOString()
                }

                chatHistory.push(message)
                if (chatHistory.length > 100) {
                    chatHistory.shift()
                }

                // Broadcast to all clients
                chatClients.forEach((client) => {
                    if (client.ws.readyState === 1) {
                        client.ws.send(JSON.stringify({
                            type: "message",
                            ...message
                        }))
                    }
                })
                return
            }

            if (parsed.type === "delete") {
                const { messageId } = parsed
                if (!messageId) {
                    ws.send(JSON.stringify({ type: "error", message: "messageId required for delete" }))
                    return
                }

                const index = chatHistory.findIndex((m) => m.id === messageId)
                if (index === -1) {
                    ws.send(JSON.stringify({ type: "error", message: "Message not found" }))
                    return
                }

                const target = chatHistory[index]
                    // Only allow deletion by owner; guests cannot delete others' messages
                if (!user || !target.userId || target.userId !== user.id) {
                    ws.send(JSON.stringify({ type: "error", message: "Not authorized to delete this message" }))
                    return
                }

                // Remove and broadcast deletion
                chatHistory.splice(index, 1)
                chatClients.forEach((client) => {
                    if (client.ws.readyState === 1) {
                        client.ws.send(JSON.stringify({ type: "delete", messageId }))
                    }
                })
                return
            }
        } catch (err) {
            console.error("[ws] Message parse error:", err)
            ws.send(JSON.stringify({
                type: "error",
                message: "Invalid message format"
            }))
        }
    })

    ws.on("close", () => {
        chatClients.delete(clientId)
        console.log(`[ws] Client disconnected (${clientId})`)
    })

    ws.on("error", (err) => {
        console.error(`[ws] Error for client ${clientId}:`, err)
    })
})

// HTTP upgrade handler
httpServer.on("upgrade", async(request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`)

    if (url.pathname === "/ws/chat") {
        const token = url.searchParams.get("token")
        let user = null

        if (token) {
            try {
                const { default: jwt } = await
                import ("jsonwebtoken")
                const { User } = await
                import ("./models/User.js")

                const decoded = jwt.verify(token, process.env.JWT_SECRET)
                const foundUser = await User.findById(decoded.userId)

                if (foundUser) {
                    user = {
                        id: foundUser._id.toString(),
                        name: foundUser.name,
                        email: foundUser.email
                    }
                }
            } catch (err) {
                console.log("[ws] Token verification failed, connecting as guest")
            }
        }

        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit("connection", ws, user)
        })
    } else {
        socket.destroy()
    }
})

// Chat history endpoint
app.get("/api/chat/history", (req, res) => {
    res.json({ messages: chatHistory })
})

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/choufprice"

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log("✅ Connected to MongoDB")

        const PORT = process.env.PORT || 4000
        httpServer.listen(PORT, () => {
            console.log(`✅ API running on port ${PORT}`)
        })
    })
    .catch((err) => {
        console.error("❌ MongoDB connection error:", err)
        process.exit(1)
    })