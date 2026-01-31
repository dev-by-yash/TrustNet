# TrustNet Enterprise Platform

![Status](https://img.shields.io/badge/Status-Production%20Ready-success)
![Version](https://img.shields.io/badge/Version-0.1.0-blue)
![License](https://img.shields.io/badge/License-Proprietary-orange)

> **Secure Decentralized Virtual Private Network (DVPN) for Enterprise Privacy**

TrustNet is a next-generation enterprise interface designed for high-security, decentralized network management. Built with a "Zero-Trust" philosophy, it provides a sovereign dashboard for managing employee nodes, auditing encrypted traffic, and executing zero-knowledge transfers.

---

## 🚀 Overview

TrustNet redefines the corporate VPN experience by visualizing the invisible. The platform replaces traditional, clunky VPN clients with a sleek, data-dense "Encrypted Vault" interface that provides real-time situational awareness of network topology, node health, and value transmission.

### ⚡ Key Capabilities

- **🔐 Sovereign Authorization:** Multi-step identity verification wizard with role-based access control and crypto-wallet integration.
- **🕸️ Real-Time Network Topology:** Live visualization of active relay nodes, latency metrics, and global traffic load.
- **🛡️ Zero-Knowledge Transfers:** Simulated ZK-SNARK protocol interface for private value transmission between nodes.
- **👥 Employee Node Grid:** Administrative monitoring of connected workforce nodes with IP hashing and connection status.
- **📜 Immutable Audit Ledger:** Component-level logging of all system actions for compliance and security auditing.
- **🎨 "Encrypted Vault" Design System:** specific dark-mode aesthetic utilizing deep charcoal backgrounds and neon status indicators for maximum readability in low-light SOC environments.

---

## 🛠 Tech Stack

The project leverages the bleeding edge of the React ecosystem to deliver optimal performance and type safety.

| Category | Technology | Description |
|----------|------------|-------------|
| **Core** | [Next.js 16](https://nextjs.org/) | App Router architecture for server-side rendering and layouts. |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | Strict type-checking for enterprise-grade reliability. |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) | Utility-first styling with custom "Vault" theme tokens. |
| **Motion** | [Framer Motion](https://www.framer.com/motion/) | Cinematic, staggered entry animations and complex micro-interactions. |
| **Icons** | [Lucide React](https://lucide.dev/) | Consistent, clean SVG iconography. |
| **Components** | Radix UI / Shadcn | Accessible, headless UI primitives customized for the cyber-aesthetic. |

---

## 📂 Project Structure

```bash
trustnet/
├── src/
│   ├── app/                 # Next.js App Router (Pages & Layouts)
│   │   ├── auth/            # Authentication & Onboarding Wizard
│   │   ├── dashboard/       # Protected Application Routes
│   │   │   ├── audit/       # Compliance Logs
│   │   │   ├── employees/   # Node Management
│   │   │   ├── network/     # Topology Visualization
│   │   │   ├── settings/    # Config & Security
│   │   │   └── transfer/    # ZK-Transaction Interface
│   │   ├── layout.tsx       # Root Layout (Fonts & Globals)
│   │   └── page.tsx         # Public Landing Page
│   ├── components/          # React Components
│   │   ├── dashboard/       # Dashboard-specific Widgets
│   │   ├── layout/          # Navbar, Sidebar, Shells
│   │   ├── ui/              # Atomic Design System (Buttons, Cards, Badges)
│   │   └── wallet/          # Web3 Connection Modules
│   └── lib/                 # Utilities & Helpers
└── public/                  # Static Assets
```

---

## 📦 Getting Started

Follow these steps to deploy the TrustNet interface locally.

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/trustnet.git
   cd trustnet
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the Development Server**
   ```bash
   npm run dev
   ```

4. **Access the Application**
   - Public Landing: `http://localhost:3000`
   - Authentication: `http://localhost:3000/auth`
   - Dashboard: `http://localhost:3000/dashboard`

---

## 🎨 Theme Configuration

The "Encrypted Vault" theme is defined in `src/app/globals.css` and extended in `tailwind.config.ts`.

- **Primary Background:** `var(--bg-primary)` (Deep Slate)
- **Primary Text:** `var(--text-primary)` (Off-White)
- **Accent Green:** `var(--accent-primary)` (Status: OK / Verified)
- **Accent Blue:** `var(--accent-secondary)` (Status: Info / Connected)

---

## 📄 License

© 2026 TrustNet Enterprise Platform. All rights reserved.
Proprietary software for internal enterprise use.

---

*Verified by TrustNet Security Protocols.* 
*System Hash: 0x7A...9B2*
