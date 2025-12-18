
# Document Management System (DMS)

A comprehensive web-based Document Management System built with React and Node.js for tracking, managing, and organizing organizational documents across departments.

## 📋 Overview

This system uses a **centralized server architecture**:
- **ONE PC** runs the Node.js backend server with SQLite database
- **All other PCs** access the system through their web browsers
- Real-time document tracking with file attachment support (up to 25MB)

## ✨ Features

### Core Functionality
- **Document Tracking**: Send, receive, and track documents across departments
- **User Authentication**: Secure login system with role-based access control
- **Real-time Notifications**: Get notified about document status changes
- **File Attachments**: Support for images, PDFs, and Word documents (up to 25MB)
- **Department Management**: Organize documents by department (EDP, Records, Cashier, Accounting, HR, Admin)
- **Document Types**: Memos, Letters, Reports, Invoices, Requests, and Other
- **Status Tracking**: Monitor document lifecycle (Waiting, Received, Not Sent, etc.)

### User Roles
- **Admin**: Full system access, user management, settings configuration
- **Staff**: Send/receive documents, view own department's documents
- **Department Head**: Send/receive documents, view own department's documents, user management

### Application Sections
- **Dashboard**: Overview of document statistics and recent activity
- **Send Document**: Create and send new documents with attachments
- **Inbox**: View received documents
- **Outgoing**: Track sent documents and their status
- **History**: Archive of all document transactions
- **Reports**: Generate document reports and analytics
- **User Management**: (Admin only) Create, edit, and manage users
- **Settings**: Configure departments and document types
- **Notifications**: Real-time alerts for document updates

## 🛠️ Technology Stack

### Frontend
- **React** 19.2.0 - UI library
- **React DOM** 19.2.0 - DOM rendering
- **Create React App** - Build tooling
- **CSS3** - Styling

### Backend
- **Node.js** - Runtime environment
- **Express** 5.1.0 - Web server framework
- **SQLite3** 5.1.7 - Database

- ## 📦 Installation

### Prerequisites
- **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Web Browser** (Chrome, Edge, Firefox)


### Setup Instructions

#### 1. Clone or Download the Repository
```bash
git clone <repository-url>
cd dms-app
```

#### 2. Install Frontend Dependencies
```bash
npm install
```

#### 3. Install Backend Dependencies
```bash
cd server
npm install
cd ..
```

#### 4. Database Initialization
The database will be created automatically on first run. You can also use the database selection feature (see Database Management section below).

## 🚀 Running the Application

### Option 1: Using Batch Files (Windows - Easiest)

#### For Server PC:
1. Navigate to `server` folder
2. **First time or to change database**: Double-click `start-and-server.bat`
   - Choose which database to use from the menu
3. **Daily use**: Double-click `start-server.bat`
   - Automatically uses last selected database

Then open your browser to `http://localhost:3000`

#### For Client PCs:
Just open browser and go to `http://[SERVER-IP]:3000`

### Option 2: Manual Command Line

#### Start Backend Server (Terminal 1)
```bash
cd server
npm start
```
Server runs on `http://localhost:3001`

**Note the network IP address** displayed when server starts:
```
Server running on http://0.0.0.0:3001
Local access: http://localhost:3001
Network access: http://192.168.1.100:3001
- **Node.js** - Runtime environment
- **Express** 5.1.0 - Web server framework
- **SQLite3** 5.1.7 - Database
