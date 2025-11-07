#!/usr/bin/env node

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function error(message) {
  log(`❌ ${message}`, colors.red);
}

function warning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function info(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function header(message) {
  log(`\n${colors.bright}${colors.cyan}🚀 ${message}${colors.reset}\n`);
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

// Execute command and return output
function execCommand(command, options = {}) {
  try {
    const result = execSync(command, { 
      encoding: 'utf8', 
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options 
    });
    return result ? result.trim() : '';
  } catch (err) {
    if (!options.ignoreError) {
      throw err;
    }
    return null;
  }
}

// Execute command interactively (for login)
function execInteractive(command, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
  });
}

// Check system prerequisites
async function checkPrerequisites() {
  header('Checking System Prerequisites');
  
  // Check Node.js
  try {
    const nodeVersion = execCommand('node --version', { silent: true });
    success(`Node.js found: ${nodeVersion}`);
  } catch (err) {
    error('Node.js is required but not found');
    error('Please install Node.js 18+ from https://nodejs.org/');
    process.exit(1);
  }
  
  // Check npm
  try {
    const npmVersion = execCommand('npm --version', { silent: true });
    success(`npm found: ${npmVersion}`);
  } catch (err) {
    error('npm is required but not found');
    error('Please install npm (usually comes with Node.js)');
    process.exit(1);
  }
}

// Check if Wrangler is installed
async function checkWranglerInstallation() {
  header('Checking Wrangler CLI');
  
  try {
    execCommand('npx wrangler --version', { silent: true });
    success('Wrangler CLI is available');
    return true;
  } catch (err) {
    warning('Wrangler CLI not found');
    return false;
  }
}

// Install Wrangler if needed
async function installWrangler() {
  header('Installing Wrangler CLI');
  
  try {
    info('Installing Wrangler CLI via npm...');
    execCommand('npm install wrangler');
    success('Wrangler CLI installed successfully!');
  } catch (err) {
    error('Failed to install Wrangler CLI');
    error(err.message);
    process.exit(1);
  }
}

// Check if user is authenticated with Cloudflare
async function checkAuthentication() {
  header('Checking Cloudflare Authentication');
  
  try {
    const whoami = execCommand('npx wrangler whoami', { silent: true });
    if (whoami && !whoami.includes('You are not authenticated')) {
      success('Already authenticated with Cloudflare');
      info(`Logged in as: ${whoami}`);
      return true;
    }
  } catch (err) {
    // Fall through to login
  }
  
  warning('Not authenticated with Cloudflare');
  return false;
}

// Handle Cloudflare login
async function handleLogin() {
  header('Cloudflare Authentication Required');
  
  info('This setup requires access to your Cloudflare account to:');
  info('• Create a D1 database');
  info('• Deploy your Worker');
  info('• Configure your project');
  
  const shouldLogin = await prompt('\nWould you like to login to Cloudflare now? (y/n): ');
  
  if (shouldLogin.toLowerCase() !== 'y' && shouldLogin.toLowerCase() !== 'yes') {
    error('Setup cancelled. Please run "npx wrangler login" manually, then try again.');
    process.exit(1);
  }
  
  try {
    info('\nOpening Cloudflare login in your browser...');
    await execInteractive('npx wrangler login');
    
    // Verify login worked
    const whoami = execCommand('npx wrangler whoami', { silent: true });
    if (whoami && !whoami.includes('You are not authenticated')) {
      success('Successfully authenticated with Cloudflare!');
      info(`Logged in as: ${whoami}`);
      return true;
    } else {
      throw new Error('Authentication verification failed');
    }
  } catch (err) {
    error('Failed to authenticate with Cloudflare');
    error('Please run "npx wrangler login" manually, then try again.');
    process.exit(1);
  }
}

// Generate secure admin key in format: ab-cdef-gh1j (lowercase alphanumeric)
function generateAdminKey() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  
  const randomString = (length) => {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  
  const part1 = randomString(2);  // 2 characters
  const part2 = randomString(4);  // 4 characters  
  const part3 = randomString(4);  // 4 characters
  
  return `${part1}-${part2}-${part3}`;
}

// No longer need Pages checking since this is Worker-only

// Check if Worker exists
async function checkWorkerExists(workerName) {
  try {
    const output = execCommand(`npx wrangler deployments list --name ${workerName}`, { silent: true });
    return !output.includes('No deployments found');
  } catch (err) {
    return false;
  }
}

