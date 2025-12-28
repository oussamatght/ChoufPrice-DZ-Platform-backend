# Backend API Documentation

## Base URL

- Development: `http://localhost:4000`
- Production: Set via `NEXT_PUBLIC_API_BASE_URL` env variable

## Authentication

Most endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

---

## Auth Endpoints

### POST `/api/auth/register`

Register a new user.

**Body:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response (201):**

```json
{
  "id": "user_id",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### POST `/api/auth/login`

Login existing user.

**Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**

```json
{
  "token": "jwt-token-here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### GET `/api/auth/me`

Get current user info (requires auth).

**Response (200):**

```json
{
  "id": "user_id",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

## Price Reports Endpoints

### GET `/api/reports`

Get all price reports (public, with optional filters).

**Query Parameters:**

- `category` (optional): Filter by category
- `wilaya` (optional): Filter by wilaya
- `limit` (optional): Max results (default 100, max 500)

**Response (200):**

```json
{
  "reports": [
    {
      "id": "report_id",
      "productName": "Product Name",
      "price": 150,
      "category": "Food",
      "location": {
        "wilaya": "Algiers",
        "commune": "Bab Ezzouar",
        "lat": 36.7,
        "lng": 3.2
      },
      "storeName": "Store Name",
      "isAbnormal": false,
      "upvotes": 5,
      "downvotes": 1,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "user": {
        "id": "user_id",
        "name": "User Name"
      }
    }
  ],
  "count": 1
}
```

### POST `/api/reports`

Create a new price report (requires auth).

**Body:**

```json
{
  "productName": "Product Name",
  "price": 150,
  "category": "Food",
  "location": {
    "wilaya": "Algiers",
    "commune": "Bab Ezzouar",
    "lat": 36.7,
    "lng": 3.2
  },
  "storeName": "Store Name"
}
```

**Response (201):**

```json
{
  "id": "report_id",
  "productName": "Product Name",
  "price": 150,
  "category": "Food",
  "location": {
    "wilaya": "Algiers",
    "commune": "Bab Ezzouar",
    "lat": 36.7,
    "lng": 3.2
  },
  "storeName": "Store Name",
  "isAbnormal": false,
  "upvotes": 0,
  "downvotes": 0,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "user": {
    "id": "user_id",
    "name": "User Name"
  }
}
```

### POST `/api/reports/:id/vote`

Vote on a report (requires auth).

**Body:**

```json
{
  "voteType": "up" // or "down"
}
```

**Response (200):**

```json
{
  "id": "report_id",
  "upvotes": 6,
  "downvotes": 1
}
```

### DELETE `/api/reports/:id`

Delete a report (requires auth, owner only).

**Response (200):**

```json
{
  "message": "Report deleted",
  "id": "report_id"
}
```

### GET `/api/reports/my`

Get current user's reports (requires auth).

**Response (200):**

```json
{
  "reports": [...],
  "count": 5
}
```

---

## WebSocket Chat

### Connection

Connect to: `ws://localhost:4000/ws/chat?token=<your-jwt-token>`

**Token is optional** - without token, you'll be a guest user.

### Message Types

**Receive history on connect:**

```json
{
  "type": "history",
  "messages": [
    {
      "id": "msg_id",
      "userId": "user_id",
      "userName": "User Name",
      "message": "Hello!",
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Send a message:**

```json
{
  "type": "message",
  "text": "Hello everyone!"
}
```

**Receive new message broadcast:**

```json
{
  "type": "message",
  "message": {
    "id": "msg_id",
    "userId": "user_id",
    "userName": "User Name",
    "message": "Hello!",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

**Delete a message (owner only):**

```json
{
  "type": "delete",
  "messageId": "msg_id"
}
```

**Receive delete broadcast:**

```json
{
  "type": "delete",
  "messageId": "msg_id"
}
```

**Error:**

```json
{
  "type": "error",
  "message": "Error description"
}
```

---

## Environment Variables

### Backend (.env)

```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/choufprice
JWT_SECRET=your-secret-key-here
FRONTEND_ORIGIN=http://localhost:3000
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_API_BASE_WS=ws://localhost:4000
```

---

## Running the Backend

```bash
cd backend
npm install
npm run dev
```

The server will start on `http://localhost:4000`

---

## Testing with curl

**Register:**

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","name":"Test User"}'
```

**Login:**

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
```

**Create Report:**

```bash
curl -X POST http://localhost:4000/api/reports \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "productName":"Milk",
    "price":80,
    "category":"Food",
    "location":{"wilaya":"Algiers","commune":"Bab Ezzouar","lat":36.7,"lng":3.2},
    "storeName":"Local Store"
  }'
```

**Get Reports:**

```bash
curl http://localhost:4000/api/reports
```
