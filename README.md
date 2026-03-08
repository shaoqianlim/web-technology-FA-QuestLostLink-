# Quest LostLink
### Campus Lost & Found Management System
**Quest International University — BIT1107 / BIT2164 / BCS2024**

---

## Overview

Quest LostLink is a full-stack web application that centralises lost and found item reports across the Quest International University campus. Students and staff can submit, browse, search, and resolve reports entirely online — replacing the previous manual process of notice boards and WhatsApp groups.

All pages are protected by an authentication guard. Users must sign in before accessing any part of the system. Data is stored in a MySQL database and can be viewed and managed directly in DBeaver.

---

## Tech Stack

| Layer       | Technology                                          |
|-------------|-----------------------------------------------------|
| Frontend    | HTML5, CSS3, Vanilla JavaScript (no frameworks)     |
| Backend     | Node.js v18+, Express v4                            |
| Database    | MySQL 8 (managed via DBeaver)                       |
| Security    | helmet, cors, express-rate-limit, input sanitisation |
| Environment | dotenv (.env file)                                  |

---

## Project Structure

```
quest-lostlink/
│
├── public/                        # Frontend static files
│   ├── css/
│   │   └── style.css              # Full light-theme stylesheet
│   ├── js/
│   │   ├── api.js                 # Fetch wrapper — all API calls live here
│   │   ├── items.js               # Items page logic (filter, sort, render cards)
│   │   ├── nav.js                 # Auth guard + navigation builder
│   │   ├── report.js              # Report form validation and submission
│   │   └── ui.js                  # Shared helpers: cards, modals, toasts
│   │
│   ├── index.html                 # Home page (stats dashboard)
│   ├── items.html                 # Browse all items
│   ├── lost.html                  # Lost items only
│   ├── found.html                 # Found items only
│   ├── report.html                # Submit a report form
│   ├── login.html                 # Sign in page
│   └── signup.html                # Register page
│
├── database/
│   └── schema.sql                 # Run once in DBeaver to create tables + seed data
│
├── server.js                      # Express entry point — all API routes
├── package.json                   # Dependencies and npm scripts
├── .env.example                   # Copy to .env and fill in your credentials
└── .gitignore                     # Excludes node_modules, .env
```

---

## Quick Start

### Step 1 — Set up the database in DBeaver

1. Open **DBeaver** and connect to your MySQL server
   - Host: `localhost` | Port: `3306` | User: `root`
2. Click **SQL Editor → New SQL Script**
3. Open `database/schema.sql`, paste the full contents and press **F5** (Run All)
4. You should see `quest_lostlink` appear in the left panel with two tables: `users` and `items`
5. Six sample records and three demo accounts are inserted automatically

### Step 2 — Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in your MySQL password:

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_NAME=quest_lostlink
DB_USER=root
DB_PASS=your_mysql_password_here
```

### Step 3 — Install dependencies

```bash
npm install
```

This installs: `express`, `mysql2`, `helmet`, `cors`, `express-rate-limit`, `dotenv`, and `nodemon`.

### Step 4 — Start the server

```bash
# Production
npm start

# Development (auto-restarts on file changes)
npm run dev
```

Expected output:
```
✅  MySQL connected → quest_lostlink

🚀  Quest LostLink running at http://localhost:3000
    Mode: development