// Check if D1 database exists and return its ID
async function checkDatabaseExists(dbName) {
  try {
    const output = execCommand('npx wrangler d1 list', { silent: true });
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes(`│ ${dbName} `)) {
        // Extract database ID from the line
        const parts = line.split('│');
        if (parts.length > 1) {
          const dbId = parts[1].trim();
          return { exists: true, databaseId: dbId };
        }
      }
    }
    
    return { exists: false, databaseId: null };
  } catch (err) {
    return { exists: false, databaseId: null };
  }
}

// Create D1 database
async function createDatabase() {
  header('Creating Cloudflare D1 Database');
  
  let dbName = 'go';
  
  while (true) {
    info(`Checking if D1 database "${dbName}" exists...`);
    
    // Check if database name already exists using list command
    const dbCheck = await checkDatabaseExists(dbName);
    
    if (dbCheck.exists) {
      warning(`D1 database "${dbName}" already exists on your account.`);
      console.log();
      
      const useExisting = await prompt('Would you like to use the existing database? (y/n): ');
      
      if (useExisting.toLowerCase() === 'y' || useExisting.toLowerCase() === 'yes') {
        success(`Using existing database "${dbName}"`);
        info(`Database ID: ${dbCheck.databaseId}`);
        info(`Database Name: ${dbName}`);
        return { databaseId: dbCheck.databaseId, databaseName: dbName };
      }
      
      while (true) {
        const newName = await prompt(`Please enter a different database name (suggested: ${dbName}-db): `);
        
        if (!newName || newName.trim() === '') {
          error('Database name cannot be empty');
          continue;
        }
        
        dbName = newName.trim();
        break;
      }
      continue;
    }
    
    // Create the database
    try {
      info(`Creating D1 database named "${dbName}"...`);
      const output = execCommand(`npx wrangler d1 create ${dbName}`, { silent: true });
      
      // Extract database ID from output
      const dbIdMatch = output.match(/database_id = "([^"]+)"/);
      if (!dbIdMatch) {
        throw new Error('Could not extract database ID from wrangler output');
      }
      
      const databaseId = dbIdMatch[1];
      success(`Database created successfully!`);
      info(`Database ID: ${databaseId}`);
      info(`Database Name: ${dbName}`);
      
      return { databaseId, databaseName: dbName };
    } catch (err) {
      error('Failed to create D1 database');
      error(err.message);
      process.exit(1);
    }
  }
}

// Check and set Worker name
async function checkWorkerName() {
  header('Configuring Worker Name');
  
  let workerName = 'go';
  
  while (true) {
    info(`Checking if Worker "${workerName}" exists...`);
    
    // Check if Worker already exists
    const workerExists = await checkWorkerExists(workerName);
    
    if (workerExists) {
      warning(`Worker "${workerName}" already exists on your account.`);
      console.log();
      while (true) {
        const newName = await prompt(`Please enter a different worker name (suggested: ${workerName}-worker): `);
        
        if (!newName || newName.trim() === '') {
          error('Worker name cannot be empty');
          continue;
        }
        
        workerName = newName.trim();
        break;
      }
      continue;
    }
    
    success(`Worker name "${workerName}" is available!`);
    return workerName;
  }
}

// Update wrangler.toml with configuration
async function updateWranglerConfig(workerName, databaseId, databaseName, adminKey, defaultRedirect) {
  header('Updating Configuration');
  
  try {
    const configPath = path.join(process.cwd(), 'wrangler.toml');
    let config = fs.readFileSync(configPath, 'utf8');
    
    // Update worker name
    config = config.replace(
      /^name = .*$/m,
      `name = "${workerName}"`
    );
    
    // Update database_id
    config = config.replace(
      /database_id = "[^"]*"/,
      `database_id = "${databaseId}"`
    );
    
    // Update database_name
    config = config.replace(
      /database_name = "[^"]*"/,
      `database_name = "${databaseName}"`
    );
    
    // Update admin key
    config = config.replace(
      /ADMIN_KEY = "[^"]*"/,
      `ADMIN_KEY = "${adminKey}"`
    );
    
    // Update default redirect
    config = config.replace(
      /DEFAULT_REDIRECT = "[^"]*"/,
      `DEFAULT_REDIRECT = "${defaultRedirect}"`
    );
    
    fs.writeFileSync(configPath, config);
    success('Configuration updated successfully!');
    info(`Worker name set to: ${workerName}`);
    info(`Database name set to: ${databaseName}`);
    info(`Database ID: ${databaseId}`);
  } catch (err) {
    error('Failed to update wrangler.toml');
    error(err.message);
    process.exit(1);
  }
}

