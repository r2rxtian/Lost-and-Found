# Lost & Found Management System

A full-stack Lost & Found workflow built with Vite, vanilla ES modules, Express, session authentication, Multer uploads, deterministic matching, and Microsoft SQL Server.

## Quick start

Requirements: Node.js 20+, npm, SQL Server, and Microsoft ODBC Driver 17 for SQL Server.

```powershell
npm install
npm run dev
```

Open `http://localhost:5173`. The API runs on `http://localhost:3001`.

## SQL Server setup

1. Run [schema.sql](server/sql/schema.sql) and then [seed.sql](server/sql/seed.sql) in SSMS or `sqlcmd`.
2. Copy `server/.env.example` to `server/.env` and fill in the local instance values. The application uses Windows trusted authentication and does not store a database password.
3. Set `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` temporarily in your terminal.
4. Run `npm run db:seed --prefix server` once. The command creates only the first administrator and refuses to run when `lf_users` already contains data.
5. Start with `npm run dev`.

SQL Server is the only runtime datastore. There are no demo accounts or fake item reports. All application writes use parameterized queries and persist users, items, images, matches, claims, verification answers, categories, locations, and activity events to the normalized `lf_*` tables.

## Commands

```powershell
npm run dev       # client and API with live reload
npm run build     # production client build
npm test          # matching + API integration tests
npm run start     # API only
```

To run the reversible SQL workflow integration test in PowerShell:

```powershell
$env:RUN_SQL_INTEGRATION='1'; npm test
```

The configured initial administrator login for this installation is `arthur@lostfound.local`. Change the email later from Admin → Users if desired; no administrator password is stored in this repository or README.

Uploads accept JPG, PNG, and WEBP files up to 5 MB and are stored in `server/uploads/`. Private verification details are stripped from USER API responses and are available only to STAFF and ADMIN sessions. Authorization is enforced by the server.

## Workflow coverage

- Lost and found report CRUD, server-side search/status filters, and pagination
- Image picker, drag/drop preview, MIME/size validation, and local upload serving
- Deterministic 100-point matching with staff confirmation/rejection
- Claim submission, private answer review, approval/rejection, and physical return
- Role-specific dashboard/navigation plus categories, locations, users, analytics, and audit logs
- Responsive desktop table/detail panel, tablet drawer, and mobile item cards