```

Open **http://localhost:3000** in your browser. You will be immediately redirected to the login page.

---

## Demo Accounts

These accounts are created automatically when you run `schema.sql`:

| Role    | Email                    | Password     |
|---------|--------------------------|--------------|
| Student | ahmad@quest.edu.my       | Student@123  |
| Student | priya@quest.edu.my       | Student@123  |
| Admin   | admin@quest.edu.my       | Admin@1234   |

---

## Authentication

Every page except `login.html` and `signup.html` is protected by an **auth guard** in `nav.js`. The guard runs before the page renders:

- **Not logged in** → redirected to `login.html`
- **Logged in on login/signup page** → redirected to `index.html`
- **Nav bar (logged in)** → shows all tabs + user name + Logout button
- **Nav bar (login/signup)** → shows only Sign In / Sign Up links
- **After logout** → session cleared, redirected to `login.html`

Sessions are stored in `sessionStorage`. Checking "Keep me signed in" uses `localStorage` instead so the session persists across browser restarts.

---

## API Reference

### Auth — `/api/auth`

| Method | Endpoint           | Description                        |
|--------|--------------------|------------------------------------|
| POST   | `/api/auth/signup` | Register a new user account        |
| POST   | `/api/auth/login`  | Authenticate, returns session token|

**POST /api/auth/signup — Body:**
```json
{
  "first_name": "Ahmad",
  "last_name":  "Razif",
  "email":      "ahmad@quest.edu.my",
  "phone":      "+60123456789",
  "password":   "Student@123",
  "role":       "student"
}
```

**POST /api/auth/login — Body:**
```json
{
  "email":    "ahmad@quest.edu.my",
  "password": "Student@123"
}
```

**Login Response:**
```json
{
  "success": true,
  "token":   "MTphZG1pbkBx...",
  "user": {
    "id": 1,
    "first_name": "Ahmad",
    "last_name":  "Razif",
    "email":      "ahmad@quest.edu.my",
    "role":       "student"
  }
}
```

---

### Items — `/api/items`

| Method | Endpoint                    | Description                      |
|--------|-----------------------------|----------------------------------|
| GET    | `/api/items`                | List all items (filterable)      |
| GET    | `/api/items/stats`          | Dashboard summary counts         |
| GET    | `/api/items/:id`            | Get a single item by ID          |
| POST   | `/api/items`                | Create a new lost/found report   |
| PATCH  | `/api/items/:id/status`     | Update item status only          |
| DELETE | `/api/items/:id`            | Delete a report                  |

**GET /api/items — Query Parameters:**

| Parameter  | Values                               | Description          |
|------------|--------------------------------------|----------------------|
| `type`     | `lost` or `found`                    | Filter by type       |
| `status`   | `active`, `claimed`, or `resolved`   | Filter by status     |
| `category` | e.g. `Electronics`, `Keys`           | Filter by category   |
| `search`   | any string                           | Search title, location, description |

**Example:**
```
GET /api/items?type=lost&category=Electronics&search=laptop
```

**POST /api/items — Body:**
```json
{
  "type":          "lost",
  "category":      "Electronics",
  "title":         "Black Laptop",
  "description":   "Dell XPS 15 with sticker on lid",
  "location":      "Library Block B, Level 2",
  "date_reported": "2025-03-01",
  "contact_name":  "Ahmad Razif",
  "contact_email": "ahmad@quest.edu.my"
}
```

**PATCH /api/items/:id/status — Body:**
```json
{ "status": "claimed" }
```

---

## Database Tables

### users
| Column      | Type                             | Notes                         |
|-------------|----------------------------------|-------------------------------|
| id          | INT UNSIGNED AUTO_INCREMENT PK   |                               |
| first_name  | VARCHAR(60)                      |                               |
| last_name   | VARCHAR(60)                      |                               |
| email       | VARCHAR(180) UNIQUE              | Used for login                |
| phone       | VARCHAR(20)                      | Optional                      |
| password    | VARCHAR(255)                     | Plain text for demo (use bcrypt in production) |
| role        | ENUM(student, staff, admin)      | Default: student              |
| is_active   | TINYINT(1)                       | 0 = deactivated               |
| created_at  | DATETIME                         | Auto                          |
| updated_at  | DATETIME                         | Auto on update                |

### items
| Column        | Type                               | Notes                       |
|---------------|------------------------------------|-----------------------------|
| id            | INT UNSIGNED AUTO_INCREMENT PK     |                             |
| type          | ENUM(lost, found)                  |                             |
| status        | ENUM(active, claimed, resolved)    | Default: active             |
| category      | ENUM(Electronics, Clothing, ...)   | 8 options                   |
| title         | VARCHAR(120)                       |                             |
| description   | TEXT                               |                             |
| location      | VARCHAR(150)                       |                             |
| date_reported | DATE                               | Cannot be in the future     |
| contact_name  | VARCHAR(100)                       |                             |
| contact_email | VARCHAR(180)                       |                             |
| reported_by   | INT UNSIGNED FK → users.id         | Nullable (SET NULL on delete)|
| created_at    | DATETIME                           | Auto                        |
| updated_at    | DATETIME                           | Auto on update              |

---

## Security Measures

| Measure               | Implementation                                              |
|-----------------------|-------------------------------------------------------------|
| Auth guard            | `nav.js` redirects unauthenticated users to login on every page load |
| SQL injection         | Parameterised queries via `mysql2` — no string concatenation|
| XSS prevention        | `sanitize()` strips HTML tags server-side; `escHtml()` escapes output client-side |
| Clickjacking          | `helmet` sets `X-Frame-Options: SAMEORIGIN`                 |
| MIME sniffing         | `helmet` sets `X-Content-Type-Options: nosniff`             |
| Rate limiting         | Global 300 req/15 min; auth routes 20 req/15 min            |
| Input size limits     | Body parser capped at 50 KB; per-field `maxlength` enforced |
| Credential safety     | All credentials stored in `.env`, excluded from git via `.gitignore` |

---

## Troubleshooting

| Error                                   | Fix                                                   |
|-----------------------------------------|-------------------------------------------------------|
| `Access denied for user 'root'`         | Check `DB_PASS` in your `.env` file                   |
| `Unknown database 'quest_lostlink'`     | Run `database/schema.sql` in DBeaver first            |
| `ECONNREFUSED 127.0.0.1:3306`          | Start MySQL: `net start mysql` (Windows) or `brew services start mysql` (Mac) |
| `Cannot find module 'express'`          | Run `npm install`                                     |
| Stuck on login page after correct login | Clear browser storage and try again                   |
| Page shows blank / no items             | Check that the server is running on port 3000         |

---

## Deployment (Railway)

1. Push code to a GitHub repository
2. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub**
3. Add a **MySQL** plugin to the project
4. Copy the Railway MySQL connection values into your environment variables
5. Railway auto-deploys on every push to `main`

Environment variables to set in Railway dashboard:
```
PORT=3000
NODE_ENV=production
DB_HOST=<railway mysql host>
DB_PORT=<railway mysql port>
DB_NAME=quest_lostlink
DB_USER=root
DB_PASS=<railway mysql password>
```

---

## License

Academic project — Quest International University © 2025