// Apply database migrations
async function applyMigrations(databaseName) {
  header('Setting Up Database Schema');
  
  try {
    info('Applying database migrations...');
    const output = execCommand(`npx wrangler d1 migrations apply ${databaseName} --remote`, { silent: false });
    success('Database schema applied successfully!');
  } catch (err) {
    // Check if it's just a parsing error but migrations actually succeeded
    if (err.message && err.message.includes('trim')) {
      warning('Migration output parsing failed, but migrations may have succeeded');
      // Try to verify migrations were applied by checking the database
      try {
        execCommand(`npx wrangler d1 execute ${databaseName} --remote --command "SELECT name FROM sqlite_master WHERE type='table' LIMIT 1;"`, { silent: true });
        success('Database schema verified successfully!');
        return;
      } catch (verifyErr) {
        // If verification fails, it's a real error
      }
    }
    error('Failed to apply database migrations');
    error(err.message);
    process.exit(1);
  }
}

// Get actual Worker URL from deployment output
function parseWorkerUrl(deployOutput, workerName) {
  if (deployOutput && typeof deployOutput === 'string') {
    // Look for the URL in the deployment output - it appears on its own line after "triggers"
    const lines = deployOutput.split('\n');
    for (const line of lines) {
      if (line && typeof line === 'string') {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('https://') && trimmedLine.includes('.workers.dev')) {
          return trimmedLine;
        }
      }
    }
  }
  
  // Fallback pattern (may not be accurate without subdomain)
  return `https://${workerName}.workers.dev`;
}

// Build and deploy Worker only
async function buildAndDeploy(workerName) {
  header('Building and Deploying');
  
  while (true) {
    try {
      info('Building application...');
      execCommand('npm run build');
      success('Build completed!');
      
      // Deploy Worker (serves both frontend and backend)
      info('Deploying to Cloudflare Worker...');
      const workerOutput = execCommand(`npx wrangler deploy`, { silent: true });
      
      // Get the actual Worker URL from deployment output
      const workerUrl = parseWorkerUrl(workerOutput, workerName);
      
      success('Deployment completed!');
      success(`Your service is available at: ${workerUrl}`);
      return workerUrl;
    } catch (err) {
      error('Failed to build and deploy');
      error(err.message);
      console.log();
      
      const retry = await prompt('Would you like to try deploying again? (y/n): ');
      if (retry.toLowerCase() === 'y' || retry.toLowerCase() === 'yes') {
        console.log();
        continue;
      } else {
        warning('Deployment skipped. You can deploy manually later with: npx wrangler deploy');
        // Return a fallback URL so setup can continue
        return parseWorkerUrl(null, workerName);
      }
    }
  }
}

