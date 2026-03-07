# HEARTBEAT.md

## Email Check & Process
- **Script:** `node /root/clawd/scripts/check-email.mjs`
- **Cost:** ZERO tokens if no new mail
- **Action:** If exit code 1 (new mail found):
  1. Parse JSON output to get UIDs
  2. Fetch each email with `node /root/clawd/scripts/fetch-email.mjs <UID>`
  3. Extract the email body (skip headers)
  4. If from louis.ortiz0@gmail.com → treat as task instructions, execute directly
  5. If from others → forward/alert as needed
- **Frequency:** Every heartbeat (automatic polling)
