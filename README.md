# TimeTrade — Skill Bartering Marketplace

TimeTrade is a full-stack, skill-bartering web application that uses **time as currency** instead of money. 
The core principle is simple: **1 hour of swap service = 1 hour of time credit**, regardless of the skill being exchanged.

---

## Technical Stack
- **Frontend**: React, TypeScript, Tailwind CSS v4, Lucide React icons
- **Backend**: Node.js, Express (REST API), TypeScript, Socket.io (Real-Time Communication)
- **Database**: PostgreSQL (Prisma ORM for migrations and TS safety)
- **Containerization**: Docker & Docker Compose for immediate local execution

---

## Key Architecture & Features

### 1. Cycle-Detection Matching Engine
If User A offers something User B wants, but User B does not offer anything User A wants, they cannot swap directly. Our matching engine solves this by searching the trading graph for multi-user cycles (up to 4 members):
- **Adjacency List Graph**: 
  - Nodes: Users who have active offers or wants.
  - Directed Edge $U_1 \to U_2$: Created if User $U_1$ has a `skill_offer` matching User $U_2$'s `skill_want`.
- **Algorithm (Bounded DFS)**:
  - Starting at a target user $U_{target}$, the service executes a depth-first search up to a maximum depth of 4.
  - If it returns to $U_{target}$, a barter cycle is detected (e.g., Alice $\to$ Bob $\to$ Charlie $\to$ Alice).
- **Ranking**:
  - Chains are ranked first by **length** (shorter chains like 2-person direct swaps are easier to coordinate and are prioritized).
  - Next, chains are ranked by the **average rating** of participants to guarantee swap quality.

### 2. Double-Entry Time-Credit Ledger
To prevent inflation and ensure platform integrity, time is tracked via a double-entry style database table (`ledger_entries`):
- When a swap is marked completed, a database transaction:
  - Deducts hours from the receiver: `receiver.timeBalance -= duration`.
  - Credits hours to the provider: `provider.timeBalance += duration`.
  - Creates a ledger audit entry recording `fromUserId`, `toUserId`, and `hours`.
- **Protection Floor**: A balance protection rule ensures a user's time balance cannot drop below `-10.00` hours to prevent free-riding and platform abuse.

### 3. Real-Time Chat & Scheduling Calendar
- Active cycles are instantiated as matches in the database.
- Each match is given a persistent chat room powered by Socket.io, featuring typing indicators and online status lights.
- Sessions are scheduled for each link in the loop. If any link gets rejected or cancelled, the associated match automatically deactivates to prevent coordinate failure.

---

## Local Setup

### Prerequisite
Make sure you have [Docker and Docker Compose](https://www.docker.com/) installed on your machine.

### Quick Start (Docker)
In the root directory of the project, run:
```bash
docker-compose up --build
```
This single command spins up:
1. **PostgreSQL Database** running on port `5432`.
2. **Express Backend API** running on port `5000` (automatically applies schema migrations and seeds initial database values on startup).
3. **React Frontend** running on port `5173`.

Access the application in your browser at:
`http://localhost:5173`

---

## Mock Accounts (Seeded Data)
The database is pre-seeded with some accounts to showcase matching features:
- **Alice** (`alice@timetrade.com` / `password123`): Offers React, wants French.
- **Bob** (`bob@timetrade.com` / `password123`): Offers French, wants Guitar.
- **Charlie** (`charlie@timetrade.com` / `password123`): Offers Guitar, wants React.
  *Note: Logging in as Alice will show a 3-person cycle match: Alice $\to$ Charlie $\to$ Bob $\to$ Alice.*

- **Dave** (`dave@timetrade.com` / `password123`): Offers UI/UX Design, wants French.
- **Emma** (`emma@timetrade.com` / `password123`): Offers French, wants UI/UX Design.
  *Note: Logging in as Dave will show a direct 2-person match with Emma: Dave $\leftrightarrow$ Emma.*

- **Admin User** (`admin@timetrade.com` / `password123`): Can review and resolve disputes.
