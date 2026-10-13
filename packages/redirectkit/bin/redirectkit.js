#!/usr/bin/env node

import('../dist/cli.js').catch(err => {
  console.error('Failed to run redirectkit CLI:', err);
  process.exit(1);
});
