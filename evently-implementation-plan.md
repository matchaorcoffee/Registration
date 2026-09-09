# Evently - Event Registration & QR Check-In Platform Plan

## Top-Level Overview
Evently is a modern, responsive, reusable Angular & TypeScript web application for comprehensive event management, online RSVP registration, Excel attendee import with column mapping and duplicate resolution, walk-in registration, QR code generation and live camera/token check-in, attendee directory, analytics, and event duplication.

The system is designed with standalone Angular components, reactive forms, RxJS observables, modular services, and browser `localStorage` persistence with realistic multi-event demo data.

---

## Architecture & Module Structure

1. **Core Data Models & Enums (`src/app/core/models/`)**
   - `User`, `Event`, `Registration`, `CustomQuestion`, `CustomAnswer`, `CheckIn`, `AnalyticsSummary`, `ImportValidationResult`, `ExcelRowMapping`.
2. **Core Services (`src/app/core/services/`)**
   - `StorageService`: Local persistence layer with seeding, export/import support.
   - `AuthService`: Organizer authentication state and mock session handling.
   - `EventService`: CRUD, event duplication (filtering attendees/tokens), auto-status derivation, template generation.
   - `RegistrationService`: RSVP registration, walk-in creation, lookup, attendee filters, uniqueness verification, duplicate detection.
   - `CheckInService`: QR validation, check-in state transitions, duplicate check-in rejection, recent check-in feed.
   - `QRCodeService`: Secure token QR generation (canvas/SVG base64 data URL) and simulated/camera scanning.
   - `ExcelImportService`: Parsing `.xlsx`/`.xls` (via `xlsx`), column mapping matching, row validation, duplicate detection, batch registration.
   - `AnalyticsService`: Real-time computation of RSVP stats, source breakdown, attendance rate, trend timelines.
3. **Guards & Routing (`src/app/core/guards/`, `src/app/app.routes.ts`)**
   - `AuthGuard` protecting `/dashboard` and `/events/*`.
   - Public access for `/`, `/login`, `/registration` (lookup), `/event/:eventId/register`, `/event/:eventId/confirmation/:regId`.
4. **Reusable UI & Shared Components (`src/app/shared/components/`)**
   - `NavbarComponent`, `FooterComponent`, `ToastComponent`, `ModalComponent`, `StatCardComponent`, `QRCodeDisplayComponent`, `RSVPBadgeComponent`, `StatusBadgeComponent`.
5. **Feature Modules / Standalone Views (`src/app/features/`)**
   - **Landing**: Modern SaaS landing page with core workflow showcase, quick action shortcuts.
   - **Auth**: Organizer login with quick demo credentials filler.
   - **Dashboard**: High-level organizer analytics summary, event cards, quick filters, create event trigger.
   - **Event Editor / Creator**: Reactive form with validation, banner selection/preview, datetime calculations, capacity, custom question builder.
   - **Event Management**: Tabbed hub (Overview, Attendees, Check-In, Analytics, Settings, Import).
   - **Public Registration & Confirmation**: Guest-facing responsive registration form with dynamic custom questions, instant registration ID & QR token generation, add to calendar (`.ics`), QR download.
   - **Registration Lookup**: Public search by email / registration ID with QR display and check-in status.
   - **Excel Import Flow**: Drag & drop uploader, smart column mapper, validation & duplicate resolver table, confirmation preview, batch importer.
   - **Event-Day Fast Check-In**: Camera & interactive simulated QR scanner, instant sound/visual validation badge, rapid walk-in guest form with auto-check-in, live check-in counter and recent check-in stream.
   - **Attendee Management & Export**: Filterable/sortable table, manual check-in/undo, edit modal, Excel export (`.xlsx`).
   - **Analytics**: Visual CSS/SVG chart components for RSVP distributions, check-in rates by source, hourly velocity.

---

## Sub-Tasks

### Sub-Task 1: Project Scaffolding & Core Architecture
- **Intent**: Initialize the Angular TypeScript standalone application with routing, styles, icons, dependencies (e.g. `xlsx`, `qrcode`), and core directory structure.
- **Expected Outcomes**: Valid `package.json`, Angular config, TypeScript configs, base SCSS theme with design tokens, layout shell.
- **Todo List**:
  1. Configure `package.json` with Angular dependencies, `xlsx`, `qrcode` or canvas QR generator, Lucide/Feather icons or SVG icons.
  2. Set up `angular.json`, `tsconfig.json`, `index.html`, and base styles with CSS variables for colors, typography, badges, and responsive utilities.
  3. Create `src/main.ts`, `src/app/app.config.ts`, `src/app/app.routes.ts`, and `src/app/app.component.ts`.
- **Status**: `[ ] pending`

