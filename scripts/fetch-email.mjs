#!/usr/bin/env node

/**
 * Fetch full email by UID via IMAP
 * Usage: node fetch-email.mjs <UID>
 */

import { connect } from 'tls';

const IMAP_HOST = 'imap.gmail.com';
const IMAP_PORT = 993;
const EMAIL = 'cloverbot89@gmail.com';
const UID = process.argv[2];

if (!UID) {
  console.error('Usage: node fetch-email.mjs <UID>');
  process.exit(1);
}

async function fetchEmail() {
  return new Promise((resolve, reject) => {
    let commandPhase = 'login';
    let fullMessage = '';
    let allLines = [];

    const sock = connect(IMAP_PORT, IMAP_HOST, { rejectUnauthorized: false }, () => {
      const pass = process.env.GMAIL_APP_PASSWORD;
      if (!pass) {
        reject(new Error('GMAIL_APP_PASSWORD not set'));
        sock.end();
        return;
      }
      sock.write(`a1 LOGIN ${EMAIL} "${pass}"\r\n`);
    });

    sock.on('data', (data) => {
      const text = data.toString();
      allLines.push(text);
      fullMessage += text;

      if (commandPhase === 'login' && text.includes('a1 OK')) {
        commandPhase = 'select';
        sock.write('a2 SELECT INBOX\r\n');
      } else if (commandPhase === 'select' && text.includes('a2 OK')) {
        commandPhase = 'fetch';
        // Fetch message in RFC822 format (full raw message)
        sock.write(`a3 UID FETCH ${UID} (RFC822)\r\n`);
      } else if (commandPhase === 'fetch' && text.includes('a3 OK')) {
        commandPhase = 'logout';
        sock.write('a4 LOGOUT\r\n');
      } else if (commandPhase === 'logout' && text.includes('a4 OK')) {
        sock.end();
      }
    });

    sock.on('end', () => {
      // Parse the RFC822 message from the response
      // Look for lines between "RFC822" and the next command response
      const lines = fullMessage.split('\r\n');
      let inMessage = false;
      let messageLines = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('RFC822 {') || line.includes('RFC822 ')) {
          inMessage = true;
          continue;
        }
        if (inMessage && (line.startsWith('a3 ') || line.startsWith('* BYE'))) {
          break;
        }
        if (inMessage && line.trim()) {
          messageLines.push(line);
        }
      }

      const rawMessage = messageLines.join('\r\n');

      // Parse headers
      const headerEnd = rawMessage.indexOf('\r\n\r\n');
      const headerText = headerEnd > -1 ? rawMessage.substring(0, headerEnd) : rawMessage;
      const body = headerEnd > -1 ? rawMessage.substring(headerEnd + 4) : '';

      const headers = {};
      headerText.split('\r\n').forEach(line => {
        if (line.match(/^[A-Z]/)) {
          const [key, ...valueParts] = line.split(': ');
          headers[key.toLowerCase()] = valueParts.join(': ');
        }
      });

      resolve({
        uid: UID,
        from: headers.from || 'unknown',
        to: headers.to || '',
        subject: headers.subject || '(no subject)',
        date: headers.date || '',
        body: body.trim().substring(0, 500) // First 500 chars
      });
    });

    sock.on('error', reject);

    setTimeout(() => {
      sock.end();
      reject(new Error('IMAP timeout'));
    }, 10000);
  });
}

fetchEmail()
  .then(msg => console.log(JSON.stringify(msg, null, 2)))
  .catch(err => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  });
