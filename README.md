# Sahas Attendance System

A high-performance, premium web application built with **Next.js** for tracking attendance in the Sahas community (workouts, technical sessions, meetings, and Sahas Sundays).

## Key Features

- **QR Code Scanning**: Rapid scanner with instant visual and audio feedback, dynamically marking members as *Present*, *Late*, or *Very Late* based on event start times.
- **Google Sheets Backend**: Uses Google Sheets as a database (Attendance matrix, Members registry, and Session logs), requiring no traditional SQL/NoSQL setup.
- **Offline Resilience**: Local queueing of scans when offline; automatically syncs queued records to the cloud when internet connectivity resumes.
- **Advanced Email Protection**: Validates new member email addresses against invalid structures, disposable/temporary email providers, and resolves DNS MX records.
- **Alphabetical Synchronization**: Keeps both the Members registry and the Attendance sheet rows physically sorted in alphabetical order (and by ID number for duplicate names) in real-time.
- **Premium UX**: Responsive design with clean glassmorphic components, audio feedback cues, and dark mode support.
- **Security Headers (HSTS, CSP, Frame Guards)**: Robust HTTP header configuration protecting against Clickjacking, MIME sniffing, and script injections.

## Spreadsheet Structure

The application automatically creates and manages three sheets within your Google Spreadsheet:

1. **`Attendance`**: A matrix where **Column A** houses member names (sorted alphabetically) and **Row 1** holds chronological session dates. Cells record `Present`, `Late`, `V-Late`, or `Absent`.
2. **`Members`**: A registry of registered members containing their ID (e.g. `SAHAS-MEM-001`), Name, Email, and Creation Timestamp.
3. **`Sessions`**: A log containing three columns: `Session Date`, `Start Time`, and `Session Name`.

## Configuration & Setup

Create a `.env.local` file in the root of the project directory with the following configuration:

```env
# Google Sheets Credentials
GOOGLE_SHEETS_CLIENT_EMAIL=your-service-account-email@developer.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
GOOGLE_SHEETS_ID=your-google-spreadsheet-id

# JWT Authentication
JWT_SECRET=your-random-jwt-signing-key
```

## Getting Started

First, install dependencies:

```bash
npm install
```

Second, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to launch the application.

## Production Build

To build the application for deployment:

```bash
npm run build
```

This compiles type safety, builds pages, and optimizes code for production.
