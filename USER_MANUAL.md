# DPS Agency OS — Team User Manual

Welcome to the **DPS Agency OS** portal. This document details how to navigate the platform, manage attendance, log daily tasks, update sales pipelines, track financial actions, and secure your credentials based on your team role.

---

## 🔐 1. Authentication & Security

### 1.1 Superuser Login (OTP Enforced)
* **Access**: Superadmin logins require **Two-Factor Authentication (2FA)**.
* **Flow**:
  1. Go to `https://crm.digitalproductsolutions.in/login`.
  2. Enter the Superadmin credentials.
  3. The system will prompt you for a **6-digit verification code**.
  4. Check your registered inbox (`digitalproductkerala@gmail.com`) for the code and enter it to log in.
  5. The OTP code is valid for **10 minutes** before expiration.

### 1.2 Team Member Credentials & Invitations
* When the administrator creates a new account for you, or resets your password, **an automatic email is dispatched** containing your login details and a direct welcome link.
* Check your inbox for the welcome alert to gain access to the system.

### 1.3 Personal Profile Password Resets (Self-Serve)
You do not need to contact the admin to update your password:
1. Go to your **Profile** page (click your avatar at the top right -> *My Profile*).
2. Find the **Security & Password** card.
3. Click **Request Password OTP**. A 6-digit access code will be emailed to you immediately.
4. Input your **New Password**, the **6-digit verification code**, and click **Change Password**.

---

## ⏱️ 2. Attendance & Punch Cards (Daily Logins)

Your daily work hours are tracked directly via the real-time header card on your **Dashboard**:
* **Check In**: At the start of your shift, click **Check In**. The button will record your check-in timestamp and mark you as **Active**.
* **Check Out**: At the end of your shift, click **Check Out**. This calculates your shift duration (logged in hours) and marks your status as **Completed** for the day.
* *Note*: If you forget to check out, make sure to adjust your hours or contact your administrator to correct the log.

---

## 📈 3. Sales & Lead Pipeline (CRM)

Navigate to the **Leads** menu to manage active deals:
* **Kanban View**: Visual board with stages: `New` ➡️ `Contacted` ➡️ `Meeting Scheduled` ➡️ `Proposal Sent` ➡️ `Negotiation` ➡️ `Won` / `Lost`.
* **Dragging Cards**: Move leads between stages by dragging cards into the appropriate column.
* **Lead Scores & Values**: High-priority deals are color-coded (e.g., **HOT**). Keep the estimated deal value and next follow-up dates updated.

---

## 💼 4. Client & Project Coordination

* **Client Profiling**: Service clients and product clients are managed under the **Clients** tab. Primary contacts, tax information (GSTIN/PAN), and billing documents are housed here.
* **Project Boards**: Active client tasks are organized under **Projects** and **Tasks**. 
* **Milestones**: Track delivery timelines and overdue tasks using warning badges.

---

## 💵 5. Finance, Invoices & Expense Reimbursements

Under the **Finance** tab:
* **P&L Overview**: Summarizes total invoiced revenue, collected payments, expenses, and outstanding debts.
* **Invoices**: Create client invoices, generate PDFs, and record client payments (Bank Transfers, Cash, Stripe).
* **Expenses**: Log business expenses (SaaS subscriptions, salary, hardware assets) and request admin approval for reimbursement.

---

## 👥 6. Role & Permission Matrix (Who Can Access What)

Below is the authorization grid detailing menu visibility and actions available per role:

| Feature/Module | Admin / Superadmin | Manager | Developer / Designer | Marketer | Support | Finance |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Dashboard** | View | View | View | View | View | View |
| **Tasks & SOPs** | Full Access | Full Access | Full Access | Full Access | Full Access | Full Access |
| **Attendance Log** | View/Manage | Log Hours | Log Hours | Log Hours | Log Hours | Log Hours |
| **Leads CRM** | Full Access | Full Access | No | Full Access | No | No |
| **Clients Hub** | Full Access | Full Access | No | No | Full Access | Full Access |
| **Projects & Products**| Full Access | Full Access | Full Access | No | No | No |
| **Follow-ups** | Full Access | Full Access | No | No | Full Access | No |
| **Finance & Invoicing**| Full Access | No | No | No | No | Full Access |
| **Marketing & SEO** | Full Access | No | No | Full Access | No | No |
| **Servers / Infra** | Full Access | No | No | No | No | No |
| **Settings & Reports** | Full Access | View Reports | No | No | No | View Reports |

> [!NOTE]
> If you need access to a module outside your default role permissions, the Administrator can grant you custom overrides inside the **Team Control** panel.

---

## 📧 7. Troubleshooting & Notifications

* **Notification Bell**: Located in the top bar. You will receive alerts whenever tasks are assigned to you, follow-ups are due, or when invoices are updated.
* **Global Search**: Type `Cmd + K` (or `Ctrl + K`) to quickly look up clients, leads, tasks, or projects from anywhere in the platform.
