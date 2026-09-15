# GVMC File Management & SLA Tracking System 🏛️

A full-stack municipal governance prototype built during a 30-hour hackathon. This system is designed to modernize the Greater Visakhapatnam Municipal Corporation (GVMC) by bringing transparency, accountability, and real-time tracking to departmental file approvals.

### 🚀 Key Features
*   **Role-Based Access Control (RBAC):** Secure, isolated dashboards for Citizens, Departmental Officers, and the Municipal Commissioner.
*   **Aadhaar-Linked OTP Authentication:** Secure login flow integrated with the 2Factor.in SMS API for real-time mobile verification.
*   **Executive SLA Dashboards:** Live data visualization using Recharts to track departmental efficiency, SLA breaches, and approval bottlenecks.
*   **Physical-to-Digital Bridge:** Integrated QR code and 1D spine barcode generation/scanning to log automated custody transfers of physical file folders.
*   **Immutable Audit Trails:** Time-stamped movement history and digital note sheets for complete accountability.

### 💻 Tech Stack
*   **Frontend:** React 19, TypeScript, Tailwind CSS, Vite, Framer Motion
*   **Backend:** Node.js, Express.js (Unified Server Architecture)
*   **Tools:** Recharts (Analytics), `qrcode.react` & `react-barcode` (Optical Tracking), Axios
