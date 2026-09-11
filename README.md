# ✨ AuraStay AI — Next-Gen Intelligent Hospitality Platform

> **AuraStay AI** is an ultra-luxurious, futuristic hotel reservation and smart-room management ecosystem featuring role-based dashboards, generative concierge interactions, circadian sensory controls, and dynamic pricing intelligence.

---

## 🌟 Key Features

### 🏨 Guest Experience & Booking
- **Cinematic Landing Page (`index.html`)**: Dynamic 2D neural network particle mesh canvas, glowing orbs, and glassmorphic aesthetic.
- **Smart Room Discovery**: Real-time room cards (Classic, Deluxe Sanctuary, Emperor Penthouse) with dynamic pricing and amenity tags.
- **Sensory & Circadian Room Customization**: Control ambient lighting, soundscapes (Rainforest, White Noise, Ocean Breeze), and automated check-in temperature.
- **AI Concierge Assistant (`chatbot.js`)**: Interactive guest assistance for amenities, local dining recommendations, and service requests.
- **Tiered Loyalty Memberships**: Classic Guest vs. Gold Sanctuary pricing tiers with automatic checkout privileges.

### 🛡️ Role-Based Management Console (`dashboard.html`)
- **Customer Guest**: View booked stays, request room service, tune smart room settings, and view dynamic folio pricing.
- **Hotel Staff Agent**: Manage inventory status, update housekeeping and maintenance readiness, and supervise guest bookings.
- **System Administrator**: Adjust dynamic pricing algorithms, review AI concierge logs, and inspect user privileges.

### ⚡ Technical Stack
- **Frontend**: Vanilla HTML5, Modern CSS3 (Custom Glassmorphism, CSS Variables, Responsive Grids, Flexbox), Vanilla JavaScript (ES6+).
- **Icons & Visuals**: Font Awesome 6, Lucide Icons, HTML5 Canvas 2D particle simulation.
- **Backend (Optional API)**: Node.js & Express (`backend/server.js`) with Supabase PostgreSQL client integration.

---

## 🚀 Quick Start & Local Preview

### 1. View Frontend Directly
Open `index.html` in any modern web browser or run with a local static server:

```bash
# Using Python
python -m http.server 3000

# Or using npx serve
npx serve .
```
Navigate to `http://localhost:3000` to preview the landing page, or `http://localhost:3000/dashboard.html` for the guest/staff console.

### 2. Optional: Running the Express / Supabase Backend
```bash
cd backend
npm install
cp .env.example .env   # Update with your Supabase credentials
npm start
```

---

## 🌐 Deploying with GitHub Pages

1. Push this repository to GitHub.
2. Navigate to **Settings** > **Pages** in your GitHub repository.
3. Under **Branch**, select `main` and root folder `/ (root)`, then click **Save**.
4. Your website will be live at `https://<your-username>.github.io/<repository-name>/` within seconds!

---

## 📄 License
MIT License. Crafted with modern web technologies and futuristic hospitality design.
