# AGENT.md - WhatsApp Broadcaster Project Guide

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [File Structure](#file-structure)
5. [Key Features](#key-features)
6. [Authentication Flow](#authentication-flow)
7. [Database Schema](#database-schema)
8. [API Endpoints](#api-endpoints)
9. [Frontend Components](#frontend-components)
10. [Cloudflare Specific Implementation](#cloudflare-specific-implementation)
11. [Common Issues & Solutions](#common-issues--solutions)
12. [Development Guidelines](#development-guidelines)
13. [Deployment Process](#deployment-process)
14. [Security Considerations](#security-considerations)

---

## 🎯 Project Overview

**Project Name**: CF-Infobip Broadcaster (WhatsApp Bulk Messaging Application)
**Platform**: Cloudflare Pages + Workers + D1 Database
**Purpose**: Send bulk WhatsApp messages to imported Google Contacts via Infobip API
**Brand**: Palmiye (Turkish company)
**Target Users**: Businesses needing mass WhatsApp communication

### Primary Goals
- Import contacts from Google Contacts
- Manage contact lists with pagination and search
- Compose and format WhatsApp messages
- Send bulk messages via Infobip WhatsApp Business API
- Track message delivery status
- Campaign management

---

## 🏗️ Architecture

### Deployment Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Pages                          │
│  ┌────────────────────┐        ┌─────────────────────┐     │
│  │   Static Frontend  │        │  Serverless Workers │     │
│  │   (public/*.html)  │◄──────►│  (functions/*.js)   │     │
│  └────────────────────┘        └──────────┬──────────┘     │
│                                            │                 │
│                                  ┌─────────▼─────────┐      │
│                                  │   D1 Database     │      │
│                                  │   (SQLite)        │      │
│                                  └───────────────────┘      │
└─────────────────────────────────────────────────────────────┘
              │                                    │
              │                                    │
    ┌─────────▼────────┐                ┌─────────▼─────────┐
    │  Google OAuth2   │                │   Infobip API     │
    │  & People API    │                │  (WhatsApp)       │
    └──────────────────┘                └───────────────────┘
```

### Request Flow
1. **Frontend** → Static HTML/CSS/JS served from `/public`
2. **API Calls** → Routed to `/functions/api/*` (Cloudflare Workers)
3. **Authentication** → Middleware checks session JWT cookie
4. **Database** → D1 (SQLite) accessed via Workers binding
5. **External APIs** → Google (contacts) & Infobip (WhatsApp)

---

## 🛠️ Technology Stack

### Frontend
- **HTML5** with semantic markup
- **Tailwind CSS** via CDN (with Forms & Typography plugins)
- **Vanilla JavaScript** (ES6+, no framework)
- **Material Icons Outlined** (Google Fonts)
- **Roboto Font** (Google Fonts)

### Backend (Cloudflare Workers)
- **JavaScript** (Node.js compatible runtime)
- **Cloudflare Pages Functions** (file-based routing)
- **D1 Database** (SQLite with batch API)
- **Environment Variables** (via wrangler.toml & Pages settings)

### External Services
- **Google OAuth 2.0** - Authentication
- **Google People API** - Contact import
- **Infobip WhatsApp API** - Message sending

### Development Tools
- **Git** - Version control (GitHub)
- **Wrangler CLI** - Cloudflare deployment tool
- **VS Code** - Recommended IDE

---

## 📁 File Structure

```
whatsapp-api/
├── public/                          # Static frontend files
│   ├── index.html                   # Main dashboard (SPA)
│   ├── app.js                       # Frontend logic (~500 lines)
│   ├── styles.css                   # Custom styles (minimal)
│   ├── palmiye-logo.png             # Brand logo
│   └── _redirects                   # Cloudflare routing rules
│
├── functions/                       # Serverless backend
│   ├── auth/                        # OAuth endpoints
│   │   ├── google.js               # Initiate OAuth flow
│   │   └── google/
│   │       └── callback.js         # OAuth callback + JWT creation
│   │
│   ├── api/                         # Protected API routes
│   │   ├── auth/
│   │   │   ├── status.js           # Check login status
│   │   │   └── logout.js           # Clear session
│   │   │
│   │   ├── contacts/
│   │   │   ├── import.js           # Import from Google (batch)
│   │   │   └── list.js             # List with pagination
│   │   │
│   │   └── dashboard/
│   │       └── stats.js            # Get counts for cards
│   │
│   └── middleware/
│       └── auth.js                  # JWT verification middleware
│
├── migrations/                      # D1 database schemas
│   └── 0001_initial_schema.sql     # Users & Contacts tables
│
├── wrangler.toml                    # Cloudflare configuration
├── package.json                     # Dependencies (if any)
└── AGENT.md                         # This file
```

### Key File Purposes

| File | Purpose | Critical? |
|------|---------|-----------|
| `public/index.html` | Main UI (dashboard, contacts, messaging) | ✅ Yes |
| `public/app.js` | All frontend logic, API calls, event handlers | ✅ Yes |
| `functions/auth/google.js` | OAuth initiation with state parameter | ✅ Yes |
| `functions/auth/google/callback.js` | OAuth callback, token exchange, JWT creation | ✅ Yes |
| `functions/middleware/auth.js` | Protects API routes with JWT verification | ✅ Yes |
| `functions/api/contacts/import.js` | Batch import with D1 optimization | ✅ Yes |
| `wrangler.toml` | Database binding, env vars | ✅ Yes |

---

## ⚡ Key Features

### 1. Google OAuth Authentication
- **Flow**: Authorization Code with PKCE-like state parameter
- **Scopes**: `profile`, `email`, `https://www.googleapis.com/auth/contacts.readonly`
- **Token Storage**: Refresh token in D1, access token temporary
- **Session**: HttpOnly cookie with JWT (base64url encoded)

### 2. Contact Import (Batch Optimized)
- **Source**: Google People API (`/v1/people/me/connections`)
- **Batch Size**: 1000 contacts per page
- **Optimization**:
  - Check existing contacts with `IN (?)` query (500 IDs/batch)
  - Batch INSERT/UPDATE (100 statements/batch via D1 batch API)
  - Prevents "too many SQL variables" error
  - Prevents "too many API requests" error
- **Deduplication**: Uses `google_contact_id` as unique identifier

### 3. Contact Management
- **Pagination**: 10 contacts per page (customizable)
- **Search**: Real-time search with 300ms debounce
- **Selection**: Multi-select with "Select All" / "Deselect All"
- **Display**: Scrollable list (max-height: 500px) with custom scrollbar
- **Data**: Name, phone number, email

### 4. Manual Contact Addition
- **Add Contact Button**: Easily accessible in the contacts panel
- **Modal Form**: User-friendly interface for entering contact information
- **Validation**: Phone number validation with error handling
- **Duplicate Detection**: Prevents adding contacts with duplicate phone numbers
- **Immediate Refresh**: Contact list updates automatically after adding

### 5. Message Composition
- **WhatsApp Formatting**:
  - `*text*` → Bold
  - `_text_` → Italic
  - `~text~` → Strikethrough
  - `` `text` `` → Monospace
- **Format Toolbar**: Buttons apply formatting to selected text
- **Character Limit**: 4096 characters with live counter
- **Preview**: Real-time WhatsApp-style message bubble

### 5. WhatsApp Preview Interface
- **Design**: Realistic WhatsApp chat UI
- **Header**: Green (#075e54) with Palmiye logo, "online" status
- **Chat Background**: Beige (#e5ddd5)
- **Message Bubble**: Light green (#dcf8c6) with tail
- **Details**: Timestamp (12:34) + blue double checkmarks
- **Alignment**: Right-aligned (sent message style)

### 6. Dashboard Statistics
- **Total Contacts**: Live count from database
- **Total Campaigns**: Placeholder (coming soon)
- **Messages Sent**: Placeholder (coming soon)

---

## 🔐 Authentication Flow

### Complete OAuth Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant /auth/google
    participant Google OAuth
    participant /auth/google/callback
    participant D1 Database
    participant Frontend (authenticated)

    User->>Frontend: Click "Sign in with Google"
    Frontend->>/auth/google: GET /auth/google
    /auth/google->>Google OAuth: Redirect with state parameter
    Google OAuth->>User: Show consent screen
    User->>Google OAuth: Approve access
    Google OAuth->>/auth/google/callback: Redirect with code & state
    /auth/google/callback->>Google OAuth: Exchange code for tokens
    Google OAuth-->>/auth/google/callback: access_token, refresh_token
    /auth/google/callback->>Google OAuth: Fetch user profile
    Google OAuth-->>/auth/google/callback: User info (email, name, google_id)
    /auth/google/callback->>D1 Database: INSERT/UPDATE user with refresh_token
    /auth/google/callback->>/auth/google/callback: Create JWT session token
    /auth/google/callback->>Frontend (authenticated): 302 Redirect with Set-Cookie
    Frontend (authenticated)->>User: Show dashboard
```

### JWT Token Structure

**Algorithm**: HMAC-SHA256
**Encoding**: Base64url (RFC 7515) - **No padding characters**
**Cookie**: `session=<token>`; HttpOnly; Secure; SameSite=Lax; Max-Age=86400

```javascript
// Header
{
  "alg": "HS256",
  "typ": "JWT"
}

// Payload
{
  "sub": "google_id_here",
  "email": "user@example.com",
  "name": "User Name",
  "iat": 1234567890,
  "exp": 1234654290  // iat + 86400 (24 hours)
}

// Signature
HMACSHA256(
  base64urlEncode(header) + "." + base64urlEncode(payload),
  JWT_SECRET
)
```

**Critical**: Use base64url encoding (not standard base64):
```javascript
const base64url = (str) => {
    return btoa(str)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');  // Remove padding!
};
```

### State Parameter Validation

**Purpose**: Prevent CSRF attacks
**Format**: UUID v4 (e.g., `550e8400-e29b-41d4-a716-446655440000`)
**Validation**: Regex pattern check only (no cookie storage due to SameSite issues)

```javascript
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!state || !uuidRegex.test(state)) {
    return new Response(/* error */);
}
```

---

## 🗄️ Database Schema

### D1 Database: `cf-infobip-db`
**Type**: SQLite (Cloudflare D1)
**Binding**: `CF_INFOBIP_DB` (in wrangler.toml)

### Tables

#### 1. `users` Table
```sql
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    google_refresh_token TEXT,  -- For re-auth without consent
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_email ON users(email);
```

#### 2. `contacts` Table
```sql
CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_google_id TEXT NOT NULL,
    google_contact_id TEXT,  -- Google resource name
    name TEXT,
    phone_number TEXT NOT NULL,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_google_id) REFERENCES users(google_id)
);

CREATE INDEX idx_contacts_user ON contacts(user_google_id);
CREATE INDEX idx_contacts_google_id ON contacts(google_contact_id);
CREATE UNIQUE INDEX idx_contacts_unique ON contacts(user_google_id, google_contact_id);
```

### Future Tables (Not Implemented Yet)
- `campaigns` - Campaign metadata
- `messages` - Message log with status
- `templates` - Saved message templates

---

## 🌐 API Endpoints

### Public Endpoints (No Auth Required)

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| GET | `/auth/google` | Initiate OAuth flow | 302 Redirect to Google |
| GET | `/auth/google/callback` | OAuth callback handler | 302 Redirect to `/` with cookie |

### Protected Endpoints (JWT Required)

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| GET | `/api/auth/status` | Check login status | - | `{authenticated: true, user: {...}}` |
| POST | `/api/auth/logout` | Clear session | - | `{success: true}` + clear cookie |
| GET | `/api/dashboard/stats` | Get dashboard counts | - | `{contacts: N, campaigns: N, messages: N}` |
| GET | `/api/contacts/list` | List contacts | `?page=1&limit=10&search=query` | `{success: true, data: [...], pagination: {...}}` |
| POST | `/api/contacts/create` | Add new contact | `{name, phone_number, email}` | `{success: true, contact: {...}}` |
| POST | `/api/contacts/import` | Import from Google | - | `{success: true, imported: N, updated: N, total: N}` |

### Request Examples

#### List Contacts
```javascript
GET /api/contacts/list?page=1&limit=10&search=john
Cookie: session=<jwt_token>

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "phone_number": "+905551234567",
      "email": "john@example.com"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 499,
    "totalPages": 50
  }
}
```

#### Create Contact
```javascript
POST /api/contacts/create
Cookie: session=<jwt_token>

Request Body:
{
  "name": "John Doe",
  "phone_number": "+905551234567",
  "email": "john@example.com"
}

Response:
{
  "success": true,
  "contact": {
    "id": 123,
    "name": "John Doe",
    "phone_number": "+905551234567",
    "email": "john@example.com",
    "google_contact_id": null,
    "created_at": "2025-10-28T20:15:30.000Z",
    "updated_at": "2025-10-28T20:15:30.000Z"
  }
}
```

#### Import Contacts
```javascript
POST /api/contacts/import
Cookie: session=<jwt_token>

Response:
{
  "success": true,
  "imported": 15,  // New contacts added
  "updated": 484,  // Existing contacts updated
  "total": 499     // Total contacts processed
}
```

### Error Responses

All endpoints return consistent error format:
```json
{
  "error": "Error message",
  "details": "Detailed error information",
  "stack": "Stack trace (only in development)"
}
```

HTTP Status Codes:
- `200` - Success
- `400` - Bad Request (missing parameters, validation failed)
- `401` - Unauthorized (no JWT or invalid JWT)
- `500` - Internal Server Error

---

## 🎨 Frontend Components

### Main UI Sections

#### 1. Login Section (`#login-section`)
```html
<div id="login-section" class="hidden">
    <button id="google-signin-btn">Sign in with Google</button>
</div>
```
- Shows when `authenticated = false`
- Google Sign In button triggers OAuth flow
- Palmiye logo and welcome message

#### 2. Dashboard Section (`#dashboard-section`)
```html
<div id="dashboard-section" class="hidden">
    <!-- Header with logo and logout -->
    <!-- Stats Cards (Contacts, Campaigns, Messages) -->
    <!-- Contacts Panel -->
    <!-- Message Composition Panel -->
</div>
```
- Shows when `authenticated = true`
- Loaded via `checkAuthStatus()` on page load

#### 3. Stats Cards
```javascript
// Example card structure
<div class="bg-surface p-6 rounded-lg shadow-sm border">
    <span class="material-icons-outlined">contacts</span>
    <p class="text-2xl font-bold" id="total-contacts">0</p>
    <div class="mt-auto pt-4">
        <button id="import-contacts-btn">Import Contacts</button>
        <button id="manage-contacts-btn">Manage</button>
    </div>
</div>
```

#### 4. Contacts List Panel
```html
<div class="contacts-panel">
    <!-- Tabs: All Contacts | Groups | Recent -->
    <!-- Search input with debounce -->
    <!-- Select All / Deselect All buttons -->
    <!-- Scrollable contact list (max-height: 500px) -->
    <ul id="contacts-list">
        <li>
            <input type="checkbox" class="contact-checkbox">
            <label>Name, Phone, Email</label>
        </li>
    </ul>
    <!-- Load More button -->
</div>
```

**Features**:
- Search with 300ms debounce
- Pagination (10 per page)
- Multi-select checkboxes
- Custom scrollbar
- Load More button (shows "X of Y contacts")

#### 5. Message Composition Panel
```html
<div class="message-panel">
    <!-- Template Selection dropdown -->

    <!-- Message Content textarea (4096 char limit) -->

    <!-- Format Toolbar (Bold, Italic, Strikethrough, Emoji) -->

    <!-- WhatsApp Preview -->
    <div class="whatsapp-preview">
        <div class="header">
            <img src="/palmiye-logo.png">
            <span>Palmiye</span>
            <span>online</span>
        </div>
        <div class="chat-area">
            <div class="message-bubble">
                <!-- Formatted message preview -->
                <span>12:34</span>
                <svg>✓✓</svg> <!-- checkmarks -->
            </div>
        </div>
    </div>

    <!-- Action buttons (Clear, Send Message) -->
</div>
```

### JavaScript Functions

#### Core Functions

| Function | Purpose | Location |
|----------|---------|----------|
| `checkAuthStatus()` | Check JWT validity on load | app.js:98 |
| `initiateGoogleAuth()` | Redirect to `/auth/google` | app.js:386 |
| `logout()` | Clear session and redirect | app.js:390 |
| `loadDashboardData()` | Fetch stats for cards | app.js:105 |
| `loadContacts(search, page, append)` | Fetch contacts with pagination | app.js:134 |
| `importContacts()` | Trigger Google import | app.js:280 |
| `showAddContactModal()` | Show the Add Contact modal form | app.js:692 |
| `hideAddContactModal()` | Hide the Add Contact modal form | app.js:698 |
| `saveContact()` | Save a new contact from the modal form | app.js:700 |
| `showContactFormError()` | Show error message in the contact form | app.js:724 |
| `selectAllContacts()` | Select all visible contacts | app.js:227 |
| `deselectAllContacts()` | Clear all selections | app.js:238 |
| `toggleContactSelection(id)` | Toggle single contact checkbox | app.js:218 |
| `handleMessageInput()` | Update preview on typing | app.js:308 |
| `applyFormatting(start, end)` | Wrap text with WhatsApp format chars | app.js:336 |
| `formatWhatsAppText(text)` | Convert `*bold*` to `<strong>` | app.js:371 |
| `authenticatedFetch(url, opts)` | Fetch with JWT cookie | app.js:514 |
| `showNotification(msg, type)` | Toast notification | app.js:492 |

#### Event Listeners Setup

```javascript
// in setupEventListeners() - app.js:45
googleSigninBtn?.addEventListener('click', initiateGoogleAuth);
importContactsBtn?.addEventListener('click', importContacts);
selectAllContactsBtn?.addEventListener('click', selectAllContacts);
deselectAllContactsBtn?.addEventListener('click', deselectAllContacts);
contactsSearch?.addEventListener('input', handleSearch);
messageContent?.addEventListener('input', handleMessageInput);
sendMessageBtnMain?.addEventListener('click', sendMessage);
clearMessageBtn?.addEventListener('click', clearMessage);

// Format toolbar buttons
formatButtons[0]?.addEventListener('click', () => applyFormatting('*', '*')); // Bold
formatButtons[1]?.addEventListener('click', () => applyFormatting('_', '_')); // Italic
formatButtons[2]?.addEventListener('click', () => applyFormatting('~', '~')); // Strikethrough
```

### Global State Management

```javascript
// app.js:3-36
let currentUser = null;              // User object from /api/auth/status
let isAuthenticated = false;         // Boolean flag
let allContacts = [];                // Current page contacts
let selectedContacts = new Set();    // Set of contact IDs
let currentPage = 1;                 // Pagination state
let totalPages = 1;
let totalContacts = 0;
let searchTimeout;                   // Debounce timer
```

---

## ☁️ Cloudflare Specific Implementation

### Wrangler Configuration

```toml
# wrangler.toml
name = "whatsapp-api"
compatibility_date = "2024-10-21"
pages_build_output_dir = "public"

[[d1_databases]]
binding = "CF_INFOBIP_DB"
database_name = "cf-infobip-db"
database_id = "1153df23-a187-4c99-8d48-42edeb0ed734"
```

### Environment Variables

**Set in Cloudflare Pages Dashboard → Settings → Environment Variables**

| Variable | Purpose | Example |
|----------|---------|---------|
| `GOOGLE_CLIENT_ID` | OAuth client ID | `123456.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret | `GOCSPX-xxxxx` |
| `JWT_SECRET` | HMAC signing key | Random 32+ char string |
| `INFOBIP_API_KEY` | WhatsApp API key | `xxxxxxxxxxxxxxxx` |
| `INFOBIP_BASE_URL` | API endpoint | `https://api.infobip.com` |

### Functions Routing

Cloudflare Pages automatically routes based on file structure:

```
functions/auth/google.js           → /auth/google
functions/auth/google/callback.js  → /auth/google/callback
functions/api/contacts/list.js     → /api/contacts/list
```

**Export Format**:
```javascript
export const onRequestGet = async (context) => { /* ... */ };
export const onRequestPost = async (context) => { /* ... */ };
```

### D1 Database Access

**Binding**: Access via `context.env.CF_INFOBIP_DB`

```javascript
// Example query
const result = await env.CF_INFOBIP_DB.prepare(`
    SELECT * FROM contacts WHERE user_google_id = ?
`).bind(userId).all();

// Batch execution (for bulk operations)
const statements = [
    env.CF_INFOBIP_DB.prepare('INSERT INTO contacts ...').bind(...),
    env.CF_INFOBIP_DB.prepare('INSERT INTO contacts ...').bind(...),
];
await env.CF_INFOBIP_DB.batch(statements);
```

**Limits**:
- 999 parameters per query (SQL variable limit)
- 100 statements per batch
- 50,000 rows read per request
- 1000 rows written per request

### Middleware Pattern

```javascript
// functions/middleware/auth.js
export function createProtectedRoute(handler) {
    return async (context) => {
        // 1. Extract JWT from cookie
        const sessionToken = getCookie(context.request, 'session');

        // 2. Verify JWT signature
        const payload = verifyJWT(sessionToken, context.env.JWT_SECRET);

        // 3. Fetch user from database
        const user = await context.env.CF_INFOBIP_DB.prepare(
            'SELECT * FROM users WHERE google_id = ?'
        ).bind(payload.sub).first();

        // 4. Attach user to context
        context.user = user;

        // 5. Call actual handler
        return handler(context);
    };
}

// Usage in API endpoint
export const onRequestPost = createProtectedRoute(async (context) => {
    const { env, user } = context;
    // user is now available!
});
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "Too many API requests by single worker invocation"

**Problem**: Importing 499 contacts with individual queries exceeds D1 request limit.

**Solution**: Use batch processing (implemented in `functions/api/contacts/import.js`):

```javascript
// BAD: 499 SELECT + 499 INSERT/UPDATE = ~1000 queries ❌
for (const contact of contacts) {
    const existing = await db.prepare('SELECT ...').first();
    if (existing) {
        await db.prepare('UPDATE ...').run();
    } else {
        await db.prepare('INSERT ...').run();
    }
}

// GOOD: 1 SELECT + 5 batch operations = ~6 queries ✅
const googleIds = contacts.map(c => c.googleContactId);
const existingMap = await fetchExistingInChunks(googleIds, 500);

const statements = contacts.map(contact =>
    existingMap.has(contact.id)
        ? db.prepare('UPDATE ...').bind(...)
        : db.prepare('INSERT ...').bind(...)
);

// Execute in batches of 100
for (let i = 0; i < statements.length; i += 100) {
    await db.batch(statements.slice(i, i + 100));
}
```

### Issue 2: "D1_ERROR: too many SQL variables"

**Problem**: SQLite has 999 parameter limit. `WHERE google_contact_id IN (?, ?, ...)` with 500+ parameters fails.

**Solution**: Chunk the IN clause queries:

```javascript
// BAD: IN (?, ?, ... 499 parameters) ❌
const placeholders = googleIds.map(() => '?').join(',');
await db.prepare(`SELECT * FROM contacts WHERE google_contact_id IN (${placeholders})`)
    .bind(...googleIds).all();

// GOOD: Split into chunks of 500 ✅
const CHECK_BATCH_SIZE = 500;
for (let i = 0; i < googleIds.length; i += CHECK_BATCH_SIZE) {
    const chunk = googleIds.slice(i, i + CHECK_BATCH_SIZE);
    const placeholders = chunk.map(() => '?').join(',');
    const result = await db.prepare(`
        SELECT * FROM contacts WHERE google_contact_id IN (${placeholders})
    `).bind(...chunk).all();
    // Process results...
}
```

### Issue 3: Session cookie not persisting after OAuth callback

**Problem**: Using HTML meta refresh doesn't set cookies properly.

**Solution**: Use HTTP 302 redirect:

```javascript
// BAD: HTML meta refresh ❌
return new Response(`
    <html>
        <meta http-equiv="refresh" content="0;url=/">
    </html>
`, {
    headers: { 'Set-Cookie': sessionCookie }
});

// GOOD: HTTP 302 redirect ✅
return new Response(null, {
    status: 302,
    headers: {
        'Location': '/',
        'Set-Cookie': sessionCookie
    }
});
```

### Issue 4: JWT cookie parsing issues

**Problem**: Standard base64 encoding with `==` padding causes cookie issues.

**Solution**: Use base64url encoding (RFC 7515):

```javascript
// Encode
const base64url = (str) => {
    return btoa(str)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');  // Remove padding!
};

// Decode
const base64urlDecode = (str) => {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
        base64 += '=';  // Add padding back
    }
    return atob(base64);
};
```

### Issue 5: CORS errors in development

**Problem**: Cloudflare Pages dev server and authentication cookies.

**Solution**: Test on actual Cloudflare Pages deployment, not local dev:

```bash
# Deploy to preview environment
git push origin feature-branch

# Cloudflare automatically deploys preview
# URL: https://<commit-hash>.<project>.pages.dev
```

### Issue 6: Format toolbar buttons not working

**Problem**: Event listeners added before DOM elements exist.

**Solution**: Wrap in `DOMContentLoaded` or use optional chaining:

```javascript
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
});

function setupEventListeners() {
    // Use optional chaining to prevent errors
    importContactsBtn?.addEventListener('click', importContacts);
}
```

---

## 📐 Development Guidelines

### Code Style

#### JavaScript
- **ES6+** syntax (const/let, arrow functions, async/await)
- **No semicolons** (optional, but be consistent)
- **camelCase** for variables and functions
- **PascalCase** for classes (if any)
- **UPPER_SNAKE_CASE** for constants

```javascript
// Good
const userName = 'John';
async function fetchContacts() { /* ... */ }
const API_BASE_URL = '/api';

// Bad
var user_name = 'John';
function FetchContacts() { /* ... */ }
const api_base_url = '/api';
```

#### HTML
- **Semantic tags** (`<main>`, `<section>`, `<article>`)
- **Tailwind classes** for styling (avoid inline styles except for dynamic colors)
- **Material Icons Outlined** for icons
- **Alt text** for images

#### CSS
- **Minimize custom CSS** (use Tailwind utilities)
- **Custom properties** for brand colors (already in Tailwind config)
- **Mobile-first** approach

### Naming Conventions

#### Files
- **kebab-case** for all files: `import-contacts.js`, `auth-middleware.js`

#### Database
- **snake_case** for table and column names: `user_google_id`, `created_at`

#### API Endpoints
- **kebab-case** for URLs: `/api/contacts/list`, `/auth/google/callback`

### Error Handling

Always wrap async operations in try-catch:

```javascript
async function importContacts() {
    try {
        showNotification('Importing contacts...', 'info');

        const response = await authenticatedFetch('/api/contacts/import', {
            method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
            showNotification(`Imported ${data.imported} contacts`, 'success');
            loadContacts();
        } else {
            throw new Error(data.error || 'Import failed');
        }
    } catch (error) {
        console.error('Import error:', error);
        showNotification(`Import failed: ${error.message}`, 'error');
    }
}
```

Backend error format:
```javascript
return new Response(JSON.stringify({
    error: 'User-friendly message',
    details: error.message,
    stack: error.stack  // Only include in dev
}), {
    status: 500,
    headers: { 'Content-Type': 'application/json' }
});
```

### Security Best Practices

1. **Never expose secrets** in frontend code
2. **Always validate JWT** in protected routes
3. **Sanitize user input** before database queries (use parameterized queries)
4. **Use HttpOnly cookies** for session tokens
5. **Validate state parameter** in OAuth flow
6. **Rate limit** API endpoints (future enhancement)

### Performance Optimization

1. **Debounce search input** (300ms)
2. **Pagination** for large lists (10-50 items per page)
3. **Batch database operations** (D1 batch API)
4. **Lazy load** contacts on scroll (implemented via "Load More")
5. **Cache static assets** (Cloudflare automatic)

---

## 🚀 Deployment Process

### Prerequisites

1. **Cloudflare Account** with Pages enabled
2. **GitHub Repository** connected to Cloudflare Pages
3. **Google Cloud Console** project with OAuth2 credentials
4. **D1 Database** created and migrated

### Initial Setup

#### 1. Create Cloudflare Pages Project

```bash
# In Cloudflare Dashboard
Pages → Create a project → Connect to Git → Select repository
```

**Build settings**:
- Build command: (none)
- Build output directory: `public`
- Root directory: `/`

#### 2. Create D1 Database

```bash
# Via Wrangler CLI
wrangler d1 create cf-infobip-db

# Output:
# database_id = "1153df23-a187-4c99-8d48-42edeb0ed734"
```

Add to `wrangler.toml`:
```toml
[[d1_databases]]
binding = "CF_INFOBIP_DB"
database_name = "cf-infobip-db"
database_id = "1153df23-a187-4c99-8d48-42edeb0ed734"
```

#### 3. Run Database Migrations

```bash
# Local (for testing)
wrangler d1 execute cf-infobip-db --local --file=./migrations/0001_initial_schema.sql

# Production
wrangler d1 execute cf-infobip-db --remote --file=./migrations/0001_initial_schema.sql
```

#### 4. Set Environment Variables

In Cloudflare Pages Dashboard:
```
Settings → Environment Variables → Production

GOOGLE_CLIENT_ID=123456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
JWT_SECRET=your-super-secret-random-string-min-32-chars
INFOBIP_API_KEY=xxxxxxxxxxxxxxxx
INFOBIP_BASE_URL=https://api.infobip.com
```

#### 5. Configure Google OAuth

In Google Cloud Console:
```
APIs & Services → Credentials → OAuth 2.0 Client IDs

Authorized JavaScript origins:
  https://whatsapp-api-dv5.pages.dev

Authorized redirect URIs:
  https://whatsapp-api-dv5.pages.dev/auth/google/callback
```

### Continuous Deployment

Every `git push` to main branch triggers automatic deployment:

```bash
# Make changes
git add .
git commit -m "feat: add new feature"
git push origin main

# Cloudflare automatically:
# 1. Detects push
# 2. Builds project (if build command exists)
# 3. Deploys to production
# 4. Provides deployment URL

# Check deployment
# Cloudflare Pages Dashboard → Deployments
```

### Preview Deployments

Every branch push creates a preview URL:

```bash
git checkout -b feature/new-ui
git push origin feature/new-ui

# Preview URL: https://<commit-hash>.whatsapp-api-dv5.pages.dev
```

### Rollback

```bash
# In Cloudflare Dashboard
Pages → whatsapp-api → Deployments → Previous deployment → Rollback
```

### Manual Deployment

```bash
# Via Wrangler CLI
wrangler pages deploy public --project-name=whatsapp-api
```

---

## 🔒 Security Considerations

### Authentication Security

1. **JWT Secret**: Use cryptographically random string (32+ chars)
   ```javascript
   // Generate secure secret
   const secret = require('crypto').randomBytes(32).toString('hex');
   ```

2. **Cookie Security Flags**:
   - `HttpOnly` - Prevents XSS access
   - `Secure` - HTTPS only
   - `SameSite=Lax` - CSRF protection
   - `Max-Age=86400` - 24-hour expiration

3. **Token Expiration**: JWT expires after 24 hours, require re-login

4. **Refresh Token Storage**: Stored in database (not in JWT), encrypted at rest by Cloudflare

### API Security

1. **Middleware Protection**: All `/api/*` routes except `/auth/*` require valid JWT

2. **Input Validation**:
   ```javascript
   // Validate pagination parameters
   const page = Math.max(1, parseInt(params.get('page')) || 1);
   const limit = Math.min(100, Math.max(1, parseInt(params.get('limit')) || 10));
   ```

3. **SQL Injection Prevention**: Always use parameterized queries
   ```javascript
   // Good ✅
   db.prepare('SELECT * FROM users WHERE email = ?').bind(email);

   // Bad ❌
   db.prepare(`SELECT * FROM users WHERE email = '${email}'`);
   ```

4. **CORS**: Cloudflare Pages handles CORS automatically for same-origin requests

### Data Privacy

1. **Minimal Data Storage**: Only store necessary user data (google_id, email, name)

2. **Contact Data**: Belongs to user, isolated by `user_google_id` foreign key

3. **No Password Storage**: OAuth-only authentication

4. **GDPR Compliance** (future):
   - Add data export endpoint
   - Add account deletion endpoint
   - Privacy policy page

### Environment Variables

**Never commit secrets to Git**:

```bash
# .gitignore (already present)
.env
.dev.vars
wrangler.toml  # if it contains secrets
```

Use Cloudflare Pages environment variables for all secrets.

---

## 🎓 Additional Resources

### Cloudflare Documentation
- [Pages Functions](https://developers.cloudflare.com/pages/platform/functions/)
- [D1 Database](https://developers.cloudflare.com/d1/)
- [Workers Runtime APIs](https://developers.cloudflare.com/workers/runtime-apis/)

### API Documentation
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Google People API](https://developers.google.com/people)
- [Infobip WhatsApp API](https://www.infobip.com/docs/api/channels/whatsapp)

### Design Resources
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Material Icons](https://fonts.google.com/icons)
- [WhatsApp Design Guidelines](https://www.whatsapp.com/brand/)

---

## 📝 Future Enhancements

### Planned Features

1. **Campaign Management**
   - Create and save campaigns
   - Schedule bulk sends
   - Template library

2. **Message Sending**
   - Integrate Infobip WhatsApp API
   - Send to selected contacts
   - Delivery status tracking

3. **Message Logs**
   - View sent messages
   - Filter by status (sent, delivered, read, failed)
   - Export logs to CSV

4. **Contact Groups**
   - Create custom groups
   - Tag contacts
   - Filter by group

5. **Templates**
   - Save frequently used messages
   - Variable substitution ({{name}}, {{company}})
   - Template categories

6. **Analytics Dashboard**
   - Message delivery rates
   - Open rates (if available)
   - Cost tracking

7. **User Management**
   - Multiple team members
   - Role-based permissions
   - Activity logs

8. **Webhooks**
   - Receive delivery status updates
   - Process incoming messages
   - Auto-responders

### Technical Improvements

1. **Rate Limiting**
   - Implement per-user API rate limits
   - Cloudflare Workers KV for tracking

2. **Caching**
   - Cache dashboard stats (5 min TTL)
   - Cache contact counts
   - Use Cloudflare Cache API

3. **Error Tracking**
   - Integrate Sentry or similar
   - Log errors to D1 table
   - Alert on critical errors

4. **Testing**
   - Unit tests for utility functions
   - Integration tests for API endpoints
   - E2E tests with Playwright

5. **Monitoring**
   - Cloudflare Analytics
   - Custom metrics (message volume, error rates)
   - Uptime monitoring

---

## 🤝 Contributing Guidelines

### Branching Strategy

- `main` - Production branch (auto-deploys)
- `develop` - Integration branch
- `feature/*` - Feature branches
- `fix/*` - Bug fix branches
- `hotfix/*` - Production hotfixes

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**: feat, fix, docs, style, refactor, test, chore

**Examples**:
```
feat(contacts): add export to CSV functionality

fix(auth): correct JWT base64url encoding issue

docs(readme): update deployment instructions
```

### Pull Request Process

1. Create feature branch from `develop`
2. Make changes with clear commits
3. Test on preview deployment
4. Create PR with description
5. Wait for review and CI checks
6. Merge to `develop`
7. Deploy to production via `main`

---

## 📧 Support & Contact

**Project Maintainer**: Palmiye IT Team
**Issues**: GitHub Issues
**Documentation**: This file (AGENT.md)

---

## 📄 License

Proprietary - Palmiye Company
All rights reserved.

---

**Last Updated**: 2024-10-29
**Version**: 1.0.0
**Status**: Production

---

## 🤖 Notes for AI Agents

### When Working on This Project:

1. **Read this file first** - It contains everything you need to know
2. **Check git history** - See recent changes and patterns
3. **Test on preview URL** - Don't merge untested code
4. **Follow conventions** - Consistency is key
5. **Update this file** - Keep documentation current
6. **Ask before major changes** - Consult with team/user

### Common Agent Tasks:

**"Add a new API endpoint"**:
1. Create `functions/api/<path>/<name>.js`
2. Export `onRequestGet` or `onRequestPost`
3. Use `createProtectedRoute()` if auth required
4. Return JSON responses
5. Handle errors with try-catch
6. Update this AGENT.md with endpoint docs

**"Fix a bug"**:
1. Reproduce the issue
2. Check console logs and Network tab
3. Search this file for related info
4. Make minimal changes
5. Test thoroughly
6. Document in commit message

**"Add a UI feature"**:
1. Update `public/index.html` for markup
2. Add logic to `public/app.js`
3. Use Tailwind classes for styling
4. Test responsiveness
5. Ensure accessibility

**"Optimize database queries"**:
1. Review "Common Issues" section
2. Use D1 batch API for bulk operations
3. Chunk large IN clauses (< 500 params)
4. Add indexes if needed
5. Test with production data volume

### Debugging Tips:

- **Auth issues**: Check JWT format, cookie settings, middleware logs
- **Import failures**: Check D1 query limits, batch sizes
- **UI not updating**: Check event listeners, console errors
- **Deployment fails**: Check wrangler.toml, environment variables

---

**End of AGENT.md**
