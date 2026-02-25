

# MyMedic MVP — Updated Implementation Plan (Per User Flows Document)

## Overview
A HIPAA-conscious healthcare platform connecting Patients with Verified Healthcare Professionals. Three distinct roles: Patient, Professional, Super Admin — each with isolated dashboards and strict role-based access.

---

## 🎨 Design System
- **Primary:** Dark Teal `#174353` → `#1D556A` (headers, nav, sidebar)
- **Accent:** Neon Cyan `#45C4E5` (CTAs, badges, active states)
- **Backgrounds:** White `#FFFFFF` cards, Off-white `#F8FAFC` page bg
- **Typography:** Inter font family
- **Logo:** MyMedic cross+heart logo in navigation
- Mobile-first responsive design

---

## 🗄️ Supabase Database Schema

### Core Tables (with strict RLS)
1. **profiles** — `id (FK auth.users)`, `full_name`, `phone`, `avatar_url`, `specialty`, `bio`, `years_of_experience`, `license_number`, `license_expiry`, `bank_name`, `bank_account_number`, `is_profile_complete`, `is_verified`, `created_at`
2. **user_roles** — `id`, `user_id`, `role (patient | professional | admin)` + `has_role()` security definer function
3. **verification_requests** — `id`, `professional_id`, `status (pending | approved | rejected)`, `reviewed_by`, `reviewed_at`, `rejection_reason`
4. **availability_slots** — `id`, `professional_id`, `day_of_week`, `start_time`, `end_time`, `slot_duration_mins`, `buffer_mins`, `is_blocked`
5. **time_off_blocks** — `id`, `professional_id`, `blocked_date`, `start_time`, `end_time`, `reason`
6. **appointments** — `id`, `patient_id`, `professional_id`, `scheduled_at`, `duration_mins`, `status (pending | confirmed | declined | completed | cancelled)`, `consultation_notes`, `meet_link`, `created_at`
7. **messages** — `id`, `appointment_id`, `sender_id`, `content`, `created_at` (only accessible for confirmed appointments)
8. **transactions** — `id`, `appointment_id`, `patient_id`, `professional_id`, `amount`, `platform_fee`, `net_amount`, `paystack_reference`, `status (pending | success | failed)`, `created_at`
9. **wallets** — `id`, `professional_id`, `balance`, `updated_at`
10. **payout_requests** — `id`, `professional_id`, `amount`, `status (pending | paid)`, `requested_at`, `paid_at`, `processed_by`

### Key RLS Policies
- Patients: read/write own profile, own appointments, own messages for confirmed appointments
- Professionals: read/write own profile, own availability, appointments assigned to them, messages for their appointments
- Admins: read all profiles/appointments, manage verification_requests, process payouts
- `has_role()` security definer function gates all access

---

## 🔐 Authentication Flow
- **Registration:** Email/Password with role selection (Patient or Professional)
- **Email Verification:** OTP/verification link → activates account
- **Patient Badge:** "Verified Patient" badge automatically granted upon email verification
- **2FA Login:** Email/Password → OTP prompt → JWT token → role-based dashboard redirect
- **Password Reset:** Forgot password → email link → `/reset-password` page

---

## 📱 Pages & User Flows

### Shared Pages
- **Landing Page** — Hero with "Book a Doctor" CTA, trust signals, how-it-works section
- **Auth Pages** — Login, Register (with role selector), OTP verification, Password Reset
- **404 Page** — Branded not-found

---

### 1. 🩺 Patient Flow (`/patient/*`)

#### Phase 1: Onboarding
- **Registration** → email/password + role = "patient" → email OTP verification → "Verified Patient" badge

#### Phase 2: Discovery & Booking
- **Dashboard Home** — Upcoming appointments, quick-book CTA, past consultations
- **Settings** — Optional Google Calendar connection for syncing appointments
- **Discover Professionals** — Search/filter by specialty, only verified professionals shown, profile cards with badge
- **Professional Profile** — Bio, specialty, years of experience, available time slots calendar
- **Request Appointment** — Select available slot → creates appointment with PENDING status

#### Phase 3: Payment & Confirmation
- **Payment Prompt** — Triggered after professional confirms (or immediately per business logic)
- **Paystack Checkout** — Redirect to secure checkout paying into unified MyMedic central account
- **Confirmation** — Webhook marks transaction SUCCESS → appointment CONFIRMED → wallet credited (minus platform fee) → both parties notified → optional Google Calendar .ics sync

