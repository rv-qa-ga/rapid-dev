const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const reportPath = path.join(process.cwd(), 'reports', 'html', 'index.html');

if (!fs.existsSync(reportPath)) {
  console.error('Report not found. Generate report first: npm run report:html');
  process.exit(1);
}

const platform = process.platform;
let command;

if (platform === 'win32') {
  command = `start "" "${reportPath}"`;
} else if (platform === 'darwin') {
  command = `open "${reportPath}"`;
} else {
  command = `xdg-open "${reportPath}"`;
}

exec(command, (error) => {
  if (error) {
    console.error(`Failed to open report: ${error.message}`);
    process.exit(1);
  }
  console.log('✅ Report opened in browser');
});

