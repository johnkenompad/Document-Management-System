# DMS Single-Server Deployment Guide

## Architecture Overview

This Document Management System uses a **centralized server architecture**:
- **ONE PC** runs the Node.js server and hosts the SQLite database
- **All other PCs** access the system through their web browsers
- Database file stays on the server PC only (no network file sharing issues!)

## Quick Start

### On the SERVER PC (Main Computer)

1. **Install Dependencies** (first time only):
   ```powershell
   npm install
   ```

2. **Start the Server**:
   ```powershell
   npm run server
   ```

3. **Note the Network IP Address**:
   - When the server starts, it will display something like:
     ```
     Server running on http://0.0.0.0:3001
     Local access: http://localhost:3001
     Network access: http://192.168.1.100:3001
     Share this URL with other PCs on your network
     ```
   - **Write down the Network access IP** (e.g., `192.168.1.100`)

4. **Open the Application**:
   - On the server PC, open your browser and go to:
     ```
     http://localhost:3000
     ```
   - Or run the full app (server + client):
     ```powershell
     npm start
     ```

### On CLIENT PCs (Other Computers)

1. **No Installation Needed!** Just use a web browser.

2. **Access the Application**:
   - Open your web browser (Chrome, Edge, Firefox)
   - Enter the server's network address with port 3000:
     ```
     http://192.168.1.100:3000
     ```
   - Replace `192.168.1.100` with YOUR server's actual IP address

3. **Login** with your credentials

## Building for Production (Recommended)

For better performance and simpler deployment:

### On the SERVER PC:

1. **Build the React app** (one time):
   ```powershell
   npm run build
   ```

2. **Serve the built app**:
   - Install a static file server:
     ```powershell
     npm install -g serve
     ```
   
   - Create a start script or run both:
     ```powershell
     # Terminal 1: Start backend server
     npm run server
     
     # Terminal 2: Serve built frontend
     serve -s build -l 3000
     ```

3. **Client PCs** access the same way: `http://SERVER_IP:3000`

## Network Configuration

### Firewall Settings

You need to allow incoming connections on ports **3000** and **3001** on the server PC:

**Windows Firewall:**
1. Open Windows Defender Firewall
2. Click "Advanced settings"
3. Click "Inbound Rules" → "New Rule"
4. Select "Port" → Next
5. Select "TCP" and enter `3000, 3001` → Next
6. Select "Allow the connection" → Next
7. Check all profiles → Next
8. Name it "DMS Server" → Finish

**Or run this PowerShell command as Administrator:**
```powershell
New-NetFirewallRule -DisplayName "DMS Server" -Direction Inbound -Protocol TCP -LocalPort 3000,3001 -Action Allow
```

### Find Your Server's IP Address

**On Windows:**
```powershell
ipconfig
```
Look for "IPv4 Address" under your active network adapter (usually something like 192.168.x.x)

**On the Server PC's Network:**
- All client PCs must be on the **same local network** as the server

## Deployment Checklist

- [ ] Server PC has Node.js installed
- [ ] All dependencies installed (`npm install`)
- [ ] Firewall ports 3000 and 3001 are open
- [ ] Server PC's IP address is noted
- [ ] Server is started (`npm run server` or `npm start`)
- [ ] Server PC stays powered on during work hours
- [ ] Client PCs can access `http://SERVER_IP:3000`

## Troubleshooting

### Client PCs can't connect:
- ✅ Check firewall settings on server PC
- ✅ Verify server is running
- ✅ Confirm both PCs are on same network
- ✅ Ping the server IP from client PC: `ping SERVER_IP`
- ✅ Try accessing from server PC first: `http://localhost:3000`

### Database errors:
- ✅ Make sure only the server PC has the database file
- ✅ Don't put the database on a network share
- ✅ Database file should be in the server folder on server PC only

### Performance issues:
- ✅ Use production build instead of dev mode
- ✅ Ensure good network connection
- ✅ Consider upgrading server PC if handling many users

## Advanced Configuration

### Change Server Port

Edit `.env` file:
```
PORT=3001
HOST=0.0.0.0
```

### Persistent Service (Keep Server Running)

Consider using:
- **PM2** (recommended): `npm install -g pm2` then `pm2 start server/server.js`
- **Windows Service**: Use `node-windows` package
- **Task Scheduler**: Create a scheduled task to run on startup

### Production Deployment Script

Create `start-production.bat`:
```batch
@echo off
echo Starting DMS Production Server...
cd /d %~dp0
start "DMS Backend" /min cmd /k npm run server
timeout /t 5
start "DMS Frontend" /min cmd /k serve -s build -l 3000
echo.
echo DMS Server is running!
echo Access at http://localhost:3000
echo.
pause
```

## Benefits of This Architecture

✅ **No database corruption** - only one PC accesses the database file
✅ **No network file sharing** - database stays local to server
✅ **Better performance** - server handles all database operations
✅ **Easier maintenance** - updates only on server PC
✅ **Centralized data** - one backup location
✅ **User management** - centralized authentication

## Security Notes

- This setup is for **local network only** (LAN)
- NOT exposed to the internet
- For internet access, you'll need proper security (HTTPS, authentication, etc.)
- Consider using VPN for remote access if needed