#### Phase 4: Consultation
- **Secure Chat** — Unlocked only for CONFIRMED appointments, professional shares Google Meet link here
- **Post-Consultation** — Patient can view consultation notes added by the professional

---

### 2. 👨‍⚕️ Professional Flow (`/professional/*`)

#### Phase 1: Onboarding & Verification
- **Registration** → email/password + role = "professional"
- **Profile & Credential Wizard** — Step 1: Personal Info (Name, Specialty, Bio) → Step 2: License Details (License Number, Expiry) → Step 3: Bank Account Info → Submit for review
- **Pending State** — Dashboard shows "Pending Verification" banner, cannot appear in search or accept bookings

#### Phase 2: Post-Approval Setup
- **Login with Badge** — After admin approval, profile displays "Verified Professional" badge
- **Google Calendar Integration** — Connect calendar for appointment sync & auto Meet link generation
- **Schedule Manager** — Set recurring working hours per day, define slot durations (30min/1hr), add buffer times between appointments, block specific dates/times for holidays/personal time

#### Phase 3: Appointment Management
- **Notification** — Receives notification of PENDING appointment requests
- **Consultation Hub** — Tabs: Pending / Confirmed / Declined / Completed
  - Accept → status = CONFIRMED (triggers patient payment prompt)
  - Decline → status = DECLINED (frees up calendar slot)

#### Phase 4: Service Delivery
- **Secure Chat** — Access chat thread for confirmed appointments
- **Video Link Sharing** — Share auto-generated Google Meet link (or paste Zoom link) in secure chat
- **Consultation Notes** — Add brief notes to the appointment record after the call

#### Phase 5: Wallet & Payouts
- **Wallet Dashboard** — View accrued earnings from successful consultations, transaction history
- **Request Payout** — "Request Payout" button to withdraw balance to saved bank account
- **7-Day Cooldown** — Button disabled with countdown timer after each payout request

---

### 3. 🛡️ Super Admin Flow (`/admin/*`)

#### Phase 1: Professional Verification
- **Login** — Strict credentials + 2FA
- **Verification Queue** — Table of professionals with `is_verified = false`
  - View submitted license details
  - **Approve** → sets `is_verified = true`, activates public profile, grants "Verified Professional" badge
  - **Reject** → deactivates account with rejection reason

#### Phase 2: Platform Management
- **User Moderation** — Search any user (Patient or Professional), activate/suspend/deactivate accounts for policy violations

#### Phase 3: Financial Oversight
- **Finance Dashboard** — Central platform balance, individual professional wallet balances, transaction overview
- **Payout Queue** — Table of "Pending Withdrawal Requests" from professionals
  - **Mark as Paid** → deducts from professional's wallet balance, notifies professional
  - Supports manual bank transfer or Paystack Transfers

---

## ⚡ Supabase Edge Functions
1. **paystack-webhook** — Receives payment confirmation, updates transaction to SUCCESS, credits professional wallet (amount minus platform fee), updates appointment to CONFIRMED
2. **process-payout** — Admin-triggered: marks payout as PAID, deducts wallet balance, sends notification

---

## 🔗 Integrations
- **Paystack** — Secure checkout for appointment payments into central MyMedic account
- **Google Calendar** — Downloadable `.ics` files for confirmed appointments (MVP: no OAuth, just file generation)
- **Real-time Messaging** — Supabase Realtime subscriptions on `messages` table for live chat

---

## 🚀 Implementation Order
1. **Design system** — Brand colors, typography, reusable layout components, MyMedic logo
2. **Auth flow** — Register (with role), login, OTP verification, password reset, role-based routing
3. **Database schema** — All tables, RLS policies, `has_role()` function, triggers
4. **Patient flow** — Discovery, professional profiles, booking, payment UI, dashboard, chat
5. **Professional flow** — Onboarding wizard, verification state, schedule manager, consultation hub, wallet
6. **Admin flow** — Verification queue, user moderation, finance ledger, payout processing
7. **Paystack integration** — Checkout UI + webhook edge function
8. **Real-time messaging** — Secure chat with Supabase Realtime
9. **Polish** — Mobile responsiveness, loading states, error handling, notifications

