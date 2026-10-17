
# <p align="center">🩸 SAHAYOG

<p align="center">
  <strong>A Community Blood Donation & Emergency Coordination Platform</strong>
</p>

<p align="center">
  Connecting Donors, Hospitals, NGOs and Communities through a unified digital blood network.
</p>

<p align="center">

![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

</p>

---

## 📌 Overview

**Sahayog** is a community-driven blood donation coordination platform designed to connect **blood donors, hospitals, NGOs and volunteers** through a unified digital ecosystem.

The platform helps hospitals create blood requirements, identify suitable donors, coordinate responses and manage operational information. Donors can manage their availability, receive blood requests and respond to them, while NGOs can support community-level coordination.

### 🎯 Vision

> **Connect. Respond. Donate. Save Lives. ❤️**

RakhtSetu focuses on making blood-donation coordination more organized, responsive and accessible through technology.

---

# 🔄 How Sahayog Works

```mermaid
flowchart TD

    A["👤 User Registration"] --> B{"Select Role"}

    B --> C["🩸 Donor"]
    B --> D["🏥 Hospital"]
    B --> E["🤝 NGO"]

    %% DONOR
    C --> C1["Create / Update Profile"]
    C1 --> C2["Set Blood Group & Location"]
    C2 --> C3["Manage Availability"]
    C3 --> C4["Receive Blood Requests"]
    C4 --> C5{"Respond to Request"}

    C5 -->|Accept| C6["Donation Coordination"]
    C5 -->|Decline| C7["Request Reassignment"]

    %% HOSPITAL
    D --> D1["Hospital Dashboard"]
    D1 --> D2["Create Blood Request"]
    D2 --> D3["Enter Blood Group & Units"]
    D3 --> D4["Request Processing"]
    D4 --> D5["Find Suitable Donors"]
    D5 --> D6["Send Donor Requests"]
    D6 --> D7["Track Responses"]
    D7 --> D8["Manage Patients & Reports"]

    %% NGO
    E --> E1["NGO Dashboard"]
    E1 --> E2["Coordinate Blood Donation"]
    E2 --> E3["Connect Donors & Hospitals"]
    E3 --> E4["Community Outreach"]

    %% BACKEND
    C6 --> F["⚙️ RakhtSetu Application"]
    C7 --> F
    D4 --> F
    D6 --> F
    D7 --> F
    E3 --> F

    F --> G["🗄️ Supabase"]
    G --> H["📊 Data & Analytics"]

    H --> I["🚨 Faster Request Coordination"]
    H --> J["🤝 Better Donor Connectivity"]
    H --> K["❤️ Stronger Community Network"]
```

---

# 🏗️ System Architecture

```mermaid
flowchart LR

    U["👥 Platform Users"]

    U --> D["🩸 Donor Portal"]
    U --> H["🏥 Hospital Portal"]
    U --> N["🤝 NGO Portal"]

    D --> F["⚛️ React Frontend"]
    H --> F
    N --> F

    F --> R["🔀 React Router"]
    R --> A["⚙️ Application Logic"]

    A --> S["⚡ Supabase"]

    S --> DB["🗄️ PostgreSQL"]
    S --> AUTH["🔐 Authentication"]
    S --> RLS["🛡️ Row Level Security"]

    A --> MAP["🗺️ Leaflet Maps"]
    A --> ANA["📊 Analytics"]

    DB --> REQ["📨 Blood Requests"]
    DB --> PAT["🧑‍⚕️ Patient Records"]
    DB --> RES["💬 Donor Responses"]

    REQ --> OUT["❤️ Blood Donation Coordination"]
    RES --> OUT
```

---

# 🩸 Blood Request Flow

```mermaid
flowchart TD

    A["🏥 Hospital Creates Blood Request"]
    A --> B["🩸 Select Blood Group"]
    B --> C["📦 Enter Required Units"]
    C --> D["📍 Specify Location"]
    D --> E["⚙️ Sahayog Processes Request"]

    E --> F["🔎 Find Suitable Donors"]

    F --> G["📨 Send Blood Request"]

    G --> H{"👤 Donor Response"}

    H -->|Accept| I["✅ Donation Coordination"]
    H -->|Decline| J["❌ Request Reassignment"]

    I --> K["🏥 Hospital Receives Donor Response"]
    J --> F

    K --> L["❤️ Blood Donation Completed"]
```

---

# 🩸 Blood Request Flow

```mermaid
flowchart LR

    A["🏥 Hospital"] --> B["📝 Create Blood Request"]

    B --> C["🔎 Identify Suitable Donors"]

    C --> D["📨 Send Requests"]

    D --> E["🩸 Donor"]

    E --> F{"Response"}

    F -->|Accept| G["🤝 Donation Coordination"]

    F -->|Decline| H["🔄 Find Another Donor"]

    H --> C

    G --> I["✅ Request Fulfilled"]

    I --> J["📊 Update Records"]
```

---

# 👥 User Roles

| Role | Responsibilities |
|------|------------------|
| 🩸 **Donor** | Manage profile, blood group, location, availability and respond to blood requests |
| 🏥 **Hospital** | Create blood requests, manage patients, coordinate donors and view reports |
| 🤝 **NGO** | Support blood donation coordination, community outreach and donor-hospital connectivity |

---

# ✨ Key Features

| 🩸 Module | 🔹 Feature | 📝 Description |
|---|---|---|
| 🩸 **Donor Dashboard** | Profile Management | Manage donor profile, blood group and location |
| 🩸 **Donor Dashboard** | Availability Management | Update donor availability status |
| 🩸 **Donor Dashboard** | Blood Requests | View and manage incoming blood requests |
| 🩸 **Donor Dashboard** | Response System | Accept or decline blood donation requests |
| 🩸 **Donor Dashboard** | Donation History | Track previous blood donation activities |
| 🩸 **Donor Dashboard** | Nearby Network | Access nearby donor/network information |
| 🩸 **Donor Dashboard** | Notifications | Receive important request and platform notifications |
| 🩸 **Donor Dashboard** | Rewards & Recognition | Recognition through rewards and achievements |
| 🩸 **Donor Dashboard** | Badges | Display donor achievement badges |
| 🩸 **Donor Dashboard** | Impact Tracking | Track personal contribution and donation impact |
| 🏥 **Hospital Dashboard** | Blood Request Management | Create and manage blood requirements |
| 🏥 **Hospital Dashboard** | Patient Management | Manage patient-related information |
| 🏥 **Hospital Dashboard** | Interactive Donor Map | View donors through an interactive map |
| 🏥 **Hospital Dashboard** | Donor Coordination | Coordinate with suitable donors |
| 🏥 **Hospital Dashboard** | Request Tracking | Track blood requests and donor responses |
| 🏥 **Hospital Dashboard** | Reports & Analytics | View operational reports and analytics |
| 🏥 **Hospital Dashboard** | Hospital Settings | Manage hospital dashboard settings |
| 🏥 **Hospital Dashboard** | Operations Database | Manage hospital operational data |
| 🏥 **Hospital Dashboard** | Map Visualization | Visualize donor locations on the map |
| 🤝 **NGO Dashboard** | NGO Dashboard | Dedicated dashboard for NGO activities |
| 🤝 **NGO Dashboard** | Donation Coordination | Support community blood donation coordination |
| 🤝 **NGO Dashboard** | Donor-Hospital Connectivity | Help connect donors and hospitals |
# 🧩 Core Modules

```text
RakhtSetu
│
├── 🩸 Donor Module
│   ├── Dashboard
│   ├── Availability
│   ├── Requests
│   ├── Responses
│   ├── History
│   ├── Nearby Donors
│   ├── Network
│   ├── Rewards
│   ├── Profile
│   ├── Notifications
│   └── Settings
│
├── 🏥 Hospital Module
│   ├── Dashboard
│   ├── Blood Requests
│   ├── Patients
│   ├── Reports
│   ├── Interactive Map
│   └── Settings
│
├── 🤝 NGO Module
│   └── Dashboard
│
└── ⚙️ Backend Services
    ├── Authentication
    ├── Database
    ├── Request Management
    ├── Donor Responses
    └── Analytics
```

---

# 🛠️ Technology Stack

| 🧩 Category | ⚙️ Technology | 🎯 Purpose |
|---|---|---|
| 🎨 **Frontend** | React | Building the interactive user interface |
| 🎨 **Frontend** | TypeScript | Type-safe application development |
| ⚡ **Build Tool** | Vite | Fast development and production build |
| 🎨 **Styling** | Tailwind CSS | Responsive and modern UI design |
| 🧭 **Routing** | React Router | Client-side navigation and route management |
| ✨ **Animations** | Framer Motion | Smooth UI animations and transitions |
| 🖼️ **Icons** | Lucide React | Consistent interface icons |
| ☁️ **Backend / BaaS** | Supabase | Backend services and application data |
| 🗄️ **Database** | PostgreSQL | Structured application data storage |
| 🔐 **Authentication** | Supabase Auth | User authentication and access management |
| 🛡️ **Security** | Row Level Security | Database-level access control |
| 🗺️ **Maps** | Leaflet | Interactive map integration |
| 📍 **Location Visualization** | Leaflet MarkerCluster | Efficient visualization of multiple map markers |
| 🔧 **Version Control** | Git | Source code version control |
| 🌐 **Repository** | GitHub | Code hosting and collaboration |
| 📦 **Package Manager** | npm / pnpm | Dependency and package management |
| 💻 **Development Environment** | VS Code | Application development and debugging |
# 🔐 Security

Sahayog uses role-based access and database-level security mechanisms to separate functionality between different platform users.

### Security Features

- Authentication
- Role-based protected routes
- Supabase Row Level Security
- User-specific data access
- Protected dashboard routes

---

# 📊 Database

Sahayog uses **Supabase PostgreSQL** for application data.

```text
Users
  │
  ├── Donors
  │     ├── Profile
  │     ├── Availability
  │     ├── History
  │     └── Responses
  │
  ├── Hospitals
  │     ├── Requests
  │     ├── Patients
  │     └── Reports
  │
  └── NGOs
        └── Community Coordination
```

Hospital-specific database operations are maintained through the project's Supabase migration files.

Blood-request distribution is implemented in
`supabase/request-distribution-migration.sql`. For a new Supabase project, apply
`supabase/schema.sql`, `supabase/hospital-operations-migration.sql`,
`supabase/hospital-request-integrity-migration.sql`, then
`supabase/request-distribution-migration.sql`. For an existing project, apply
the migrations in that same order, skipping the base schema only if it is
already installed. The hospital operations migration creates
`donor_responses` (with `responded_at`/`updated_at`) and hospital notification
preferences. The integrity migration adds request columns used by the form,
backfills missing hospital/NGO records only when the matching profile and
explicit organisation name in the original Auth registration metadata exist,
and installs linked-record RLS policies. It does not invent organisation names
or mark organisations verified. Review its final diagnostic query for records
that still need onboarding data. The request distribution migration depends on
these tables and installs NGO assignments, verification and donor matching,
notifications, access policies, and triggers. Donor outreach starts only after
an assigned, verified NGO verifies the request. The request table is
`blood_requests`, not `requests`.

---

# 🚀 Getting Started

## 1. Clone the Repository

```bash
git clone https://github.com/Komal2008/RakhtSetu.git
```

## 2. Navigate to the Project

```bash
cd RakhtSetu
```

## 3. Install Dependencies

Using npm:

```bash
npm install
```

Or using pnpm:

```bash
pnpm install
```

## 4. Configure Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> ⚠️ Never commit your `.env` file or expose private API keys.

## 5. Start Development Server

```bash
npm run dev
```

Or:

```bash
pnpm dev
```

---

# 📁 Project Structure

```text
RakhtSetu/
│
├── public/
│   └── sounds/
│
├── src/
│   │
│   ├── components/
│   │   ├── donor/
│   │   ├── hospital/
│   │   └── layout/
│   │
│   ├── context/
│   │
│   ├── data/
│   │
│   ├── pages/
│   │   ├── donor/
│   │   ├── hospital/
│   │   └── ngo/
│   │
│   ├── App.tsx
│   └── main.tsx
│
├── supabase/
│   ├── schema.sql
│   ├── hospital-operations-migration.sql
│   ├── hospital-request-integrity-migration.sql
│   └── request-distribution-migration.sql
│
├── package.json
├── vite.config.ts
└── README.md
```

---

# 🔀 Git Workflow

The project uses feature branches for major modules.

```text
main
 │
 ├── feature/donor-dashboard-complete
 │
 ├── feature/hospital-dashboard-complete
 │
 └── feature/ngo-dashboard-complete
```

Each dashboard is developed independently and integrated through pull requests.

---

# 📌 Development Progress

| Module | Status |
|--------|--------|
| 🩸 Donor Dashboard | ✅ Completed |
| 🏥 Hospital Dashboard | ✅ Completed |
| 🤝 NGO Dashboard | ✅ Completed |
| 🔐 Authentication | ✅ Implemented |
| 🗄️ Supabase Integration | ✅ Implemented |
| 🗺️ Interactive Maps | ✅ Implemented |
| 📊 Reports | ✅ Implemented |
| 🧑‍⚕️ Patient Management | ✅ Implemented |
| 📨 Blood Request Management | ✅ Implemented |

---

# 🎯 Future Scope

Potential future improvements include:

- Real-time donor availability updates
- Advanced donor matching
- Emergency request prioritization
- Notification automation
- Blood inventory integration
- Hospital and blood-bank verification
- Advanced analytics
- Mobile application
- Community engagement and volunteer management

---

# ❤️ Impact

Sahayog is designed around a simple idea:

> **When someone needs blood, finding the right donor should be faster and more coordinated.**

By connecting hospitals, donors and community organizations on a common platform, RakhtSetu provides a digital foundation for more organized blood-donation coordination.

---


This project is developed for educational, research and project-development purposes.

---

<p align="center">
  <strong>🩸 Sahayog — Connect. Respond. Donate. Save Lives. ❤️</strong>
</p>
