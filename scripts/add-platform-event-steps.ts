/**
 * Script to add Platform Event verification steps to ST-191, ST-241, and ST-242 feature files
 * 
 * Pattern:
 * 1. Before action: "And I subscribe to {EventType} Platform Events"
 * 2. After action (before MuleSoft wait): "Then a {EventType} Platform Event is published"
 * 3. At end: "Given I unsubscribe from {EventType} Platform Events"
 */

import * as fs from 'fs';
import * as path from 'path';

const eventTypes = {
  'ST-191': 'Account',
  'ST-241': 'Account Team Member',
  'ST-242': 'Contact'
};

function addPlatformEventSteps(content: string, eventType: string): string {
  const subscribeStep = `And I subscribe to ${eventType} Platform Events`;
  const verifyStep = `Then a ${eventType} Platform Event is published`;
  const unsubscribeStep = `Given I unsubscribe from ${eventType} Platform Events`;

  // Patterns to match scenarios that need Platform Event verification
  // These are scenarios that trigger integration (create/update/delete)
  
  // Pattern 1: Scenarios with "When I update the Account Status" or "When I update the Account"
  // Add subscribe before the When, verify after the When, unsubscribe at end
  content = content.replace(
    /(Given[^\n]+\n(?:And[^\n]+\n)*)(When I update the Account Status to[^\n]+\n)(Then the Dynamics RDM|And I wait)/g,
    `$1${subscribeStep}\n    $2${verifyStep}\n    $3`
  );

  content = content.replace(
    /(Given[^\n]+\n(?:And[^\n]+\n)*)(When I update the Account in Salesforce[^\n]+\n(?:[^\n]+\n)*)(Then the Dynamics RDM|And I wait)/g,
    `$1${subscribeStep}\n    $2${verifyStep}\n    $3`
  );

  // Pattern 2: Scenarios ending with field mapping verification - add unsubscribe at end
  content = content.replace(
    /(And all mapped fields should match[^\n]+\n)(\s*# Note:)/g,
    `$1    ${unsubscribeStep}\n$2`
  );

  // Pattern 3: Scenarios ending with Party verification - add unsubscribe
  content = content.replace(
    /(And the Party should exist in Dynamics[^\n]+\n)(\s*# Note:)/g,
    `$1    ${unsubscribeStep}\n$2`
  );

  return content;
}

// Main execution
const files = [
  { path: 'src/features/ui/ST/ST-191.feature', eventType: 'Account' },
  { path: 'src/features/api/ST/ST-191.feature', eventType: 'Account' },
  { path: 'src/features/ui/SF/SF-736.feature', eventType: 'Account' },
  { path: 'src/features/api/SF/SF-736.feature', eventType: 'Account' },
  { path: 'src/features/api/SF/mrd-sf736-member-tpa.feature', eventType: 'Account' },
  { path: 'src/features/ui/ST/ST-241.feature', eventType: 'Account Team Member' },
  { path: 'src/features/api/ST/ST-241.feature', eventType: 'Account Team Member' },
  { path: 'src/features/ui/ST/ST-242.feature', eventType: 'Contact' },
  { path: 'src/features/api/ST/ST-242.feature', eventType: 'Contact' }
];

console.log('Adding Platform Event verification steps...');

for (const file of files) {
  const filePath = path.join(process.cwd(), file.path);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    
    content = addPlatformEventSteps(content, file.eventType);
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`✅ Updated: ${file.path}`);
    } else {
      console.log(`ℹ️  No changes needed: ${file.path}`);
    }
  } else {
    console.log(`⚠️  File not found: ${file.path}`);
  }
}

console.log('Done!');