### Sub-Task 2: Data Models & Mock Data Storage Service
- **Intent**: Define strong TypeScript types and implement persistent local storage with realistic initial seed data for 3 diverse events and rich attendee datasets.
- **Expected Outcomes**: `StorageService` initializes default data on first launch, provides reactive streams or signals, and retains updates across reloads.
- **Todo List**:
  1. Define interfaces: `Event`, `Registration`, `User`, `CustomQuestion`, `CustomAnswer`, `CheckIn`, `ExcelMapping`.
  2. Implement `StorageService` with `localStorage` fallback and realistic seed data (Conference, Workshop, Celebration) including pre-registered, imported, and walk-in guests with check-in records.
  3. Implement `AuthService` with login/logout and organizer state.
  4. Implement `AuthGuard` for protected organizer routes.
- **Status**: `[ ] pending`

### Sub-Task 3: Business Logic Services
- **Intent**: Implement services handling events, registrations, check-in, QR tokens, Excel parsing, and analytics.
- **Expected Outcomes**: Isolated, testable services containing business rules, duplicate detection, QR generation, Excel import/export processing.
- **Todo List**:
  1. `EventService`: CRUD, duplicate event (clone settings & questions without attendees/tokens), auto-status updater based on time/deadline.
  2. `RegistrationService`: Create registration with unique ID (`EVT-YYYY-XXXXXX` / `EVT-YYYY-W-XXXXXX`), unique secure QR token (`tok_...`), duplicate checks, lookup by ID/email, dynamic answers.
  3. `QRCodeService`: Generate QR code data URLs without sensitive PII, scan/decode token validation.
  4. `CheckInService`: Verify QR token against event registrations, handle already checked-in state with timestamp, record check-ins, provide live stats.
  5. `ExcelImportService`: Parse uploaded `.xlsx`/`.xls`, auto-match column names, validate rows, detect duplicates against existing event registrations, allow user override.
  6. `AnalyticsService`: Calculate registration counts by source, RSVP breakdown, attendance rates, velocity timelines.
- **Status**: `[ ] pending`

### Sub-Task 4: Shared UI Components & Layout
- **Intent**: Build reusable UI components ensuring a consistent SaaS aesthetic across all views.
- **Expected Outcomes**: Header, navigation, toast notifications, modals, status/RSVP badges, stat cards, QR display card, search/filter bars.
- **Todo List**:
  1. Create `NavbarComponent` and `FooterComponent` with active route indicators and role-aware navigation.
  2. Create `ToastService` and `ToastComponent` for immediate feedback.
  3. Create `ModalComponent` for confirmations and popups.
  4. Create `StatCardComponent`, `RSVPBadgeComponent`, `StatusBadgeComponent`.
  5. Create `QrCodeDisplayComponent` with download and copy token actions.
- **Status**: `[ ] pending`

### Sub-Task 5: Landing Page & Organizer Authentication
- **Intent**: Provide a welcoming public landing page and organizer login experience.
- **Expected Outcomes**: Polished landing page demonstrating the core workflow, quick access buttons, and a functional mock login screen with quick-fill credentials.
- **Todo List**:
  1. Build Landing Page with Hero, Feature Highlights, Step-by-step Workflow Graphic, and Call-to-Actions.
  2. Build Login View with Reactive Form, validation, demo credential quick-select button, and redirect to dashboard.
- **Status**: `[ ] pending`

### Sub-Task 6: Organizer Dashboard & Event Creation / Duplication
- **Intent**: Empower organizers to oversee all events, create new events, and clone existing events with predefined templates.
- **Expected Outcomes**: Overview metrics, event card grid with live status indicators, reactive event creation form with dynamic custom question builder, and duplicate event capability.
- **Todo List**:
  1. Build Organizer Dashboard with summary cards (Total Events, Upcoming, Registrations, Checked In) and filterable event cards.
  2. Build Event Creation & Edit Form with Reactive Forms, banner options, start/end date, capacity, contact info, and Custom Question Builder (text, number, dropdown, radio, checkbox, yes-no).
  3. Implement Event Duplication flow with template options (Conference, Workshop, Webinar, Networking, etc.).
- **Status**: `[ ] pending`

### Sub-Task 7: Event Management Hub & Tabs
- **Intent**: Centralized management route (`/events/:id`) with dedicated tabs for Overview, Attendees, Check-In, Analytics, Settings, and Import.
- **Expected Outcomes**: Responsive tabbed layout displaying event metadata, capacity progress bar, and sub-view navigation.
- **Todo List**:
  1. Build `EventDetailsComponent` shell with header stats, capacity meter, and tab routing.
  2. Build `EventOverviewTab` with quick summary metrics, shareable registration links, and quick actions.
  3. Build `EventSettingsTab` allowing config toggles (registration status, deadline, walk-in enabled, custom questions).
- **Status**: `[ ] pending`

