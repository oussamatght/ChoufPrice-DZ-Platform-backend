# Frontend Integration Guide

## WebSocket Chat Integration

### Environment Variables

Add to your frontend `.env.local`:

```env
NEXT_PUBLIC_API_BASE_HTTP=http://localhost:4000
NEXT_PUBLIC_API_BASE_WS=ws://localhost:4000
```

### Custom Hook: `useChat`

Create `hooks/useChat.ts`:

```typescript
import { useEffect, useMemo, useState, useRef } from "react";
import type { ChatMessage } from "@/types";

export function useChat(token?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const wsUrl = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE_WS || "ws://localhost:4000";
    return `${base}/ws/chat${token ? `?token=${token}` : ""}`;
  }, [token]);

  useEffect(() => {
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);

      if (payload.type === "history") {
        setMessages(payload.messages);
      } else if (payload.type === "message") {
        setMessages((prev) => [...prev, payload.message]);
      } else if (payload.type === "error") {
        console.error("WebSocket error:", payload.message);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log("WebSocket disconnected");
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [wsUrl]);

  const send = (text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "message", text }));
    } else {
      console.error("WebSocket not connected");
    }
  };

  return { messages, send, isConnected };
}
```

### Usage in Your Component

Update your page/component:

```tsx
"use client";

import { CommunityChat } from "@/components/community-chat";
import { useAuth } from "@/context/auth-context";
import { useChat } from "@/hooks/useChat";

export default function ChatPage() {
  const { user } = useAuth();
  const { messages, send, isConnected } = useChat(user?.token);

  return (
    <div className="container mx-auto p-4">
      <CommunityChat messages={messages} onSendMessage={send} />
      {!isConnected && (
        <div className="text-sm text-muted-foreground mt-2">
          Reconnecting...
        </div>
      )}
    </div>
  );
}
```

### Updated CommunityChat Component with Better Scroll

Ensure your `CommunityChat` component has proper auto-scroll:

```tsx
"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import type { ChatMessage } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr, enUS, ar } from "date-fns/locale";

interface CommunityChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
}

export function CommunityChat({ messages, onSendMessage }: CommunityChatProps) {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { t, locale } = useLanguage();

  const dateLocale = locale === "ar" ? ar : locale === "en" ? enUS : fr;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    onSendMessage(newMessage.trim());
    setNewMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card
      className="h-[400px] flex flex-col"
      dir={locale === "ar" ? "rtl" : "ltr"}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base md:text-lg flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <MessageCircle className="h-4 w-4 text-primary" />
          </div>
          {t("chat.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          <div className="space-y-4 pb-4">
            {messages.map((msg) => {
              const isOwn = msg.userId === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}>
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback
                      className={`text-xs font-medium ${
                        isOwn
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}>
                      {msg.userName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[75%] ${isOwn ? "text-right" : ""}`}>
                    <div
                      className={`flex items-center gap-2 mb-1 ${
                        isOwn ? "flex-row-reverse" : ""
                      }`}>
                      <span className="text-xs font-medium">
                        {msg.userName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(msg.timestamp), {
                          addSuffix: true,
                          locale: dateLocale,
                        })}
                      </span>
                    </div>
                    <div
                      className={`inline-block px-3 py-2 rounded-2xl text-sm break-words ${
                        isOwn
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted rounded-bl-md"
                      }`}>
                      {msg.message}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Input
              placeholder={
                user ? t("chat.placeholder.auth") : t("chat.placeholder.guest")
              }
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={!user}
              className="flex-1 h-10"
            />
            <Button
              onClick={handleSend}
              disabled={!user || !newMessage.trim()}
              size="icon"
              className="h-10 w-10 shrink-0">
              <Send className="h-4 w-4" aria-label={t("chat.send")} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Alternative: Pure CSS Scroll (without ScrollArea)

If you prefer native scrolling without shadcn's ScrollArea:

```tsx
<div className="flex-1 overflow-y-auto px-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
  <div className="space-y-4 pb-4">
    {/* messages */}
    <div ref={messagesEndRef} />
  </div>
</div>
```

Add to your `globals.css` for custom scrollbar:

```css
@layer utilities {
  .scrollbar-thin::-webkit-scrollbar {
    width: 8px;
  }
  .scrollbar-thin::-webkit-scrollbar-track {
    background: transparent;
  }
  .scrollbar-thin::-webkit-scrollbar-thumb {
    @apply bg-gray-300 dark:bg-gray-700 rounded-full;
  }
  .scrollbar-thin::-webkit-scrollbar-thumb:hover {
    @apply bg-gray-400 dark:bg-gray-600;
  }
}
```

## API Endpoints

### HTTP Endpoints

- **Base URL**: `http://localhost:4000` (or from env)
- **Health**: `GET /health`
- **Register**: `POST /api/auth/register` - Body: `{ email, password, name }`
- **Login**: `POST /api/auth/login` - Body: `{ email, password }` → Returns `{ token, user }`
- **Me**: `GET /api/auth/me` - Header: `Authorization: Bearer <token>`
- **Chat History**: `GET /api/chat/history` → `{ messages: ChatMessage[] }`

### WebSocket

- **URL**: `ws://localhost:4000/ws/chat?token=<jwt_optional>`
- **On Connect**: Receives `{ type: "history", messages: ChatMessage[] }`
- **Send**: `{ type: "message", text: "your message" }`
- **Receive**: `{ type: "message", message: ChatMessage }`
- **Error**: `{ type: "error", message: "auth_failed" }`

### ChatMessage Type

```typescript
interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: string; // ISO date string
}
```

## Production Deployment

### Backend

- Set `FRONTEND_ORIGIN` env var to your frontend domain
- Ensure MongoDB connection string is set
- JWT_SECRET must be strong and secret
- Consider using WSS (secure WebSocket) in production

### Frontend

- Update `NEXT_PUBLIC_API_BASE_HTTP` to your deployed backend URL
- Update `NEXT_PUBLIC_API_BASE_WS` to `wss://` (secure WebSocket)
- Handle reconnection logic for better UX

## Testing

Use Postman or any WebSocket client:

1. Connect to `ws://localhost:4000/ws/chat`
2. Send: `{"type":"message","text":"Hello"}`
3. Receive broadcasts from all connected clients
