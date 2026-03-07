#!/usr/bin/env node
/**
 * Zero-dependency Gmail SMTP sender using only Node.js built-in modules.
 * Uses STARTTLS on port 587 with Gmail App Password authentication.
 *
 * Usage:
 *   node send-email.mjs --to "addr" --subject "subj" --body "text"
 *   node send-email.mjs --to "addr" --subject "subj" --file body.txt
 *   echo "body" | node send-email.mjs --to "addr" --subject "subj"
 *
 * Env: GMAIL_APP_PASSWORD (required)
 *      GMAIL_FROM (optional, defaults to cloverbot89@gmail.com)
 */

import { createConnection } from "net";
import { connect as tlsConnect } from "tls";
import { readFileSync } from "fs";

const FROM = process.env.GMAIL_FROM || "cloverbot89@gmail.com";
const PASSWORD = process.env.GMAIL_APP_PASSWORD;

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--to") opts.to = args[++i];
    else if (args[i] === "--subject") opts.subject = args[++i];
    else if (args[i] === "--body") opts.body = args[++i];
    else if (args[i] === "--file") opts.file = args[++i];
    else if (args[i] === "--cc") opts.cc = args[++i];
    else if (args[i] === "--html") opts.html = true;
  }
  return opts;
}

async function readStdin() {
  if (process.stdin.isTTY) return null;
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString();
}

function smtpCommand(socket, cmd) {
  return new Promise((resolve, reject) => {
    let buf = "";
    const onData = (data) => {
      buf += data.toString();
      // SMTP multi-line responses have '-' after code; final line has space
      const lines = buf.split("\r\n").filter(Boolean);
      const last = lines[lines.length - 1];
      if (last && last.length >= 4 && last[3] === " ") {
        socket.removeListener("data", onData);
        const code = parseInt(last.substring(0, 3), 10);
        if (code >= 400) reject(new Error(`SMTP ${code}: ${buf.trim()}`));
        else resolve(buf.trim());
      }
    };
    socket.on("data", onData);
    if (cmd !== null) socket.write(cmd + "\r\n");
  });
}

async function sendEmail({ to, subject, body, cc, html }) {
  if (!PASSWORD) {
    console.error("Error: GMAIL_APP_PASSWORD env var is not set");
    process.exit(1);
  }
  if (!to || !subject || !body) {
    console.error("Usage: node send-email.mjs --to <addr> --subject <subj> --body <text>");
    process.exit(1);
  }

  const date = new Date().toUTCString();
  const contentType = html ? "text/html; charset=UTF-8" : "text/plain; charset=UTF-8";
  let headers = `From: ${FROM}\r\nTo: ${to}\r\nSubject: ${subject}\r\nDate: ${date}\r\nMIME-Version: 1.0\r\nContent-Type: ${contentType}`;
  if (cc) headers += `\r\nCc: ${cc}`;

  const message = `${headers}\r\n\r\n${body}`;

  // Connect plaintext first, then upgrade to TLS (STARTTLS)
  const sock = createConnection({ host: "smtp.gmail.com", port: 587 });
  await new Promise((res, rej) => { sock.on("connect", res); sock.on("error", rej); });

  // Read greeting
  await smtpCommand(sock, null);

  // EHLO
  await smtpCommand(sock, `EHLO clover`);

  // STARTTLS
  await smtpCommand(sock, "STARTTLS");

  // Upgrade to TLS
  const tlsSock = tlsConnect({ socket: sock, host: "smtp.gmail.com", servername: "smtp.gmail.com" });
  await new Promise((res, rej) => { tlsSock.on("secureConnect", res); tlsSock.on("error", rej); });

  // EHLO again over TLS
  await smtpCommand(tlsSock, "EHLO clover");

  // AUTH LOGIN
  await smtpCommand(tlsSock, "AUTH LOGIN");
  await smtpCommand(tlsSock, Buffer.from(FROM).toString("base64"));
  await smtpCommand(tlsSock, Buffer.from(PASSWORD).toString("base64"));

  // Envelope
  await smtpCommand(tlsSock, `MAIL FROM:<${FROM}>`);
  await smtpCommand(tlsSock, `RCPT TO:<${to}>`);
  if (cc) await smtpCommand(tlsSock, `RCPT TO:<${cc}>`);

  // DATA
  await smtpCommand(tlsSock, "DATA");

  // Send message body — escape leading dots per RFC 5321
  const escaped = message.replace(/\r\n\./g, "\r\n..");
  await smtpCommand(tlsSock, `${escaped}\r\n.`);

  // QUIT
  tlsSock.write("QUIT\r\n");
  tlsSock.end();

  console.log(`Email sent to ${to}${cc ? ` (cc: ${cc})` : ""}`);
}

const opts = parseArgs();
if (opts.file) {
  opts.body = readFileSync(opts.file, "utf8");
} else if (!opts.body) {
  const stdin = await readStdin();
  if (stdin) opts.body = stdin;
}
await sendEmail(opts);
