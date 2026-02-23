# RAVET Sports Arena

Football ground booking web application with slot-based booking, admin statistics, and contact management.

## Project Report Summary
- Backend: Node.js + Express + MongoDB (Mongoose)
- Frontend: HTML, CSS, JavaScript
- Booking flow supports:
  - Full ground and half ground booking
  - Start time + hours selection
  - Live slot availability (`Booked` / `Unbooked`)
  - Double-booking prevention
- Admin APIs include booking stats and revenue aggregation.
- MongoDB primary mode is enabled, with fallback local persistence when DB is unavailable.

## Features
- Public pages: Home, Booking, About, Gallery, Contact
- Admin page and admin APIs
- Slot time range: `06:00` to `23:00`
- Dynamic pricing:
  - Full ground: `Rs. 2000/hour`
  - Half ground: `Rs. 1000/hour`
- REST APIs for bookings, slots, contacts, and admin analytics

## Tech Stack
- Node.js
- Express
- Mongoose
- MongoDB
- CORS, body-parser

## Folder Structure
```text
EliteFootballArena/
  public/
    css/style.css
    js/booking.js
    index.html
    booking.html
    about.html
    gallery.html
    contact.html
    admin.html
  server/
    config/db.js
    models/
    routes/
    utils/inMemoryStore.js
    index.js
  package.json
```

## Setup
### 1. Prerequisites
- Node.js 18+
- MongoDB (local service running on `localhost:27017`)

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
copy .env.example .env
```
Edit `.env` if needed.

### 4. Start Server
```bash
npm start
```
Server runs at `http://localhost:3000`.

## Main Routes
- `GET /` -> Home page
- `GET /booking` -> Booking page
- `GET /about` -> About page
- `GET /gallery` -> Gallery page
- `GET /contact` -> Contact page
- `GET /admin` -> Admin page

## API Endpoints
### Booking
- `POST /api/bookings`
- `GET /api/bookings`
- `GET /api/bookings/:id`
- `PUT /api/bookings/:id`
- `DELETE /api/bookings/:id`

### Slots
- `GET /api/slots/:date`
- `POST /api/slots/init/:date`
- `PUT /api/slots/:id`

### Contact
- `POST /api/contact`
- `GET /api/contact`
- `GET /api/contact/stats`

### Admin
- `POST /api/admin/login`
- `GET /api/admin/stats`
- `GET /api/admin/revenue`

## Admin Credentials (Current Demo)
- Username: `admin`
- Password: `elitefootball2024`

## Troubleshooting
- If `localhost:3000` does not open:
  - Ensure server is running.
  - Ensure port 3000 is free.
- If DB does not connect:
  - Check MongoDB service status.
  - Verify `MONGODB_URI` in `.env`.

## License
For educational/demo use.
