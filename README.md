# Lost & Found Management System

A full-stack Lost & Found workflow built with Vite, vanilla ES modules, Express, session authentication, Multer uploads, deterministic matching, and Microsoft SQL Server. The UI follows the supplied deep-navy three-column dashboard reference and adapts to a drawer/card layout on tablets and phones.

## Quick start

Requirements: Node.js 20+ and npm.

```powershell
npm install
npm run dev
```

Open `http://localhost:5173`. The API runs on `http://localhost:3001`.

The default `DB_MODE=demo` uses `server/data/demo-store.json`, a persistent local development store. This makes the complete workflow immediately runnable without a SQL Server installation.

Demo accounts:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@lostfound.test` | `Admin123!` |
| Staff | `staff@lostfound.test` | `Staff123!` |
| User | `user@lostfound.test` | `User123!` |

## SQL Server setup

1. Run [schema.sql](server/sql/schema.sql) and then [seed.sql](server/sql/seed.sql) in SSMS or `sqlcmd`.
2. Copy `server/.env.example` to `server/.env` and fill in the connection values.
3. Set `DB_MODE=sql`.
4. From the project root, run `npm run db:seed --prefix server` once. The command refuses to run when `lf_users` already contains data.
5. Start with `npm run dev`.

All application writes use parameterized queries. SQL mode persists users, items, images, matches, claims, verification answers, categories, locations, and activity events to the normalized `lf_*` tables.

## Commands

```powershell
npm run dev       # client and API with live reload
npm run build     # production client build
npm test          # matching + API integration tests
npm run start     # API only
```

Uploads accept JPG, PNG, and WEBP files up to 5 MB and are stored in `server/uploads/`. Private verification details are stripped from USER API responses and are available only to STAFF and ADMIN sessions. Authorization is enforced by the server.

## Workflow coverage

- Lost and found report CRUD, server-side search/status filters, and pagination
- Image picker, drag/drop preview, MIME/size validation, and local upload serving
- Deterministic 100-point matching with staff confirmation/rejection
- Claim submission, private answer review, approval/rejection, and physical return
- Role-specific dashboard/navigation plus categories, locations, users, analytics, and audit logs
- Responsive desktop table/detail panel, tablet drawer, and mobile item cards