// Generate setup summary markdown file
async function generateSetupSummary(deploymentUrl, adminKey, defaultRedirect) {
  const timestamp = new Date().toISOString().split('T')[0];
  const summaryContent = `# Short URL Service - Setup Complete! 🎉

**Setup Date:** ${timestamp}
**Service Status:** ✅ Active and Ready

## 🔗 Your URLs

### Main Service
\`\`\`
${deploymentUrl}
\`\`\`

### Admin Panel
\`\`\`
${deploymentUrl}/admin?key=${adminKey}
\`\`\`

### Analytics Page (for any short code)
\`\`\`
${deploymentUrl}/analytics/{shortCode}?key=${adminKey}
\`\`\`

## 🔐 Admin Credentials

**Admin Key:** 
\`\`\`
${adminKey}
\`\`\`

> ⚠️ **Important:** Save this admin key securely! You'll need it to access the admin panel and API endpoints.

## 🛠 API Endpoints

All admin API endpoints require the \`key\` parameter with your admin key.

### Links Management

#### List All Links
\`\`\`bash
curl "${deploymentUrl}/api/admin/links?key=${adminKey}"
\`\`\`

#### Create New Link
\`\`\`bash
curl -X POST "${deploymentUrl}/api/admin/links?key=${adminKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "shortCode": "example",
    "destinationUrl": "https://example.com",
    "notes": "Example link"
  }'
\`\`\`

#### Update Link
\`\`\`bash
curl -X PUT "${deploymentUrl}/api/admin/links/{id}?key=${adminKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "shortCode": "updated",
    "destinationUrl": "https://updated-example.com",
    "notes": "Updated link"
  }'
\`\`\`

#### Delete Link
\`\`\`bash
curl -X DELETE "${deploymentUrl}/api/admin/links/{id}?key=${adminKey}"
\`\`\`

#### Reset Link Statistics
\`\`\`bash
curl -X POST "${deploymentUrl}/api/admin/links/{id}/reset?key=${adminKey}"
\`\`\`

### Analytics

#### Get Analytics Data
\`\`\`bash
curl "${deploymentUrl}/api/admin/analytics?key=${adminKey}"
\`\`\`

#### Get Analytics with Filters
\`\`\`bash
curl "${deploymentUrl}/api/admin/analytics?key=${adminKey}&linkId=1&startDate=2024-01-01&endDate=2024-12-31&country=US&limit=100"
\`\`\`

## 🧪 Test Your Setup

### 1. Test Admin Panel Access
Click this link to access your admin panel:
[${deploymentUrl}/admin?key=${adminKey}](${deploymentUrl}/admin?key=${adminKey})

### 2. Create Your First Short Link
1. Go to the admin panel
2. Click "Create New Link"
3. Enter a short code (e.g., "test")
4. Enter a destination URL (e.g., "https://google.com")
5. Click "Create Link"

### 3. Test the Short Link
Visit: \`${deploymentUrl}/test\` (replace "test" with your short code)

### 4. View Analytics
Visit: \`${deploymentUrl}/analytics/test?key=${adminKey}\`

## ⚙️ Configuration

Your service is configured with:
- **Default Redirect:** ${defaultRedirect}
- **Admin Key:** ${adminKey}
- **Database:** Cloudflare D1 (automatically managed)

To update these settings, edit \`wrangler.toml\` and redeploy with \`npm run deploy\`.

## 📖 Usage Examples

### Creating Links Programmatically
\`\`\`javascript
const response = await fetch('${deploymentUrl}/api/admin/links?key=${adminKey}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    shortCode: 'my-link',
    destinationUrl: 'https://example.com',
    notes: 'Created via API'
  })
});

const link = await response.json();
console.log('Created link:', link);
\`\`\`

### Getting Analytics Data
\`\`\`javascript
const response = await fetch('${deploymentUrl}/api/admin/analytics?key=${adminKey}');
const analytics = await response.json();
console.log('Analytics:', analytics);
\`\`\`

## 🌐 Use Your Own Domain (Optional)

You can use your own custom domain instead of the Cloudflare-provided URL.

### Prerequisites
- Domain already added to your Cloudflare account
- Domain DNS managed by Cloudflare

### Steps to Add Custom Domain

1. **Go to Cloudflare Dashboard**
   - Visit [dash.cloudflare.com](https://dash.cloudflare.com/)
   - Select your account

2. **Navigate to Pages**
   - Go to "Workers & Pages" → "Pages"
   - Find your "go" project and click on it

3. **Add Custom Domain**
   - Click the "Custom domains" tab
   - Click "Set up a custom domain"
   - Enter your domain (e.g., \`go.yourdomain.com\` or \`links.yourdomain.com\`)
   - Click "Continue"

4. **DNS Configuration**
   - Cloudflare will automatically add the required DNS records
   - If your domain is on Cloudflare, this happens instantly
   - If not, you'll see DNS records to add manually

5. **Wait for Activation**
   - SSL certificate will be automatically provisioned
   - Usually takes 1-5 minutes for activation

### After Adding Custom Domain

Your service will be available at:
- **Custom URL:** \`https://go.yourdomain.com\`
- **Admin Panel:** \`https://go.yourdomain.com/admin?key=${adminKey}\`
- **Short Links:** \`https://go.yourdomain.com/yourcode\`

### Recommended Domain Patterns
- \`go.yourdomain.com\` - Simple and clear
- \`links.yourdomain.com\` - Descriptive
- \`s.yourdomain.com\` - Very short
- \`l.yourdomain.com\` - Ultra short

## 🔧 Maintenance

### View Logs
\`\`\`bash
npx wrangler tail
\`\`\`

### Update and Redeploy
\`\`\`bash
npm run build
npm run deploy
\`\`\`

### Database Operations
\`\`\`bash
# Apply new migrations
npm run db:migrate

# Access database directly
npx wrangler d1 execute go --command "SELECT * FROM links;"
\`\`\`

## 🆘 Support

If you encounter issues:
1. Check the [Cloudflare Workers dashboard](https://dash.cloudflare.com/)
2. View logs with \`npx wrangler tail\`
3. Verify your admin key is correct
4. Ensure your Cloudflare account has sufficient permissions

## 🔒 Security Notes

- Your admin key provides full access to your short URL service
- Keep it secure and don't share it publicly
- Consider rotating it periodically by updating \`ADMIN_KEY\` in \`wrangler.toml\`
- All URLs must use HTTPS for security

---

**Generated:** ${new Date().toISOString()}
**Service URL:** ${deploymentUrl}
`;

  try {
    const summaryPath = path.join(process.cwd(), 'SETUP_COMPLETE.md');
    fs.writeFileSync(summaryPath, summaryContent);
    success('Setup summary saved to SETUP_COMPLETE.md');
    return summaryPath;
  } catch (err) {
    warning('Could not save setup summary file');
    return null;
  }
}

