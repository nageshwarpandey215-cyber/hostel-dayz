# Hostel-Dayz

A responsive hostel management web app for students and the warden/admin — built with pure **HTML, CSS and JavaScript**. No build tools, no frameworks, no backend: all data persists in the browser via **localStorage** and the app is seeded with realistic demo records on first load.

## Folder structure — Separate folder to understand easily
```
hostel-dayz/
├── index.html              # Dashboard (home page — GitHub Pages isi ko kholta hai)
├── pages/                  # Saare pages, ek jagah
│   ├── register.html       # Student registration
│   ├── leave.html          # Leave applications + Warden View
│   ├── announcements.html  # Notices board
│   ├── complaints.html     # Complaint tracking
│   └── fees.html           # Fee payment (demo/test mode)
├── css/
│   └── style.css           # Poora design, ek hi stylesheet (mobile-first)
├── js/                     # Har page ka alag JavaScript
│   ├── app.js              # Common code: navigation, seed data, helpers
│   ├── register.js         # Registration + students table
│   ├── leave.js            # Leave apply + approve/reject
│   ├── announcements.js    # Notices post/delete
│   ├── complaints.js       # Complaints + tracking ID + status
│   └── fees.js             # PaymentGateway (demo mode, card/UPI validation)
├── assets/
│   └── logo.svg            # Logo
└── README.md               # Ye file
```

I made this project because in hostels, work like registration, leave applications and complaints is mostly done on paper. I wanted to make it simple and digital, so that students can do all this from one place.

## Features

| Page | What it does |
|---|---|
| **Dashboard** (`index.html`) | Hero, live stats (students registered, pending leaves, open complaints, announcements), quick links, latest announcements preview |
| **Register** (`pages/register.html`) | Student registration form (name, email, phone, room, course, year) with validation; registered-students table with delete |
| **Leave** (`pages/leave.html`) | Digital leave applications (from/to dates, reason) → `PENDING`; **Warden View** tab to Approve/Reject with status badges and filters |
| **Announcements** (`pages/announcements.html`) | Admin form to post notices; newest-first board with timestamps and delete |
| **Complaints** (`pages/complaints.html`) | Raise complaints (Mess / Room / Electricity / Water / Other) → each gets a tracking ID (`CMP-XXXX`); status workflow **Open → In Progress → Resolved**; filter by status |
| **Fees** (`pages/fees.html`) | Fee payment with gateway-style checkout modal: **Card** (Luhn validation, expiry check, CVV) or **UPI** option, TEST MODE banner, simulated processing, success receipt with transaction ID (`TXN-…`), full payment history table |

## Tech stack

- HTML5, CSS3 (single mobile-first stylesheet), vanilla JavaScript (ES5-compatible)
- `localStorage` as the data store — collections: `students`, `leaves`, `announcements`, `complaints`, `payments`

## How to run

Just open `index.html` in any browser — or serve it locally (recommended, avoids any `file://` quirks):

```bash
cd hostel-dayz
python3 -m http.server 8000
# then visit http://localhost:8000
```

No `npm install`, no build step. Works offline after first load.

## Data model (localStorage)

| Key | Shape |
|---|---|
| `hd_students` | `{id, name, email, phone, room, course, year, createdAt}` |
| `hd_leaves` | `{id, name, room, from, to, reason, status: PENDING/APPROVED/REJECTED, createdAt}` |
| `hd_announcements` | `{id, title, message, createdAt}` |
| `hd_complaints` | `{id, name, room, category, description, status: Open/In Progress/Resolved, createdAt}` |
| `hd_payments` | `{id (txn), name, room, feeType, amount, method, status, createdAt}` |

Seed demo data (Indian names, rooms like `A-101`) is written once on first visit (`hd_seeded` flag). To reset the demo, clear site data in the browser or run `localStorage.clear()` in devtools and reload.

## Payment gateway design

`js/fees.js` exposes a **`PaymentGateway`** object with a clean interface:

```js
PaymentGateway.createOrder(amountInRupees)   // -> { orderId, amount }
PaymentGateway.processPayment(order, method) // -> Promise<{ txnId, method }>
```

It currently runs in **demo mode**: a clearly-labelled TEST MODE checkout simulates the 2-second gateway round-trip, validates card/UPI input, and records the receipt locally — no real money moves.

**To integrate real Razorpay test keys** (4 steps, all documented in comments inside `fees.js`):
1. Add the Razorpay checkout script to `fees.html`
2. Set `PaymentGateway.provider = "razorpay"` and `PaymentGateway.razorpayKeyId = "rzp_test_…"`
3. Add a small backend endpoint that creates a Razorpay order with your key **secret** and returns `{ orderId, amount }`; call it from `createOrder()`
4. Open Razorpay checkout with the order id inside `processPayment()` instead of the simulated delay

The same pattern works for Stripe (`stripe.confirmCardPayment()` with a PaymentIntent). The form, receipt and history UI need no changes.

## Responsive & accessibility notes

- Mobile-first CSS; nav collapses to a hamburger menu, stat cards go 2-up, tables collapse into labelled stacked cards on small screens
- `:focus-visible` outlines on all interactive elements, semantic landmarks (`header/nav/main/footer`), `aria-label`/`aria-selected` on tabs and dialogs, `role="status"` toast announcements
- Cross-browser-safe CSS (no experimental features; system font stack)

## Future improvements

- Real backend (Node/Express or Spring Boot) with a database so data is shared across devices
- Student login with roles (student vs warden) instead of the open warden tab
- Real Razorpay/Stripe integration using the `PaymentGateway` interface
- File upload for leave supporting documents; email/SMS notifications on status changes
- Room allocation and mess-menu management modules
