# 🩸 RakhtSetu

### Connecting Blood Donors, Hospitals & NGOs — Faster, Smarter, When It Matters Most.

**RakhtSetu** is a modern blood management and emergency assistance platform designed to connect **blood donors, patients, hospitals, and NGOs** through a centralized digital system.

The platform helps users find available blood donors, manage blood availability, submit emergency requests, and coordinate blood-related assistance efficiently.

---

## ✨ Features

### 🩸 Blood Donor Management

* Donor registration and profile management
* Blood group information
* Donor availability status
* Location-based donor discovery
* Easy donor contact/request flow

### 🚨 Emergency Blood Requests

* Create urgent blood requests
* Specify required blood group and units
* Track request status
* Prioritize emergency requirements

### 🏥 Hospital Management

* Hospital registration
* Manage blood availability
* View and respond to blood requests
* Maintain hospital profile information

### 🤝 NGO Support

* NGO registration and management
* Assist with blood donation campaigns
* Coordinate emergency requirements
* Connect NGOs with hospitals and donors

### 👤 User Dashboard

* Personalized dashboard
* Profile management
* Active availability status
* Blood request tracking
* Notifications and updates

### 🔐 Authentication & Security

* Secure user authentication
* Role-based access
* Protected dashboard routes
* Secure database operations

---

## 🛠️ Tech Stack

### Frontend

* React.js
* TypeScript
* Vite
* Tailwind CSS
* React Router
* Lucide Icons

### Backend

* Node.js
* Express.js
* REST APIs

### Database & Services

* Supabase
* PostgreSQL
* Supabase Authentication

### Development Tools

* Git
* GitHub
* npm
* VS Code

---

## 🏗️ System Architecture

```text
                    ┌──────────────────┐
                    │    RakhtSetu     │
                    │   Web Platform   │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
         👤 Donors       🏥 Hospitals     🤝 NGOs
              │              │              │
              └──────────────┼──────────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   Backend API    │
                    │ Node + Express   │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │    Supabase      │
                    │   PostgreSQL     │
                    └──────────────────┘
```

---

## 📂 Project Structure

```text
RakhtSetu/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── App.tsx
│   │
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   └── server.ts
│   │
│   ├── package.json
│   └── .env
│
├── README.md
└── .gitignore
```

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/RakhtSetu.git
cd RakhtSetu
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 3. Configure Environment Variables

Create a `.env` file inside the frontend directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=your_backend_url
```

### 4. Start Frontend

```bash
npm run dev
```

The frontend will run on:

```text
http://localhost:5173
```

---

### 5. Setup Backend

Open a new terminal:

```bash
cd backend
npm install
```

Create a `.env` file:

```env
PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Start the backend:

```bash
npm run dev
```

---

## 🗄️ Database

RakhtSetu uses **Supabase PostgreSQL** for storing and managing application data.

Major entities include:

```text
profiles
   │
   ├── donors
   │
   ├── hospitals
   │
   └── ngos

blood_requests
   │
   ├── blood_group
   ├── units_required
   ├── urgency
   └── status

blood_availability
   │
   ├── blood_group
   ├── units_available
   └── hospital
```

---

## 🔐 User Roles

RakhtSetu supports multiple types of users:

| Role        | Purpose                                     |
| ----------- | ------------------------------------------- |
| 👤 Donor    | Donate blood and manage availability        |
| 🏥 Hospital | Manage blood inventory and requests         |
| 🤝 NGO      | Support donation and emergency coordination |
| 👨‍💻 Admin | Manage and monitor the platform             |

---

## 🔄 Core Workflow

```text
User Registration
       ↓
Profile Creation
       ↓
Select User Role
       ↓
Dashboard
       ↓
Blood Availability / Request
       ↓
Match Donor / Hospital
       ↓
Request Processing
       ↓
Blood Donation / Assistance
       ↓
Request Completed
```

---

## 🎨 UI Highlights

RakhtSetu focuses on a clean and modern healthcare experience with:

* ❤️ Blood-red branding
* 🩸 Blood donation focused UI
* 📱 Responsive design
* 📊 Dashboard-based workflow
* 🔔 Availability and request status
* 👤 Profile management
* 🚨 Emergency request visibility
* ✨ Modern cards and animations

---

## 🔒 Security

* Environment variables for sensitive credentials
* Supabase authentication
* Protected routes
* Role-based access control
* Server-side validation
* Secure API communication
* Service keys kept outside the frontend

> **Never commit `.env` files or Supabase service-role keys to GitHub.**

---

## 🌱 Future Enhancements

* 📍 Real-time donor location matching
* 🔔 Push notifications
* 📱 Mobile application
* 🤖 AI-based donor matching
* 🗺️ Interactive blood availability map
* 📞 Emergency calling integration
* 📈 Advanced analytics dashboard
* 🏥 Hospital-to-hospital blood transfer coordination
* 🧠 Smart demand prediction

---

## 🎯 Vision

The vision of **RakhtSetu** is to reduce the time required to find compatible blood donors and make emergency blood coordination more accessible through technology.

> **"One connection can save a life." ❤️**

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a new branch

```bash
git checkout -b feature/your-feature
```

3. Make your changes
4. Commit your changes

```bash
git commit -m "feat: add your feature"
```

5. Push the branch

```bash
git push origin feature/your-feature
```

6. Open a Pull Request

---

## 📜 License

This project is developed for educational, social-impact, and hackathon purposes.

---



### ❤️ RakhtSetu

**Connecting the right blood to the right person at the right time.**

🩸 **Donate Blood. Save Lives.**
