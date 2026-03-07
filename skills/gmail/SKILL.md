---
name: gmail
description: Send emails from cloverbot89@gmail.com using Gmail SMTP. Zero dependencies — uses only Node.js built-in modules. Requires GMAIL_APP_PASSWORD env var.
---

# Gmail Email Sender

Send emails from cloverbot89@gmail.com via Gmail SMTP with App Password auth.

## Prerequisites

- `GMAIL_APP_PASSWORD` env var must be set (16-char Google App Password)

## Usage

```bash
# Simple text email
node /root/clawd/skills/gmail/scripts/send-email.mjs \
  --to "recipient@example.com" \
  --subject "Subject line" \
  --body "Email body text"

# HTML email
node /root/clawd/skills/gmail/scripts/send-email.mjs \
  --to "recipient@example.com" \
  --subject "Subject" \
  --body "<h1>Hello</h1><p>HTML content</p>" \
  --html

# Email from file
node /root/clawd/skills/gmail/scripts/send-email.mjs \
  --to "recipient@example.com" \
  --subject "Subject" \
  --file /path/to/body.txt

# With CC
node /root/clawd/skills/gmail/scripts/send-email.mjs \
  --to "recipient@example.com" \
  --cc "cc@example.com" \
  --subject "Subject" \
  --body "Message"

# Pipe body from stdin
echo "Message body" | node /root/clawd/skills/gmail/scripts/send-email.mjs \
  --to "recipient@example.com" \
  --subject "Subject"
```

## Options

| Flag | Description |
|------|-------------|
| `--to` | Recipient email (required) |
| `--subject` | Email subject (required) |
| `--body` | Email body text |
| `--file` | Read body from file |
| `--cc` | CC recipient |
| `--html` | Send as HTML email |
