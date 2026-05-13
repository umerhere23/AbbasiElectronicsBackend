# Backend (Node + Express + MVC + PostgreSQL)

## Stack
- Node.js
- Express
- PostgreSQL with Sequelize
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
2. Update `DATABASE_URL` if needed
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
- `POST /api/admin/register` -> Register admin
- `POST /api/admin/login` -> Login admin
- `GET /api/admin/me` -> Current admin profile (Bearer token)
- `GET /api/admin/overview` -> Dashboard overview metrics (Bearer token)
- `GET /api/products` -> List products
- `POST /api/products` -> Add product (Bearer token)
- `PUT /api/products/:id` -> Edit product (Bearer token)
- `DELETE /api/products/:id` -> Delete product (Bearer token)
- `GET /api/sales` -> List sales (Bearer token)
- `POST /api/sales` -> Create sale (Bearer token)
- `POST /api/upload/product-image` -> Upload product image (Bearer token, form-data with `image`)
- `POST /api/upload/category-image` -> Upload category image (Bearer token, form-data with `image`)

## Seeder Commands
- `npm run seed:admin` -> Create/update super admin
- `npm run seed:products` -> Seed 20 products across categories

## SMTP Setup
For invoice emails, the backend reads these env vars:
- `SMTP_HOST=smtp.hostinger.com`
- `SMTP_PORT=465`
- `SMTP_SECURE=true`
- `SMTP_USER=your full Hostinger email`
- `SMTP_PASS=your mailbox password`
- `SMTP_FROM=same as SMTP_USER`

If you want STARTTLS instead, use `SMTP_PORT=587` and `SMTP_SECURE=false`.

### Create user body
{
  "name": "John Doe",
  "email": "john@example.com"
}

### Register admin body
{
   "name": "Admin",
   "email": "admin@example.com",
   "password": "123456"
}

### Login admin body
{
   "email": "admin@example.com",
   "password": "123456"
}

### Add product body
{
   "name": "Sample Product",
   "description": "Good product",
   "price": 99.99,
   "stockCount": 10,
   "onSale": true,
   "salePercent": 15,
   "category": "Electronics",
   "image": "https://example.com/product.jpg",
   "inStock": true
}

### Create sale body
{
   "productId": "PRODUCT_ID",
   "quantity": 2,
   "discountPercent": 10,
   "customerName": "Ali",
   "note": "Weekend deal"
}