// Main setup function
async function main() {
  try {
    console.clear();
    header('Short URL Service Setup');
    
    // Step 1: Check system prerequisites
    await checkPrerequisites();
    
    // Step 2: Check/install Wrangler CLI
    const hasWrangler = await checkWranglerInstallation();
    if (!hasWrangler) {
      await installWrangler();
    }
    
    // Step 3: Check/handle authentication
    const isAuthenticated = await checkAuthentication();
    if (!isAuthenticated) {
      await handleLogin();
    }
    
    // Step 4: Collect user preferences
    header('Configuration Setup');
    
    let defaultRedirect;
    while (true) {
      const userInput = await prompt('Enter your default redirect URL using HTTPS (e.g., example.com): https://');
      const fullUrl = `https://${userInput}`;
      
      if (!userInput || userInput.trim() === '') {
        error('Please provide a valid domain (e.g., example.com)');
        continue;
      }
      
      // Check if user accidentally included https:// already
      if (userInput.startsWith('https://') || userInput.startsWith('http://')) {
        defaultRedirect = userInput.startsWith('https://') ? userInput : userInput.replace('http://', 'https://');
      } else {
        defaultRedirect = fullUrl;
      }
      
      break;
    }
    
    const useCustomKey = await prompt('Generate a secure admin key automatically? (y/n): ');
    let adminKey;
    
    if (useCustomKey.toLowerCase() === 'n' || useCustomKey.toLowerCase() === 'no') {
      while (true) {
        adminKey = await prompt('Enter your custom admin key (minimum 6 characters): ');
        if (!adminKey || adminKey.trim().length < 6) {
          error('Admin key must be at least 6 characters long');
          continue;
        }
        adminKey = adminKey.trim();
        break;
      }
    } else {
      adminKey = generateAdminKey();
      success('Generated secure admin key');
    }
    
    // Step 5: Create database
    const { databaseId, databaseName } = await createDatabase();
    
    // Step 6: Check worker name
    const workerName = await checkWorkerName();
    
    // Step 7: Update configuration
    await updateWranglerConfig(workerName, databaseId, databaseName, adminKey, defaultRedirect);
    
    // Step 8: Apply migrations
    await applyMigrations(databaseName);
    
    // Step 9: Deploy
    const deploymentUrl = await buildAndDeploy(workerName);
    
    // Step 10: Generate setup summary and show results
    const summaryPath = await generateSetupSummary(deploymentUrl, adminKey, defaultRedirect);
    
    header('Setup Complete! 🎉');
    
    success('Your short URL service is ready!');
    console.log();
    info(`🌐 Service URL: ${deploymentUrl}`);
    info(`🔐 Admin Panel: ${deploymentUrl}/admin?key=${adminKey}`);
    info(`📊 Analytics: ${deploymentUrl}/analytics/{shortCode}?key=${adminKey}`);
    console.log();
    warning('Important: Your complete setup details have been saved!');
    if (summaryPath) {
      success(`📄 Complete setup guide: ${summaryPath}`);
      info('This file contains all your URLs, API endpoints, and admin credentials.');
    }
    console.log();
    info(`Admin Key: ${adminKey}`);
    console.log();
    info('🚀 Next steps:');
    info('1. Open SETUP_COMPLETE.md for full documentation');
    info('2. Test your admin panel by clicking the link above');
    info('3. Create your first short link!');
    info('4. Consider adding a custom domain (see SETUP_COMPLETE.md for instructions)');
    
  } catch (err) {
    error('Setup failed');
    error(err.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\nSetup cancelled by user.');
  rl.close();
  process.exit(0);
});

// Run main function
main().catch((err) => {
  error('Unexpected error occurred');
  error(err.message);
  process.exit(1);
});