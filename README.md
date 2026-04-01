# Backend (Node + Express + MVC + MongoDB)

## Stack
- Node.js
- Express
- MongoDB with Mongoose
- Nodemon (dev)

## Project Structure
src/
- config/db.js
- controllers/userController.js
- middlewares/errorHandler.js
- models/User.js
- routes/userRoutes.js
- app.js
- server.js

## Setup
1. Copy `.env.example` to `.env`
2. Update `MONGO_URI` if needed
3. Install dependencies:
   npm install
4. Run in development:
   npm run dev

## Scripts
- `npm run dev` -> Start server with Nodemon
- `npm start` -> Start server with Node

## Endpoints
- `GET /api/health` -> Server health check
- `GET /api/users` -> List all users
- `POST /api/users` -> Create user

### Create user body
{
  "name": "John Doe",
  "email": "john@example.com"
}
