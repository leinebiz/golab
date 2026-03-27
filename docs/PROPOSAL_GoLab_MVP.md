# GoLab MVP — Development Proposal

**Date:** 26 March 2026
**Prepared by:** Christoph Leinemann

---

## What You Get

A working MVP of the GoLab portal implementing the workflow described in your four scoping documents (Brief Document, Business Requirements, Sample Testing SOP, and Flowchart), deployed to a single environment on AWS for you to thoroughly test and evaluate.

The goal is for you to test it extensively, confirm the workflow works for your business, and then decide whether to continue with me or hand it to another developer to take it further.

---

## Agreement Summary

|                                      |              |
| ------------------------------------ | ------------ |
| **MVP**                              | $6,000 USD   |
| **Post-handover support (6 months)** | $350 / month |

### MVP — $6,000

Delivered as a single deployment on AWS for testing and evaluation. Covers:

- Customer registration, login, profile management
- Credit application and approval workflow
- COD payment flow with Stripe (payment links, confirmation gate)
- Test catalogue with accredited/non-accredited status
- Quote request, review, acceptance
- Invoice generation on acceptance
- Lab selection logic (closest lab, multi-lab split)
- Lab portal: sample acceptance, issue logging, turnaround updates, result upload
- GoLab review and approval workflow (approve, hold, return to lab)
- Certificate validation against request/test reference
- Customer release with options (accept, callback, retest, send to another lab)
- Customer dashboard: request history, statuses, certificate repository, financials
- Unique reference structure across all entities
- Tolerance capture (profile-level defaults + per-request overrides)
- Customer and laboratory disclaimers (versioned, auditable)
- Email notifications at all key workflow stages
- WhatsApp notifications (via Twilio)
- KPI dashboard and management reporting
- Exception workflow with status tracking, assignment, and audit trail
- Branded certificate PDF generation (GoLab format)
- Full audit trail across all entities
- Role-based access (Customer, Lab, GoLab Admin, Finance)
- Single-environment deployment with SSL
- User documentation / walkthrough

Moving to a full production setup (separate dev/staging/production environments, automated backups, monitoring, scaling) would be part of a follow-on engagement if you decide to proceed.

### Post-Handover Support — $350/month for 6 months

Covers:

- AWS hosting (compute, database, storage, email)
- Bug fixes for issues found during testing and usage
- Minor adjustments (field changes, status labels, notification wording)

Does **not** cover new features, new integrations, or scope changes — those would be quoted separately.

---

## Intellectual Property & Source Code

All source code, documentation, and related assets developed under this agreement are transferred in full to the client upon completion of each milestone payment.

- Upon final payment: complete and unrestricted ownership of all IP, source code, infrastructure configuration, and documentation
- If either party decides not to continue the engagement at any point, all work completed up to that point (and paid for) is handed over — including source code, database schemas, deployment configurations, and any related assets
- The client is free to engage any other developer or team to continue the project using the delivered codebase

---

## What's Fully Included vs. What Depends on External Factors

### Fully included — no dependencies

| Area                       | Detail                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| **Payments**               | Stripe integration — payment links, confirmation, invoicing. Works globally including ZAR. |
| **Email notifications**    | All 19 notification triggers from the SOP, via Resend or AWS SES.                          |
| **WhatsApp notifications** | Via Twilio WhatsApp API.                                                                   |
| **Authentication**         | Email/password login. Role-based access.                                                   |
| **Database & storage**     | PostgreSQL, S3 for certificates/documents.                                                 |
| **PDF generation**         | Branded certificates, request forms, invoices.                                             |
| **Deployment**             | Single environment on AWS with SSL.                                                        |

### Depends on you providing information

| Area                     | What I need                                       | Fallback if not provided                                                |
| ------------------------ | ------------------------------------------------- | ----------------------------------------------------------------------- |
| **Test catalogue**       | List of real tests, accreditation status, pricing | I'll build the admin UI to manage tests, but ship with placeholder data |
| **Lab directory**        | Lab names, locations, test capabilities           | Same — admin UI ready, placeholder data                                 |
| **Certificate template** | A sample certificate to replicate                 | Generic GoLab-branded template, refined once you provide a sample       |
| **Tolerances**           | Example of what a real tolerance looks like       | Flexible numeric field that can be adjusted once format is confirmed    |

### Requires a third-party API — transparent limitations

| Area                    | Situation                                                                                                                            | What I deliver                                                                                                                                                                                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Courier integration** | The documents reference a courier API but don't name the provider. I can't build a real integration without their API documentation. | A **courier integration module** with: manual waybill upload, status tracking in the portal, and notification triggers. The moment you confirm which courier and provide API access, I plug it in. The workflow is fully functional — just the pickup trigger and auto-waybill are manual until then. |

This is the one area where the system won't be fully automated without the courier API. Everything else is functional.

---

## Tech Stack

| Layer          | Technology                      |
| -------------- | ------------------------------- |
| Frontend       | Next.js (React)                 |
| Backend / API  | Next.js API routes              |
| Database       | PostgreSQL (AWS RDS)            |
| File storage   | AWS S3                          |
| Authentication | NextAuth.js v5                  |
| Payments       | Stripe                          |
| Email          | AWS SES or Resend               |
| WhatsApp       | Twilio                          |
| PDF generation | React-PDF or Puppeteer          |
| Hosting        | AWS (ECS or App Runner)         |
| Monitoring     | CloudWatch + structured logging |

---

## Timeline

| When                     | Deliverable                                                                 |
| ------------------------ | --------------------------------------------------------------------------- |
| **Mid May**              | First cut — core workflow available for initial review and feedback         |
| **Mid May – Early June** | 3 weeks of testing, feedback, and adjustments                               |
| **Early June**           | MVP complete — all features listed above, deployed and ready for evaluation |

---

## What's NOT Included

- Mobile app (the portal is responsive/mobile-friendly, but no native app)
- AI/RAG chat support
- Courier API integration (until courier is confirmed and API access provided)
- Migration from any existing system
- Custom domain and DNS setup (happy to advise)
- Ongoing feature development beyond bug fixes

Any of these can be added as a separate scope.
