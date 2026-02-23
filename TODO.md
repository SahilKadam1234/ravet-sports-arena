# Elite Football Arena - Project Plan

## 1. Project Structure
```
EliteFootballArena/
├── server/
│   ├── index.js              # Express server entry point
│   ├── config/
│   │   └── db.js             # MongoDB connection
│   ├── models/
│   │   ├── Booking.js        # Booking schema
│   │   ├── Contact.js        # Contact form schema
│   │   └── Slot.js           # Slot management schema
│   ├── routes/
│   │   ├── booking.js        # Booking routes
│   │   ├── contact.js        # Contact routes
│   │   ├── admin.js          # Admin routes
│   │   └── slots.js          # Slot routes
│   └── utils/
│       └── revenueCalculator.js
├── public/
│   ├── index.html            # Home page
│   ├── booking.html          # Booking page
│   ├── about.html            # About page
│   ├── gallery.html          # Gallery page
│   ├── contact.html          # Contact page
│   ├── admin.html            # Admin login/dashboard
│   ├── css/
│   │   └── style.css         # Main stylesheet
│   └── js/
│       ├── main.js           # Main JavaScript
│       ├── booking.js        # Booking logic
│       ├── admin.js          # Admin dashboard logic
│       └── gallery.js        # Gallery logic
├── package.json
└── README.md
```

## 2. Database Schema (MongoDB)

### Booking Collection
- _id
- fullName
- phoneNumber
- email
- groundType (full/half)
- date
- timeSlot
- hours
- photoUrl (optional)
- paymentMethod
- totalPrice
- status (confirmed/cancelled)
- createdAt
- isWeekend (boolean)

### Contact Collection
- _id
- name
- phone
- email
- message
- createdAt

### Slot Collection
- _id
- date
- timeSlot
- groundType (full/half1/half2)
- isBooked (boolean)
- bookingId

## 3. API Endpoints

### Booking Routes
- POST /api/bookings - Create booking
- GET /api/bookings - Get all bookings
- GET /api/bookings/:id - Get single booking
- PUT /api/bookings/:id - Update booking status
- DELETE /api/bookings/:id - Cancel booking

### Contact Routes
- POST /api/contact - Submit contact form
- GET /api/contact - Get all contacts

### Admin Routes
- POST /api/admin/login - Admin login
- GET /api/admin/stats - Get booking statistics
- GET /api/admin/revenue - Get revenue data

### Slot Routes
- GET /api/slots/:date - Get slots for date
- POST /api/slots - Create slot
- PUT /api/slots/:id - Update slot

## 4. Pages to Create

1. **index.html** - Hero section, features, CTA buttons
2. **booking.html** - Booking form with calculations
3. **about.html** - Ground description
4. **gallery.html** - Photo gallery
5. **contact.html** - Contact form + WhatsApp/Call buttons
6. **admin.html** - Login + Dashboard with statistics

## 5. Key Features Implementation

### Pricing Logic
- Full Ground: ₹2000/hour
- Half Ground: ₹1000/hour
- Auto-calculate based on hours selected

### Slot Management
- Time: 6 AM to 11 PM (17 slots)
- Prevent double booking
- Track available vs booked slots

### Admin Dashboard Stats
- Total bookings
- Weekend vs Weekday bookings
- Total revenue
- Full vs Half ground bookings
- Available/Booked/Remaining slots
- Contact form submissions
- Email collection list
- Phone number collection

### Revenue Calculator
- Today's revenue
- Weekly revenue
- Monthly revenue
- Weekend revenue only
- Full ground revenue
- Half ground revenue

## 6. Design Requirements
- Green football grass theme
- Responsive design (mobile + desktop)
- Modern UI with animations
- WhatsApp/Call buttons
- Google Maps integration
- Social media links
- Booking confirmation messages

## 7. Implementation Steps

### Step 1: Set up Node.js project
- [ ] Initialize package.json
- [ ] Install dependencies (express, mongoose, cors, dotenv)

### Step 2: Create database models
- [ ] Create Booking model
- [ ] Create Contact model
- [ ] Create Slot model

### Step 3: Create API routes
- [ ] Booking routes
- [ ] Contact routes
- [ ] Admin routes
- [ ] Slot routes

### Step 4: Create frontend pages
- [ ] index.html (Home)
- [ ] booking.html
- [ ] about.html
- [ ] gallery.html
- [ ] contact.html
- [ ] admin.html

### Step 5: Style with CSS
- [ ] Modern sports theme
- [ ] Green football grass background
- [ ] Responsive design
- [ ] Animated buttons

### Step 6: Implement JavaScript logic
- [ ] Booking calculations
- [ ] Slot availability
- [ ] Admin dashboard
- [ ] Revenue calculations

## 8. Admin Credentials
- Username: admin
- Password: elitefootball2024
