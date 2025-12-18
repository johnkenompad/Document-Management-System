const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to database
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

// Sample data for History (archived documents) with different dates
const sampleDocuments = [
  {
    title: "Monthly Sales Report - October",
    sender: "John Smith",
    recipient: "Finance Department",
    department: "Accounting",
    documentType: "Report",
    description: "October sales performance and analysis",
    status: "Received",
    dateSent: new Date(2024, 9, 15, 9, 30, 0).toISOString(), // October 15, 2024
    dateReceived: new Date(2024, 9, 16, 14, 15, 0).toISOString(), // October 16, 2024
    documentCategory: "archived",
    createdByUser: "admin",
    updatedBy: "finance_mgr"
  },
  {
    title: "IT Infrastructure Upgrade Proposal",
    sender: "Sarah Johnson",
    recipient: "Management Team",
    department: "EDP",
    documentType: "Proposal",
    description: "Proposal for upgrading company IT infrastructure",
    status: "Received",
    dateSent: new Date(2024, 8, 28, 11, 45, 0).toISOString(), // September 28, 2024
    dateReceived: new Date(2024, 9, 2, 16, 20, 0).toISOString(), // October 2, 2024
    documentCategory: "archived",
    createdByUser: "admin",
    updatedBy: "it_director"
  },
  {
    title: "Employee Handbook Update",
    sender: "HR Manager",
    recipient: "All Departments",
    department: "HR",
    documentType: "Memo",
    description: "Updated employee handbook with new policies",
    status: "Received",
    dateSent: new Date(2024, 10, 1, 8, 0, 0).toISOString(), // November 1, 2024
    dateReceived: new Date(2024, 10, 5, 15, 30, 0).toISOString(), // November 5, 2024
    documentCategory: "archived",
    createdByUser: "admin",
    updatedBy: "hr_specialist"
  },
  {
    title: "Budget Allocation Request - Q4",
    sender: "Department Head",
    recipient: "Finance Committee",
    department: "Admin",
    documentType: "Request",
    description: "Request for Q4 budget allocation",
    status: "Not Received",
    dateSent: new Date(2024, 9, 20, 10, 15, 0).toISOString(), // October 20, 2024
    dateReceived: new Date(2024, 9, 25, 13, 45, 0).toISOString(), // October 25, 2024
    documentCategory: "archived",
    createdByUser: "admin",
    updatedBy: "finance_mgr"
  },
  {
    title: "Vendor Contract Agreement",
    sender: "Procurement Officer",
    recipient: "Legal Department",
    department: "Admin",
    documentType: "Contract",
    description: "Contract agreement with new office supplies vendor",
    status: "Received",
    dateSent: new Date(2024, 8, 15, 14, 30, 0).toISOString(), // September 15, 2024
    dateReceived: new Date(2024, 8, 20, 11, 0, 0).toISOString(), // September 20, 2024
    documentCategory: "archived",
    createdByUser: "admin",
    updatedBy: "legal_counsel"
  },
  {
    title: "Training Program Schedule",
    sender: "Training Coordinator",
    recipient: "All Staff",
    department: "HR",
    documentType: "Memo",
    description: "Schedule for upcoming staff training programs",
    status: "Received",
    dateSent: new Date(2024, 10, 10, 9, 0, 0).toISOString(), // November 10, 2024
    dateReceived: new Date(2024, 10, 12, 16, 45, 0).toISOString(), // November 12, 2024
    documentCategory: "archived",
    createdByUser: "admin",
    updatedBy: "hr_specialist"
  },
  {
    title: "System Maintenance Notice",
    sender: "IT Support",
    recipient: "All Users",
    department: "EDP",
    documentType: "Memo",
    description: "Scheduled system maintenance notification",
    status: "Received",
    dateSent: new Date(2024, 9, 5, 15, 20, 0).toISOString(), // October 5, 2024
    dateReceived: new Date(2024, 9, 8, 9, 15, 0).toISOString(), // October 8, 2024
    documentCategory: "archived",
    createdByUser: "admin",
    updatedBy: "it_support"
  },
  {
    title: "Performance Review Guidelines",
    sender: "HR Director",
    recipient: "Management Team",
    department: "HR",
    documentType: "Guidelines",
    description: "Updated guidelines for employee performance reviews",
    status: "Not Received",
    dateSent: new Date(2024, 7, 30, 13, 0, 0).toISOString(), // August 30, 2024
    dateReceived: new Date(2024, 8, 5, 10, 30, 0).toISOString(), // September 5, 2024
    documentCategory: "archived",
    createdByUser: "admin",
    updatedBy: "hr_director"
  },
  {
    title: "Office Renovation Plans",
    sender: "Facilities Manager",
    recipient: "Executive Board",
    department: "Admin",
    documentType: "Plan",
    description: "Detailed plans for office renovation project",
    status: "Received",
    dateSent: new Date(2024, 10, 15, 11, 30, 0).toISOString(), // November 15, 2024
    dateReceived: new Date(2024, 10, 18, 14, 0, 0).toISOString(), // November 18, 2024
    documentCategory: "archived",
    createdByUser: "admin",
    updatedBy: "facilities_mgr"
  },
  {
    title: "Annual Audit Report",
    sender: "External Auditor",
    recipient: "Board of Directors",
    department: "Accounting",
    documentType: "Report",
    description: "Comprehensive annual audit report for fiscal year 2024",
    status: "Received",
    dateSent: new Date(2024, 6, 20, 10, 0, 0).toISOString(), // July 20, 2024
    dateReceived: new Date(2024, 7, 1, 15, 45, 0).toISOString(), // August 1, 2024
    documentCategory: "archived",
    createdByUser: "admin",
    updatedBy: "audit_committee"
  }
];

// Insert sample documents
console.log('Inserting sample documents into History...');

sampleDocuments.forEach((doc, index) => {
  db.run(
    `INSERT INTO documents (title, sender, recipient, department, documentType, description, status, dateSent, dateReceived, documentCategory, createdByUser, updatedBy)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      doc.title,
      doc.sender,
      doc.recipient,
      doc.department,
      doc.documentType,
      doc.description,
      doc.status,
      doc.dateSent,
      doc.dateReceived,
      doc.documentCategory,
      doc.createdByUser,
      doc.updatedBy
    ],
    function(err) {
      if (err) {
        console.error(`Error inserting document ${index + 1}:`, err);
      } else {
        console.log(`✓ Inserted document ${index + 1}: ${doc.title}`);
      }
    }
  );
});

// Close database after all inserts
setTimeout(() => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('\nSample data insertion completed!');
      console.log('You can now refresh your DMS app to see the historical documents with different dates.');
    }
  });
}, 1000);