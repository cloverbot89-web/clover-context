#!/usr/bin/env node

/**
 * Gmail IMAP checker — zero cost unless new mail found
 * Uses IMAP to poll for unseen emails
 * Only consumes tokens if new mail is discovered
 */

import { connect } from 'tls';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const IMAP_HOST = 'imap.gmail.com';
const IMAP_PORT = 993;
const EMAIL = 'cloverbot89@gmail.com';
const STATE_FILE = join(process.env.HOME || '/root', '.config', 'clawd-email-state.json');

// Load last known UID
function loadState() {
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { lastUID: 0 };
  }
}

// Save state
function saveState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// Connect and check mail
async function checkEmail() {
  return new Promise((resolve, reject) => {
    const state = loadState();
    let unseenUIDs = [];
    let allLines = [];
    let commandPhase = 'login';

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
      const lines = data.toString().split('\r\n');
      allLines = allLines.concat(lines);

      // After each phase, move to next command
      if (commandPhase === 'login' && allLines.some(l => l.includes('a1 OK'))) {
        commandPhase = 'select';
        sock.write('a2 SELECT INBOX\r\n');
      } else if (commandPhase === 'select' && allLines.some(l => l.includes('a2 OK'))) {
        commandPhase = 'search';
        sock.write('a3 SEARCH UNSEEN\r\n');
      } else if (commandPhase === 'search' && allLines.some(l => l.includes('a3 OK'))) {
        // Parse SEARCH response to get UIDs
        allLines.forEach(line => {
          if (line.startsWith('* SEARCH')) {
            unseenUIDs = line.replace('* SEARCH', '').trim().split(/\s+/).filter(Boolean);
          }
        });
        commandPhase = 'logout';
        sock.write('a4 LOGOUT\r\n');
      } else if (commandPhase === 'logout' && allLines.some(l => l.includes('a4 OK'))) {
        sock.end();
      }
    });

    sock.on('end', () => {
      // Filter to new emails only
      const newUIDs = unseenUIDs.filter(uid => parseInt(uid) > state.lastUID);

      if (newUIDs.length === 0) {
        // No new mail — silent exit
        resolve(null);
        return;
      }

      // New mail found — save state and return UIDs
      if (unseenUIDs.length > 0) {
        state.lastUID = Math.max(...unseenUIDs.map(Number));
        saveState(state);
      }

      resolve(newUIDs);
    });

    sock.on('error', reject);

    // Timeout safety
    setTimeout(() => {
      sock.end();
      reject(new Error('IMAP timeout'));
    }, 10000);
  });
}

// Main
async function main() {
  try {
    const newMail = await checkEmail();
    
    if (newMail && newMail.length > 0) {
      // Return exit code 1 + UID list to signal new mail
      console.log(JSON.stringify({ found: true, uids: newMail }));
      process.exit(1); // Non-zero signals "do something"
    } else {
      // Silent success — no new mail
      process.exit(0);
    }
  } catch (err) {
    console.error(`Email check error: ${err.message}`);
    process.exit(1);
  }
}

main();
