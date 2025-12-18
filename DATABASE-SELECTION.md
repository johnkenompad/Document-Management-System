# Database Selection Guide

## Overview

The server now allows you to choose which database to use at startup!

## How to Use

### Method 1: Interactive Selection (Recommended)

Start the server with the selection flag:
```powershell
node server/server.js --select
```
or
```powershell
npm run server -- --select
```

You'll see a menu like this:
```
============================================================
  DATABASE SELECTION
============================================================

Available Databases:

  [1] Local Database (database.db)
      Size: 0.02 MB | Last Modified: 2025-12-11, 6:14:33 p.m.

  [2] Shared: dms-sample-database.db
      Size: 0.02 MB | Last Modified: 2025-12-14, 7:47:43 p.m.

  [3] Create New Database

Select database [1-3] (default: 1):
```

Just type the number and press Enter!

### Method 2: Command Line Auto-Select

Use a specific database without prompting:
```powershell
node server/server.js --db=dms-sample-database
```

### Method 3: Auto-Resume Last Database

Just start normally:
```powershell
node server/server.js
```

It will automatically use the last database you selected. To change, use `--select` flag.

## Database Options

### 1. Local Database
- File: `server/database.db`
- Located in the server folder
- Good for testing or single-PC setup

### 2. Shared Databases
- Location: `server/shared-databases/` folder
- Can have multiple database files
- Shows file size and last modified date
- Great for different departments or projects

### 3. Create New Database
- Creates a fresh empty database
- You can choose:
  - Local (server folder)
  - Shared (shared-databases folder)
- Automatically creates tables

## Managing Databases

### Creating Shared Databases Folder

If it doesn't exist:
```powershell
mkdir server\shared-databases
```

### Adding New Databases

Option 1: Copy existing database
```powershell
copy server\database.db server\shared-databases\backup-dec14.db
```

Option 2: Use "Create New Database" option in the menu

### Naming Convention

Good names:
- `dms-production.db`
- `hr-documents.db`
- `accounting-2025.db`
- `backup-2025-12-14.db`

## Database Information Display

For each database, you'll see:
- **Name**: Database filename
- **Size**: File size in MB
- **Last Modified**: When it was last changed

This helps you pick the right one!

## Command Line Options Summary

| Command | Description |
|---------|-------------|
| `node server/server.js` | Use last selected database (auto-resume) |
| `node server/server.js --select` | Show database selection menu |
| `node server/server.js -s` | Same as --select (shorthand) |
| `node server/server.js --db=NAME` | Auto-select specific database |

## Examples

### Example 1: Daily Work
```powershell
# First time
node server/server.js --select
# Select database [1-3]: 2  (pick shared database)

# Next time (automatically uses #2)
node server/server.js
```

### Example 2: Switch Databases
```powershell
# Currently using production database, want to test with a copy
node server/server.js --select
# Select database [1-3]: 3  (create new)
# Enter name: testing
```

### Example 3: Script/Automation
```powershell
# Always use specific database (no prompts)
node server/server.js --db=dms-production
```

## Tips

1. **First Time**: Use `--select` to pick your main database
2. **Daily Use**: Just run `node server/server.js` (it remembers!)
3. **Switching**: Use `--select` anytime you want to change
4. **Backup**: Create new database, use for testing before going live
5. **Multiple Projects**: Keep different databases in shared-databases folder

## Where Selection is Saved

The last selected database is saved in:
```
server/last-database.txt
```

This file contains the full path to your last selected database.

## Troubleshooting

**Q: Database menu doesn't appear**
- Make sure you used `--select` flag
- Check that databases exist in the folders

**Q: Last database not found**
- File might have been moved or deleted
- Server will prompt you to select a new one

**Q: Want to reset selection**
- Delete `server/last-database.txt`
- Or use `--select` to choose again

## Integration with npm scripts

Update your `package.json` scripts:

```json
"scripts": {
  "start": "concurrently \"npm run server\" \"npm run client\"",
  "server": "node server/server.js",
  "server:select": "node server/server.js --select",
  "client": "react-scripts start"
}
```

Then use:
```powershell
npm run server:select   # Choose database
npm run server          # Use last selected
```
