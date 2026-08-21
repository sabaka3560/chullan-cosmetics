# Razorpay webhook — setup

The endpoint is live at `/api/webhooks/razorpay`. It does nothing until Razorpay
is told to call it, so this is a required launch step, not an optional one.

## What it is for

The browser creates the Shiprocket order immediately after Razorpay's handler
fires. For almost every buyer that works.

It is the exception that costs money. A tab closed on the confirmation screen, a
phone that sleeps, a tunnel — and the payment has been taken with no order
behind it. Before this endpoint the buyer saw a payment reference and a request
to email us, which is a refund and an apology dressed up as a recovery.

Razorpay retries a failed webhook for hours, so the order also lands if the site
is down at the moment of capture.

## Steps

1. Razorpay Dashboard → **Settings → Webhooks → Add New Webhook**

2. **Webhook URL**

   ```
   https://<your-domain>/api/webhooks/razorpay
   ```

   Use the live domain. Do not point a live webhook at a preview deployment.

3. **Secret** — generate a strong random value. Anything long and random will do:

   ```
   openssl rand -hex 32
   ```

   Keep it; it goes into Vercel in step 5.

4. **Active events** — tick **`payment.captured`** only.

   Nothing else is handled. Other events return 200 and are ignored, so
   subscribing to them only adds noise.

5. **Vercel** → Settings → Environment Variables:

   | Name | Value | Environments |
   | --- | --- | --- |
   | `RAZORPAY_WEBHOOK_SECRET` | the secret from step 3 | Production |

   Then **redeploy** — environment changes do not reach existing deployments.

6. Place a real order and confirm. In Razorpay the webhook shows a 200 under
   **Webhooks → Logs**; in the Vercel function logs you will see one of:

   ```
   [webhook] already fulfilled CHU-XXXXXX      ← normal: the browser got there first
   [webhook] RESCUED ORDER CHU-XXXXXX ...      ← the browser did not finish
   ```

   A run of `RESCUED ORDER` lines is worth investigating — it means buyers'
   browsers are routinely failing to complete.

## How it decides whether to ship

Deliberately, the request body is **not** what authorises an order.

The signature is checked when the runtime gives us the raw bytes, but a
serverless platform may parse and re-serialise the body before we see it, and an
HMAC over re-serialised JSON is an HMAC over different bytes. Depending on that
would make the endpoint fragile in a way that fails silently.

So the request is treated as a nudge — *"look at this payment id"* — and the
decision is made against Razorpay directly, over an authenticated connection
using our own key secret:

1. Fetch the payment. It must exist on our account and be `captured`.
2. Fetch its order and read the notes, which carry the reference, the bag and
   the delivery address (see `api/_lib/pending.ts`).
3. Re-price the bag from the catalog. The notes carry SKUs and quantities; what
   they cost is not theirs to say.
4. Compare the captured amount against that price. A mismatch is logged and
   **nothing ships** — it means the goods are not the goods that were paid for,
   and that needs a person.
5. Create the Shiprocket order.

A forged webhook names a payment that does not exist, the lookup fails, and
nothing is created.

## Why it is safe to run twice

It usually does run twice. The normal case is that the browser already created
the order seconds earlier.

The reference is minted once — when the Razorpay order is created, before the
buyer sees a payment sheet — and stored in its notes. Both the browser and the
webhook read it from there, so both ask Shiprocket to create the same `order_id`.
Shiprocket enforces uniqueness on that field, so whichever arrives second is
refused, and the refusal is reported as success. The goods cannot ship twice.

## If the secret is not set

The endpoint still works and still refuses forged requests, because the
authenticated lookup is the real gate. It logs:

```
[webhook] RAZORPAY_WEBHOOK_SECRET is not set; relying on payment lookup
```

Set it anyway. It rejects junk before it costs two API calls.
