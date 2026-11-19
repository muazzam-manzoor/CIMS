# CIMS — Car Inventory Management System

CIMS is a business application for managing vehicle inventory and the financial activity around vehicle sales. It brings day-to-day operational records—vehicles, sales, payments, expenses, partner contributions, and loans—into one application.

This is a customer project that I independently developed and delivered. It is used in day-to-day business operations.

## The problem

Managing vehicle stock and related financial activity across separate records makes it difficult to understand the current state of the business. CIMS provides a central place to record vehicle activity and follow the money associated with that activity.

## Key capabilities

- **Vehicle inventory:** maintain vehicle records and supporting images.
- **Sales management:** record sales and review sale details.
- **Payments and balances:** track full or partial payments and outstanding amounts.
- **Returns and refunds:** record returned sales and related refund activity.
- **Expenses:** maintain vehicle-specific expenses and general business expenses.
- **Partner and investment records:** track partner contributions and investments.
- **Loans:** record borrowed funds, loans issued, repayments, and remaining balances.
- **Financial tracking:** maintain a transaction history across supported business activities.
- **Dashboards and reports:** review operational and financial information.
- **Access and accountability:** role-based access and audit logging.

## Technology

| Area | Technologies |
|---|---|
| Application | Next.js App Router, React, TypeScript |
| Database | MongoDB, Mongoose |
| Styling | Tailwind CSS |
| Authentication and security utilities | jose, bcryptjs |
| Image management | Cloudinary |
| UI feedback and icons | Sonner, Lucide React |

CIMS uses Next.js route handlers and server-side application logic; it is not a separate Express-based MERN backend.

## Application structure

The project follows the Next.js App Router structure.

- `app/` — application routes, layouts, and API route handlers
- `components/` — reusable interface components
- `lib/` — shared utilities and application helpers
- `public/` — static assets
- `scripts/` — project scripts, including the admin creation utility

## Run locally

### Prerequisites

- Node.js and npm
- A MongoDB database
- A Cloudinary account for image functionality

### Setup

1. Clone the repository.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure the environment values required by the application in `.env.local`. These include the database connection, authentication, and Cloudinary configuration. Keep real credentials out of source control.
4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

### Available scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build the application |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run admin:create` | Run the admin creation script using `.env.local` |

Use the admin creation script only after configuring the required environment values and reviewing the script's expected inputs.

## My contribution

I designed and implemented the application across its frontend, backend route handlers, data models, and business workflows. My work included translating operational requirements into inventory, sales, payment, expense, partner, loan, and reporting functionality.

## Screenshots

Screenshots can be added here when they are approved for public sharing. Avoid publishing customer records, personal information, credentials, or other sensitive business data.

## Notes

CIMS is an operational business application. The financial tracking described here reflects the application's recorded workflows; this README does not claim formal accounting certification or double-entry accounting compliance.
