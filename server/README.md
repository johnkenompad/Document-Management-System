# DMS Server

This is the backend server for the Document Management System.

## Quick Start

### First Time / Change Database
Double-click: **`start-server.bat`**
- Select which database to use
- Server will remember your choice

### Daily Use  
Double-click: **`start.bat`**
- Automatically uses last selected database
- Starts server immediately

## Manual Commands

```powershell
# Install dependencies (first time only)
npm install

# Start with database selection
npm run start:select

# Start with last database
npm start
```

## What This Server Does

- Manages SQLite database
- Handles document uploads/downloads
- User authentication
- REST API endpoints
- Serves files from uploads folder

## Network Access

When server starts, you'll see:
```
Server running on http://0.0.0.0:3001
Local access: http://localhost:3001
Network access: http://192.168.X.X:3001
```

Share the **Network access URL** with other PCs.

## Files in This Folder

- `server.js` - Main server code
- `package.json` - Dependencies
- `.env` - Configuration
- `database.db` - Local database
- `shared-databases/` - Shared database files
- `uploads/` - Document attachments
- `start.bat` - Quick start script
- `start-server.bat` - Start with database selection

## Port Configuration

Default: Port 3001

To change, edit `.env` file:
```
PORT=3001
HOST=0.0.0.0
```

## Database Selection

The server can work with multiple databases. See parent folder's `DATABASE-SELECTION.md` for details.

## Firewall

Make sure port 3001 is open for network access:
```powershell
New-NetFirewallRule -DisplayName "DMS Server" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
```
