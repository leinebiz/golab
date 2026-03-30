# Third-Party Integrations

## Twilio — WhatsApp Notifications

**What it does:** Sends WhatsApp messages to customers and labs at key workflow stages (sample received, results ready, invoice paid, etc.).

**Pricing (as of 2026):**

| Component               | Cost                                        |
| ----------------------- | ------------------------------------------- |
| Twilio per-message fee  | $0.005 per message (sent or received)       |
| Meta utility messages   | Free within 24-hour service window          |
| Meta marketing messages | Varies by country (~$0.05 UK, ~$0.01 India) |

GoLab notifications are utility messages (transactional/workflow), so Meta's fee is $0 for most messages. At ~500 messages/month, expect **~$2.50/month** to Twilio.

No monthly subscription — purely pay-per-message.

**References:**

- https://www.twilio.com/en-us/whatsapp/pricing
- https://help.twilio.com/articles/30304057900699

---

## Stripe — Payments

COD payment flow via Stripe Checkout payment links. Stripe handles payment collection, confirmation, and invoicing.

**Pricing:** 2.9% + $0.30 per transaction (standard). Works globally including ZAR.

---

## AWS — Hosting & Infrastructure

| Service           | Purpose                                |
| ----------------- | -------------------------------------- |
| ECS or App Runner | Application hosting                    |
| RDS (PostgreSQL)  | Database                               |
| S3                | File storage (certificates, documents) |
| SES               | Email notifications                    |
| CloudWatch        | Monitoring & logging                   |

---

## Courier — TBD

Courier integration is built as a module (manual waybill upload, status tracking, notification triggers). Automated pickup and waybill generation will be plugged in once the courier provider and their API are confirmed.