### Sub-Task 8: Public Event Registration & Lookup
- **Intent**: Allow guests to register online without an account on mobile-first responsive interfaces, choose RSVP, answer rich custom question types (Text, Number, Dropdown, Radio, Checkbox, Yes/No), receive a QR pass, and lookup existing registrations.
- **Expected Outcomes**: Highly polished mobile-first responsive registration page (`/event/:eventId/register`), dynamic reactive form renderer for all 6 custom question types with validation, capacity checking, instant confirmation view with QR code, calendar download, and standalone lookup page (`/registration`).
- **Todo List**:
  1. Build Public Registration Form (mobile-first) with guest details, RSVP options (Attending, Maybe, Declined), dynamic custom question controls (Text, Number, Dropdown, Radio, Checkbox multi-select, Yes/No toggle), duplicate protection, and capacity check.
  2. Build RSVP Confirmation page with mobile-friendly QR pass card, registration ID badge, and `.ics` calendar generator.
  3. Build Public Registration Lookup page allowing search by email or registration ID with full QR view and responsive layout.
- **Status**: `[ ] pending`

### Sub-Task 9: Excel Attendee Import & Export
- **Intent**: Enable organizers to bulk upload attendee spreadsheets with column mapping, preview validation, duplicate resolution, and export live attendee lists.
- **Expected Outcomes**: Multi-step import modal/view with file drop, auto/manual column mapping, validation summary, duplicate resolution (skip, update, import anyway), batch QR generation, and one-click Excel export.
- **Todo List**:
  1. Build Excel Uploader supporting `.xlsx` and `.xls`.
  2. Build Column Mapping UI supporting variations (`Full Name`, `Email Address`, `Phone`, `Company`, `Role`, etc.).
  3. Build Preview & Validation screen highlighting valid rows, duplicates, and email format issues.
  4. Implement batch import execution with ID and QR token generation.
  5. Implement `Export Attendees` feature to download current data to `.xlsx`.
- **Status**: `[ ] pending`

### Sub-Task 10: Event-Day Fast Check-In & Walk-In Registration
- **Intent**: Provide a zero-friction, touch-friendly event check-in interface designed specifically for mobile and tablet devices, featuring live camera QR scanning, simulated test scanner, instant visual validation, fast manual lookup, and integrated Walk-In registration with custom question support and auto-check-in.
- **Expected Outcomes**: Mobile/tablet-first check-in screen with large touch targets, seamless camera scanner & quick-test selector, prominent status feedback cards (Success, Already Checked In with original timestamp, Invalid), fast Walk-In drawer/modal with custom questions and automatic check-in (`checkInStatus = true`, `checkInTime = now`), live attendance meter, and recent check-in feed.
- **Todo List**:
  1. Build Event-Day Check-In interface with large touch-friendly buttons: `[ 📷 SCAN QR ]` and `[ + WALK-IN GUEST ]` with zero-navigation switching.
  2. Integrate live video camera scanner with fallback simulated scanner selector for easy testing without hardware webcam.
  3. Build instant feedback cards with distinct styling: Green (Check-in Successful), Amber (Already Checked In with previous timestamp), Red (Invalid Registration).
  4. Build Fast Manual Attendee Search & Check-in drawer with instant typing filter.
  5. Build Rapid Walk-In Form with dynamic custom questions, instant registration ID & QR token generation, and automatic check-in status.
- **Status**: `[ ] pending`

### Sub-Task 11: Attendee Management & Real-Time Analytics
- **Intent**: Comprehensive attendee directory management and visual analytics charts.
- **Expected Outcomes**: Searchable, filterable attendee table with source badges, manual check-in/undo actions, and rich SVG/CSS analytics charts (RSVP breakdown, check-in velocity, source distribution).
- **Todo List**:
  1. Build Attendee Management table with search by name/email/ID, multi-filter dropdowns (Pre-registered, Imported, Walk-in, RSVP, Check-in status), and quick action buttons.
  2. Build Edit & Attendee Detail modal.
  3. Build Analytics view with SVG donut/pie charts, bar charts for registration sources, attendance rate meters, and check-in timeline trends.
- **Status**: `[ ] pending`

### Sub-Task 12: Validation, End-to-End Testing & Polish
- **Intent**: Verify all 36+ MVP capabilities end-to-end, test responsive layouts across viewports, verify persistence, and ensure smooth UI interactions.
- **Expected Outcomes**: Application builds cleanly, all user flows function without errors, zero console warnings, responsive design on mobile/tablet/desktop.
- **Todo List**:
  1. Run production build / typecheck.
  2. Validate complete user flow: Organizer login -> Create/Edit/Duplicate event -> Public RSVP -> QR generation -> Lookup -> Excel import with column mapping -> Walk-in registration -> QR scanner & manual check-in -> Export -> Analytics.
  3. Verify browser persistence across reloads.
- **Status**: `[ ] pending`
