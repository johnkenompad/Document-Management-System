import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./App.css";
import Login from "./Login";

// Dynamic API URL - checks localStorage first, then env, then defaults to localhost
const getAPIUrl = () => {
  const saved = localStorage.getItem('serverAPIUrl');
  return saved || process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
};

const getServerUrl = () => {
  const apiUrl = getAPIUrl();
  return apiUrl.replace('/api', '');
};

const API_URL = getAPIUrl();
const SERVER_URL = getServerUrl();

// Constants
const INITIAL_FORM_STATE = {
  title: "",
  sender: "",
  recipient: "",
  department: "",
  documentType: "",
  description: "",
  status: "Waiting for Confirmation",
  attachedFile: null,
};

const DEPARTMENTS = ["EDP", "Records", "Cashier", "Accounting", "HR", "Admin"];

const DOCUMENT_TYPES = ["Memo", "Letter", "Report", "Invoice", "Request", "Other"];

const MENU_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "🏠" },
  { id: "send", label: "Send Document", icon: "✉️" },
  { id: "archive", label: "History", icon: "📚" },
  { id: "received", label: "Inbox", icon: "📬" },
  { id: "queue", label: "Outgoing", icon: "📮" },
  { id: "notifications", label: "Notifications", icon: "🔔" },
  { id: "reports", label: "Reports", icon: "📊" },
  { id: "users", label: "Manage Users", icon: "👥" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

function App() {
  // State Management
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [queueDocuments, setQueueDocuments] = useState([]);
  const [archivedDocuments, setArchivedDocuments] = useState([]);
  const [receivedDocuments, setReceivedDocuments] = useState([]);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterDocumentType, setFilterDocumentType] = useState("All");
  const [selectedDepartments, setSelectedDepartments] = useState([...DEPARTMENTS]);
  const [selectedStatuses, setSelectedStatuses] = useState(["Received", "Not Received", "Not Sent"]);
  const [selectedDocumentTypes, setSelectedDocumentTypes] = useState([...DOCUMENT_TYPES]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [newUserForm, setNewUserForm] = useState({ username: "", password: "", role: "Staff", department: "EDP" });
  const [userDepartment, setUserDepartment] = useState("");
  const [editingPassword, setEditingPassword] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [departments, setDepartments] = useState([...DEPARTMENTS]);
  const [documentTypes, setDocumentTypes] = useState([...DOCUMENT_TYPES]);
  const [newDepartment, setNewDepartment] = useState("");
  const [newDocType, setNewDocType] = useState("");

  // Inbox row click modal state
  const [selectedInboxDocument, setSelectedInboxDocument] = useState(null);
  const [showInboxModal, setShowInboxModal] = useState(false);

  // Outgoing row click modal state
  const [selectedOutgoingDocument, setSelectedOutgoingDocument] = useState(null);
  const [showOutgoingModal, setShowOutgoingModal] = useState(false);
  const [outgoingImagePreview, setOutgoingImagePreview] = useState(null);
  const [tempOutgoingStatus, setTempOutgoingStatus] = useState(null);

  // Sorting state for History section
  const [historySortOrder, setHistorySortOrder] = useState("newest");

  // Notification badges for menu items
  const [notifications, setNotifications] = useState({
    queue: 0,
    received: 0,
    archive: 0,
    notifications: 0
  });

  // List of notifications
  const [notificationsList, setNotificationsList] = useState([]);

  // Track cleared notification IDs for graying out
  const [clearedNotificationIds, setClearedNotificationIds] = useState([]);

  // Track which sections have been viewed to prevent re-showing notifications after refresh
  const [clearedNotifications, setClearedNotifications] = useState({
    queue: false,
    received: false,
    archive: false,
    notifications: false
  });

  // Track read notification IDs
  const [readNotificationIds, setReadNotificationIds] = useState([]);

  // Follow-up notifications
  const [followUpNotifications, setFollowUpNotifications] = useState(() => {
    const saved = localStorage.getItem('followUpNotifications');
    return saved ? JSON.parse(saved) : [];
  });

  // Highlighted document for navigation from notifications
  const [highlightedDocId, setHighlightedDocId] = useState(null);

  // Refs for scrollbar synchronization
  const scrollbarWrapperRef = useRef(null);
  const tableWrapperRef = useRef(null);

  // Refs for inbox scrollbar synchronization
  const inboxScrollbarWrapperRef = useRef(null);
  const inboxTableWrapperRef = useRef(null);

  // Refs for outgoing scrollbar synchronization
  const outgoingScrollbarWrapperRef = useRef(null);
  const outgoingTableWrapperRef = useRef(null);

  // Synchronize scrolling between scrollbar wrapper and table wrapper
  useEffect(() => {
    const scrollbarWrapper = scrollbarWrapperRef.current;
    const tableWrapper = tableWrapperRef.current;

    if (scrollbarWrapper && tableWrapper) {
      const handleScrollbarScroll = (e) => {
        tableWrapper.scrollLeft = e.target.scrollLeft;
      };

      const handleTableScroll = (e) => {
        scrollbarWrapper.scrollLeft = e.target.scrollLeft;
      };

      // Function to update scrollbar track width
      const updateScrollbarWidth = () => {
        const tableScrollWidth = tableWrapper.scrollWidth;
        const scrollbarTrack = scrollbarWrapper.querySelector('.history-scrollbar-track');
        if (scrollbarTrack) {
          scrollbarTrack.style.width = `${tableScrollWidth}px`;
        }
      };

      // Initial width update
      updateScrollbarWidth();

      // Update width when content changes (with a small delay to ensure DOM updates)
      const resizeObserver = new ResizeObserver(() => {
        setTimeout(updateScrollbarWidth, 100);
      });
      resizeObserver.observe(tableWrapper);

      scrollbarWrapper.addEventListener('scroll', handleScrollbarScroll);
      tableWrapper.addEventListener('scroll', handleTableScroll);

      return () => {
        scrollbarWrapper.removeEventListener('scroll', handleScrollbarScroll);
        tableWrapper.removeEventListener('scroll', handleTableScroll);
        resizeObserver.disconnect();
      };
    }
  }, [activeMenu]); // Re-run when activeMenu changes

  // Synchronize scrolling between inbox scrollbar wrapper and table wrapper
  useEffect(() => {
    const inboxScrollbarWrapper = inboxScrollbarWrapperRef.current;
    const inboxTableWrapper = inboxTableWrapperRef.current;

    if (inboxScrollbarWrapper && inboxTableWrapper) {
      const handleScrollbarScroll = (e) => {
        inboxTableWrapper.scrollLeft = e.target.scrollLeft;
      };

      const handleTableScroll = (e) => {
        inboxScrollbarWrapper.scrollLeft = e.target.scrollLeft;
      };

      // Function to update scrollbar track width
      const updateScrollbarWidth = () => {
        const tableScrollWidth = inboxTableWrapper.scrollWidth;
        const scrollbarTrack = inboxScrollbarWrapper.querySelector('.inbox-scrollbar-track');
        if (scrollbarTrack) {
          scrollbarTrack.style.width = `${tableScrollWidth}px`;
        }
      };

      // Initial width update
      updateScrollbarWidth();

      // Update width when content changes (with a small delay to ensure DOM updates)
      const resizeObserver = new ResizeObserver(() => {
        setTimeout(updateScrollbarWidth, 100);
      });
      resizeObserver.observe(inboxTableWrapper);

      inboxScrollbarWrapper.addEventListener('scroll', handleScrollbarScroll);
      inboxTableWrapper.addEventListener('scroll', handleTableScroll);

      return () => {
        inboxScrollbarWrapper.removeEventListener('scroll', handleScrollbarScroll);
        inboxTableWrapper.removeEventListener('scroll', handleTableScroll);
        resizeObserver.disconnect();
      };
    }
  }, [activeMenu]); // Re-run when activeMenu changes

  // Synchronize scrolling between outgoing scrollbar wrapper and table wrapper
  useEffect(() => {
    const outgoingScrollbarWrapper = outgoingScrollbarWrapperRef.current;
    const outgoingTableWrapper = outgoingTableWrapperRef.current;

    if (outgoingScrollbarWrapper && outgoingTableWrapper) {
      const handleScrollbarScroll = (e) => {
        outgoingTableWrapper.scrollLeft = e.target.scrollLeft;
      };

      const handleTableScroll = (e) => {
        outgoingScrollbarWrapper.scrollLeft = e.target.scrollLeft;
      };

      // Function to update scrollbar track width
      const updateScrollbarWidth = () => {
        const tableScrollWidth = outgoingTableWrapper.scrollWidth;
        const scrollbarTrack = outgoingScrollbarWrapper.querySelector('.outgoing-scrollbar-track');
        if (scrollbarTrack) {
          scrollbarTrack.style.width = `${tableScrollWidth}px`;
        }
      };

      // Initial width update
      updateScrollbarWidth();

      // Update width when content changes (with a small delay to ensure DOM updates)
      const resizeObserver = new ResizeObserver(() => {
        setTimeout(updateScrollbarWidth, 100);
      });
      resizeObserver.observe(outgoingTableWrapper);

      outgoingScrollbarWrapper.addEventListener('scroll', handleScrollbarScroll);
      outgoingTableWrapper.addEventListener('scroll', handleTableScroll);

      return () => {
        outgoingScrollbarWrapper.removeEventListener('scroll', handleScrollbarScroll);
        outgoingTableWrapper.removeEventListener('scroll', handleTableScroll);
        resizeObserver.disconnect();
      };
    }
  }, [activeMenu]); // Re-run when activeMenu changes

  // Date range for reports
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Sidebar minimized state
  const [sidebarMinimized, setSidebarMinimized] = useState(false);

  // Load user preferences when user logs in
  useEffect(() => {
    if (currentUser) {
      fetch(`${getAPIUrl()}/users/${currentUser}/preferences`)
        .then(response => response.json())
        .then(data => {
          if (data.preferences && typeof data.preferences === 'object') {
            setClearedNotifications(data.preferences);
            if (data.preferences.readNotificationIds) {
              setReadNotificationIds(data.preferences.readNotificationIds);
            }
            if (data.preferences.clearedNotificationIds) {
              setClearedNotificationIds(data.preferences.clearedNotificationIds);
            }
          }
          // Load documents after preferences are loaded
          if (isAuthenticated) {
            loadDocuments();
          }
        })
        .catch(error => console.error('Error loading preferences:', error));
    }
  }, [currentUser, isAuthenticated]);

  // Save cleared notifications to database whenever they change
  useEffect(() => {
    if (currentUser) {
      fetch(`${API_URL}/users/${currentUser}/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          preferences: {
            ...clearedNotifications,
            readNotificationIds,
            clearedNotificationIds
          }
        })
      }).catch(error => console.error('Error saving preferences:', error));
    }
  }, [clearedNotifications, readNotificationIds, clearedNotificationIds, currentUser]);

  // Handle login
  const handleLogin = (success, username, role, department) => {
    setIsAuthenticated(success);
    setCurrentUser(username);
    setUserRole(role);
    setUserDepartment(department || "");
    setActiveMenu("dashboard");
    // Don't reset cleared notifications on login - they should persist across sessions
  };

  // Handle logout
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      setIsAuthenticated(false);
      setCurrentUser("");
      setUserRole("");
      setUserDepartment("");
    }
  };

  // Clear notification badge when opening a section
  const clearNotification = (sectionId) => {
    if (sectionId === 'notifications') {
      // Mark all current notifications as read
      const unreadIds = notificationsList.filter(n => !n.read).map(n => n.id);
      setReadNotificationIds(prev => [...new Set([...prev, ...unreadIds])]);
      setNotificationsList(prev => prev.map(n => ({ ...n, read: true })));
    }
    setNotifications(prev => ({
      ...prev,
      [sectionId]: 0
    }));
    setClearedNotifications(prev => ({
      ...prev,
      [sectionId]: true
    }));
  };

  // Handle menu item click - set active menu and clear notification
  const handleMenuClick = (itemId) => {
    // Reset form when navigating away from send section or when navigating to send section
    if (activeMenu === 'send' || itemId === 'send') {
      resetForm();
    }
    
    setActiveMenu(itemId);
    if (itemId === 'queue' || itemId === 'received' || itemId === 'archive' || itemId === 'notifications') {
      clearNotification(itemId);
    }
  };

  // Memoized filtered documents for History
  const filteredArchive = useMemo(() => {
    // Get archived documents
    const archivedDocs = archivedDocuments.filter((doc) => {
      // Admin can see all documents
      // Department Head can see all documents in history (no department filter)
      // Others see documents where they are the recipient department OR sender department
      const matchesDepartment = userRole === "Admin" || userRole === "Department Head" || 
        doc.department === userDepartment || doc.senderDepartment === userDepartment;
      
      const matchesSearch =
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.senderDepartment.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.id.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.updatedBy && doc.updatedBy.toLowerCase().includes(searchQuery.toLowerCase())) ||
        ((doc.dateReceived || doc.dateSent) && (doc.dateReceived || doc.dateSent).toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesFilterDepartment = selectedDepartments.length === 0 || selectedDepartments.includes(doc.department);
      
      // Handle compound status filtering for history
      const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(doc.status);

      const matchesDocumentType = selectedDocumentTypes.length === 0 || selectedDocumentTypes.includes(doc.documentType);

      return matchesDepartment && matchesSearch && matchesFilterDepartment && matchesStatus && matchesDocumentType;
    });

    // Get sent documents from received category (for senders to see in history)
    // But exclude documents that are still in queue or sent but awaiting response
    const sentDocs = receivedDocuments.filter((doc) => {
      // Only show sent documents where current user is the sender (for non-department heads)
      // For Department Heads, only show documents sent TO their department
      const isSender = doc.senderDepartment === userDepartment;
      const isRecipient = doc.department === userDepartment;
      const isSent = doc.status === "Sent";
      
      // Exclude documents that are still in the outgoing section (sent but awaiting response)
      // Only include documents that have been received or not received (completed workflow)
      const isCompleted = doc.status === "Received" || doc.status === "Not Received";
      
      const matchesDepartment = userRole === "Admin" || userRole === "Department Head" || isSender;
      
      const matchesSearch =
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.senderDepartment.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.id.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.updatedBy && doc.updatedBy.toLowerCase().includes(searchQuery.toLowerCase())) ||
        ((doc.dateReceived || doc.dateSent) && (doc.dateReceived || doc.dateSent).toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesFilterDepartment = selectedDepartments.length === 0 || selectedDepartments.includes(doc.department);
      
      // For sent documents, show as "Sent" status
      const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(doc.status);

      const matchesDocumentType = selectedDocumentTypes.length === 0 || selectedDocumentTypes.includes(doc.documentType);

      return isCompleted && matchesDepartment && matchesSearch && matchesFilterDepartment && matchesStatus && matchesDocumentType;
    });

    // Combine and sort documents
    const combinedDocs = [...archivedDocs, ...sentDocs];
    
    // Sort by date (newest first or oldest first)
    combinedDocs.sort((a, b) => {
      const dateA = new Date(a.dateReceived || a.dateSent);
      const dateB = new Date(b.dateReceived || b.dateSent);
      
      const dateDiff = historySortOrder === "newest" ? dateB - dateA : dateA - dateB;
      
      if (dateDiff !== 0) return dateDiff;
      
      // If dates are equal, sort by ID (higher ID first for newest, lower ID first for oldest)
      return historySortOrder === "newest" ? b.id - a.id : a.id - b.id;
    });

    return combinedDocs;
  }, [archivedDocuments, receivedDocuments, searchQuery, selectedDepartments, selectedStatuses, selectedDocumentTypes, userRole, userDepartment, historySortOrder]);

  // Load documents when user authenticates (but preferences must be loaded first)
  useEffect(() => {
    if (isAuthenticated) {
      loadUsers();
    }
  }, [isAuthenticated]);

  // Update notification counts when documents change
  useEffect(() => {
    if (isAuthenticated) {
      const queueCount = queueDocuments.filter(doc => 
        userRole === "Admin" ? true : doc.senderDepartment === userDepartment
      ).length + receivedDocuments.filter(doc => 
        doc.status === "Sent" && 
        (userRole === "Admin" || doc.senderDepartment === userDepartment)
      ).length;

      const receivedCount = receivedDocuments.filter(doc => 
        userRole === "Admin" || doc.department === userDepartment
      ).length;

      // Calculate archive count without filters (total documents user can see in History)
      const archiveCount = (() => {
        const archivedDocs = archivedDocuments.filter((doc) => {
          return userRole === "Admin" || userRole === "Department Head" || 
            doc.department === userDepartment || doc.senderDepartment === userDepartment;
        });

        const sentDocs = receivedDocuments.filter((doc) => {
          const isSender = doc.senderDepartment === userDepartment;
          const isCompleted = doc.status === "Received" || doc.status === "Not Received";
          return isCompleted && (userRole === "Admin" || userRole === "Department Head" || isSender);
        });

        return archivedDocs.length + sentDocs.length;
      })();

      setNotifications({
        queue: clearedNotifications.queue ? 0 : queueCount,
        received: clearedNotifications.received ? 0 : receivedCount,
        archive: clearedNotifications.archive ? 0 : archiveCount,
        notifications: clearedNotifications.notifications ? 0 : notificationsList.filter(n => !n.read && !clearedNotificationIds.includes(n.id)).length
      });
    }
  }, [queueDocuments, receivedDocuments, archivedDocuments, userRole, userDepartment, isAuthenticated, clearedNotifications, notificationsList, clearedNotificationIds]);

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  // Load all documents from backend
  const loadDocuments = async () => {
    try {
      const [queueRes, receivedRes, archivedRes] = await Promise.all([
        fetch(`${API_URL}/documents/queue`),
        fetch(`${API_URL}/documents/received`),
        fetch(`${API_URL}/documents/archived`)
      ]);

      const queueData = await queueRes.json();
      const receivedData = await receivedRes.json();
      const archivedData = await archivedRes.json();

      setQueueDocuments(queueData.documents || []);
      setReceivedDocuments(receivedData.documents || []);
      setArchivedDocuments(archivedData.documents || []);
      setLoading(false);

      // Generate notifications list
      const newNotifications = [];
      
      // New received documents
      receivedData.documents.filter(doc => userRole === "Admin" || doc.department === userDepartment).forEach(doc => {
        if (doc.status === "Sent") {
          const notificationId = `received-${doc.id}`;
          newNotifications.push({
            id: notificationId,
            message: `New document received: "${doc.title}" from ${doc.sender}`,
            timestamp: doc.dateReceived || doc.dateSent,
            type: 'received',
            read: readNotificationIds.includes(notificationId)
          });
        } else if (doc.status === "Not Sent") {
          const notificationId = `cancelled-${doc.id}`;
          newNotifications.push({
            id: notificationId,
            message: `Document cancelled: "${doc.title}" was not sent`,
            timestamp: doc.dateReceived || doc.dateSent,
            type: 'cancelled',
            read: readNotificationIds.includes(notificationId)
          });
        }
      });
      
      // Documents sent and awaiting response or completed
      receivedData.documents.filter(doc => userRole === "Admin" || doc.senderDepartment === userDepartment).forEach(doc => {
        if (doc.status === "Sent") {
          const notificationId = `sent-${doc.id}`;
          newNotifications.push({
            id: notificationId,
            message: `Document "${doc.title}" sent and awaiting response`,
            timestamp: doc.dateSent,
            type: 'sent',
            read: readNotificationIds.includes(notificationId)
          });
        } else if (doc.status === "Received") {
          const notificationId = `received-confirmation-${doc.id}`;
          newNotifications.push({
            id: notificationId,
            message: `Document received: "${doc.title}" was received by ${doc.recipient}`,
            timestamp: doc.dateReceived || doc.dateSent,
            type: 'received-confirmation',
            read: readNotificationIds.includes(notificationId)
          });
        } else if (doc.status === "Not Received") {
          const notificationId = `not-received-${doc.id}`;
          newNotifications.push({
            id: notificationId,
            message: `Document not received: "${doc.title}" was not received by ${doc.recipient}`,
            timestamp: doc.dateReceived || doc.dateSent,
            type: 'not-received',
            read: readNotificationIds.includes(notificationId)
          });
        }
      });
      
      // Also check archived documents for completed sent documents
      archivedData.documents.filter(doc => userRole === "Admin" || doc.senderDepartment === userDepartment).forEach(doc => {
        if (doc.status === "Received") {
          const notificationId = `received-confirmation-${doc.id}`;
          newNotifications.push({
            id: notificationId,
            message: `Document received: "${doc.title}" was received by ${doc.recipient}`,
            timestamp: doc.dateReceived || doc.dateSent,
            type: 'received-confirmation',
            read: readNotificationIds.includes(notificationId)
          });
        } else if (doc.status === "Not Received") {
          const notificationId = `not-received-${doc.id}`;
          newNotifications.push({
            id: notificationId,
            message: `Document not received: "${doc.title}" was not received by ${doc.recipient}`,
            timestamp: doc.dateReceived || doc.dateSent,
            type: 'not-received',
            read: readNotificationIds.includes(notificationId)
          });
        }
      });
      
      // Add follow-up notifications (filtered by department)
      followUpNotifications
        .filter(followUp => userRole === "Admin" || followUp.department === userDepartment)
        .forEach(followUp => {
          newNotifications.push({
            id: followUp.id,
            message: followUp.message,
            timestamp: followUp.timestamp,
            type: 'follow-up',
            read: readNotificationIds.includes(followUp.id),
            department: followUp.department,
            documentId: followUp.documentId
          });
        });
      
      // Sort by timestamp descending
      newNotifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      setNotificationsList(newNotifications);

      // Reset cleared notifications if there are unread notifications
      const hasUnreadNotifications = newNotifications.some(n => !n.read);
      if (hasUnreadNotifications && clearedNotifications.notifications) {
        setClearedNotifications(prev => ({
          ...prev,
          notifications: false
        }));
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      alert('Failed to connect to server. Make sure the backend is running.');
      setLoading(false);
    }
  };

  const handleClearDatabase = async () => {
    const confirm = window.confirm(
      'This will DELETE ALL DOCUMENTS from the database. This action cannot be undone. Continue?'
    );
    if (!confirm) return;

    const doubleConfirm = window.confirm(
      'Are you ABSOLUTELY SURE? All document data will be permanently deleted!'
    );
    if (!doubleConfirm) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/clear-documents`, {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to clear database');

      // Reset all document states
      setQueueDocuments([]);
      setReceivedDocuments([]);
      setArchivedDocuments([]);
      setLoading(false);
      
      alert('All documents have been deleted successfully!');
    } catch (error) {
      console.error('Error clearing database:', error);
      setLoading(false);
      alert('Failed to clear database');
    }
  };

  // User Management Functions
  const loadUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/users`);
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Failed to load users');
    }
  };

  const createUser = async () => {
    if (!newUserForm.username || !newUserForm.password) {
      alert('Please fill in username and password');
      return;
    }

    // Department Head validation
    if (userRole === "Department Head") {
      if (newUserForm.department !== userDepartment) {
        alert('Department Heads can only create users for their own department');
        return;
      }
      if (newUserForm.role === "Admin" || newUserForm.role === "Department Head") {
        alert('Department Heads can only create Staff or Working Student roles');
        return;
      }
    }

    try {
      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUserForm.username,
          password: newUserForm.password,
          role: newUserForm.role,
          department: newUserForm.department,
          createdBy: currentUser
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert('User created successfully!');
        setNewUserForm({ username: '', password: '', role: 'Staff', department: userRole === "Admin" ? 'EDP' : userDepartment });
        loadUsers();
      } else {
        alert(data.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Failed to create user');
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(`${API_URL}/users/${userId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        alert('User deleted successfully!');
        loadUsers();
      } else {
        alert(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const changePassword = async (userId) => {
    if (!newPassword || newPassword.length < 3) {
      alert('Please enter a valid password (minimum 3 characters)');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/users/${userId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      });

      const data = await response.json();

      if (response.ok) {
        alert('Password changed successfully!');
        setEditingPassword(null);
        setNewPassword('');
      } else {
        alert(data.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Failed to change password');
    }
  };

  // Settings Management
  const addDepartment = () => {
    if (!newDepartment || newDepartment.trim() === '') {
      alert('Please enter a department name');
      return;
    }
    if (departments.includes(newDepartment.trim())) {
      alert('This department already exists');
      return;
    }
    setDepartments([...departments, newDepartment.trim()].sort());
    setNewDepartment('');
    alert('Department added successfully!');
  };

  const removeDepartment = (dept) => {
    if (departments.length <= 1) {
      alert('Cannot remove the last department');
      return;
    }
    if (!window.confirm(`Remove department "${dept}"?`)) return;
    setDepartments(departments.filter(d => d !== dept).sort());
    alert('Department removed successfully!');
  };

  const addDocumentType = () => {
    if (!newDocType || newDocType.trim() === '') {
      alert('Please enter a document type');
      return;
    }
    if (documentTypes.includes(newDocType.trim())) {
      alert('This document type already exists');
      return;
    }
    setDocumentTypes([...documentTypes, newDocType.trim()].sort());
    setNewDocType('');
    alert('Document type added successfully!');
  };

  const removeDocumentType = (type) => {
    if (documentTypes.length <= 1) {
      alert('Cannot remove the last document type');
      return;
    }
    if (!window.confirm(`Remove document type "${type}"?`)) return;
    setDocumentTypes(documentTypes.filter(t => t !== type));
    alert('Document type removed successfully!');
  };

  // Form Handlers
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size limit (20MB)
      const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB in bytes
      if (file.size > MAX_FILE_SIZE) {
        alert('File size must be less than 20MB');
        e.target.value = ''; // Clear the file input
        return;
      }
      handleInputChange("attachedFile", file);
    }
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM_STATE);
  };

  const openFilePreview = (fileName, useBlob = false) => {
    const fileUrl = `${SERVER_URL}/uploads/${fileName}`;
    console.log('openFilePreview called:', { fileName, useBlob, fileUrl });

    if (useBlob) {
      const fileExtension = fileName.split('.').pop().toLowerCase();
      const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
      console.log('File extension:', fileExtension, 'Is image:', imageTypes.includes(fileExtension));

      if (imageTypes.includes(fileExtension)) {
        // For images, fetch as blob and set preview
        console.log('Fetching image as blob...');
        fetch(fileUrl)
          .then(response => {
            console.log('Fetch response:', response.status, response.ok);
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.blob();
          })
          .then(blob => {
            console.log('Blob received:', blob.size, blob.type);
            const objectUrl = URL.createObjectURL(blob);
            console.log('Setting preview URL:', objectUrl);
            setOutgoingImagePreview(objectUrl);
          })
          .catch(err => {
            console.error('Failed to load image:', err);
            // Fallback to direct URL
            console.log('Using fallback URL:', fileUrl);
            setOutgoingImagePreview(fileUrl);
          });
      } else {
        // For other files, open directly (PDFs, text files, etc.)
        window.open(fileUrl, '_blank');
      }
    } else {
      // Original behavior for inbox - open directly
      window.open(fileUrl, '_blank');
    }
  };

  // Document Operations
  const createDocument = async () => {
    if (!formData.title || !formData.sender || !formData.recipient || !formData.department || !formData.documentType) {
      alert("Please fill all required fields (Title, Sender, Recipient, Department, and Document Type)");
      return;
    }

    // All new documents start in queue, regardless of department
    const documentCategory = "queue";

    const formDataToSend = new FormData();
    formDataToSend.append('title', formData.title);
    formDataToSend.append('sender', formData.sender);
    formDataToSend.append('recipient', formData.recipient);
    formDataToSend.append('department', formData.department);
    formDataToSend.append('documentType', formData.documentType);
    formDataToSend.append('description', formData.description || '');
    formDataToSend.append('status', formData.status);
    formDataToSend.append('documentCategory', documentCategory);
    formDataToSend.append('createdByUser', currentUser);
    if (formData.attachedFile) {
      formDataToSend.append('attachedFile', formData.attachedFile);
    }

    try {
      const response = await fetch(`${API_URL}/documents`, {
        method: 'POST',
        body: formDataToSend
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Failed to create document');
        return;
      }

      await loadDocuments();
      resetForm();
      alert("Document sent successfully!");
      // If staff, working student, or department head, switch to queue view so they can update status
      if (userRole === 'Staff' || userRole === 'Working Student' || userRole === 'Department Head') {
        setActiveMenu('queue');
      }
    } catch (error) {
      console.error('Error creating document:', error);
      alert('Failed to create document');
    }
  };

  const updateStatus = async (docId, newStatus, sourceList, setSourceList, isReceivedDoc = false) => {
    let category;
    if (isReceivedDoc) {
      // For received documents: move to archive when Received or Not Received
      category = (newStatus === "Received" || newStatus === "Not Received") ? 'archived' : 'received';
    } else {
      // For queue documents: move to received when Sent, to archive when Not Sent
      category = newStatus === "Sent" ? 'received' : newStatus === "Not Sent" ? 'archived' : 'queue';
    }

    try {
      const response = await fetch(`${API_URL}/documents/${docId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          category: category,
          updatedBy: currentUser
        })
      });

      if (!response.ok) throw new Error('Failed to update status');

      await loadDocuments();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update document status');
    }
  };

  const updateQueueStatus = (docId, newStatus) => {
    updateStatus(docId, newStatus, queueDocuments, setQueueDocuments, false);
  };

  const updateReceivedStatus = (docId, newStatus) => {
    updateStatus(docId, newStatus, receivedDocuments, setReceivedDocuments, true);
  };

  // Add follow-up notification for a document
  const addFollowUpNotification = (document) => {
    const notificationId = `follow-up-${document.id}-${Date.now()}`;
    const newFollowUp = {
      id: notificationId,
      message: `Action Needed: ${document.title}`,
      timestamp: new Date().toISOString(),
      department: document.department,
      documentId: document.id
    };
    
    const updatedFollowUps = [...followUpNotifications, newFollowUp];
    setFollowUpNotifications(updatedFollowUps);
    localStorage.setItem('followUpNotifications', JSON.stringify(updatedFollowUps));
    
    // Reload documents to update notifications list
    loadDocuments();
  };

  // Handle notification click - navigate to appropriate section and highlight document
  const handleNotificationClick = (notification) => {
    if (notification.type === 'follow-up' && notification.documentId) {
      // Mark notification as read
      if (!readNotificationIds.includes(notification.id)) {
        setReadNotificationIds(prev => [...prev, notification.id]);
      }
      
      // Set highlighted document
      setHighlightedDocId(notification.documentId);
      
      // Check if document is in inbox (received documents) - user is the recipient
      const inboxDoc = receivedDocuments.find(doc => doc.id === notification.documentId);
      const isInInbox = inboxDoc && (userRole === "Admin" || inboxDoc.department === userDepartment);
      
      // Check if document is in outgoing (queue or sent documents) - user is the sender
      const queueDoc = queueDocuments.find(doc => doc.id === notification.documentId);
      const sentDoc = receivedDocuments.find(doc => 
        doc.id === notification.documentId && 
        doc.status === "Sent"
      );
      const outgoingDoc = queueDoc || sentDoc;
      const isInOutgoing = outgoingDoc && (userRole === "Admin" || outgoingDoc.senderDepartment === userDepartment);
      
      // Navigate to the appropriate section
      if (isInInbox) {
        setActiveMenu('received');
      } else if (isInOutgoing) {
        setActiveMenu('queue');
      } else {
        // Fallback: if not found in either, try to determine from notification.department
        // If notification.department matches userDepartment, it's likely in inbox
        if (notification.department === userDepartment) {
          setActiveMenu('received');
        } else {
          setActiveMenu('queue');
        }
      }
      
      // Clear highlight after 3 seconds
      setTimeout(() => {
        setHighlightedDocId(null);
      }, 3000);
    }
  };

  // Helper function to filter documents by date range
  const filterDocumentsByDate = (documents) => {
    if (!dateFrom && !dateTo) return documents;
    
    return documents.filter(doc => {
      const docDate = doc.dateSent || doc.dateReceived;
      if (!docDate) return false;
      
      const docDateObj = new Date(docDate);
      if (isNaN(docDateObj.getTime())) return false;
      
      const fromDate = dateFrom ? new Date(dateFrom) : null;
      const toDate = dateTo ? new Date(dateTo) : null;
      
      if (fromDate && docDateObj < fromDate) return false;
      if (toDate && docDateObj > toDate) return false;
      
      return true;
    });
  };

  // Helper function to check if document is older than 5 days
  const isDocumentOlderThan5Days = (doc) => {
    const dateStr = doc.dateSent || doc.dateReceived;
    if (!dateStr) return false;
    
    const docDate = new Date(dateStr);
    if (isNaN(docDate.getTime())) return false;
    
    const now = new Date();
    const diffTime = now - docDate;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    return diffDays > 5;
  };


  // Generate and download report data as CSV
  const downloadReportData = () => {
    const filteredQueue = filterDocumentsByDate(queueDocuments).filter(doc => 
      userRole === "Admin" ? true : doc.department === userDepartment
    );
    const filteredReceived = filterDocumentsByDate(receivedDocuments).filter(doc => 
      userRole === "Admin" ? true : doc.department === userDepartment
    );
    const filteredArchived = filterDocumentsByDate(archivedDocuments).filter(doc => 
      userRole === "Admin" ? true : doc.department === userDepartment
    );

    let csvContent = "DMS Report\n";
    csvContent += `Generated on: ${new Date().toLocaleString()}\n`;
    csvContent += `Date Range: ${dateFrom || 'All'} to ${dateTo || 'All'}\n`;
    if (userRole === "Department Head") {
      csvContent += `Department: ${userDepartment}\n`;
    }
    csvContent += "\n";

    // Document Statistics
    csvContent += "DOCUMENT STATISTICS\n";
    csvContent += "Metric,Count\n";
    csvContent += `Total Documents,${filteredQueue.length + filteredReceived.length + filteredArchived.length}\n`;
    csvContent += `Sent Documents,${filteredReceived.length + filteredArchived.length}\n`;
    csvContent += `Received Documents,${filteredArchived.filter(doc => doc.status === "Received").length}\n`;
    csvContent += `Pending Documents,${filteredQueue.filter(doc => doc.status === "Waiting for Confirmation").length + filteredReceived.filter(doc => doc.status === "Sent").length}\n\n`;

    // Status Breakdown
    csvContent += "DOCUMENT STATUS BREAKDOWN\n";
    csvContent += "Status,Count\n";
    csvContent += `In Queue (Waiting for Confirmation),${filteredQueue.filter(doc => doc.status === "Waiting for Confirmation").length}\n`;
    csvContent += `Sent (Awaiting Response),${filteredReceived.filter(doc => doc.status === "Sent").length + filteredArchived.filter(doc => doc.status === "Sent").length}\n`;
    csvContent += `Received,${filteredArchived.filter(doc => doc.status === "Received").length}\n`;
    csvContent += `Not Received,${filteredArchived.filter(doc => doc.status === "Not Received").length}\n`;
    csvContent += `Not Sent,${filteredArchived.filter(doc => doc.status === "Not Sent").length}\n\n`;

    // Department Statistics - Only include for Admin
    if (userRole === "Admin") {
      csvContent += "DOCUMENTS BY DEPARTMENT\n";
      csvContent += "Department,Count\n";
      departments.forEach(dept => {
        const deptCount = 
          filterDocumentsByDate(queueDocuments).filter(doc => doc.department === dept).length +
          filterDocumentsByDate(receivedDocuments).filter(doc => doc.department === dept).length +
          filterDocumentsByDate(archivedDocuments).filter(doc => doc.department === dept).length;
        csvContent += `${dept},${deptCount}\n`;
      });
      csvContent += "\n";
    }

    // Document Type Statistics
    csvContent += "DOCUMENTS BY TYPE\n";
    csvContent += "Type,Count\n";
    documentTypes.forEach(type => {
      const typeCount = 
        filteredQueue.filter(doc => doc.documentType === type).length +
        filteredReceived.filter(doc => doc.documentType === type).length +
        filteredArchived.filter(doc => doc.documentType === type).length;
      csvContent += `${type},${typeCount}\n`;
    });
    csvContent += "\n";

    // User Statistics
    csvContent += "USER STATISTICS\n";
    csvContent += "Metric,Count\n";
    const filteredUsers = userRole === "Admin" ? users : users.filter(user => user.department === userDepartment);
    csvContent += `Total Users,${filteredUsers.length}\n`;
    csvContent += `Administrators,${filteredUsers.filter(user => user.role === "Admin").length}\n`;
    csvContent += `Department Heads,${filteredUsers.filter(user => user.role === "Department Head").length}\n`;
    csvContent += `Staff Members,${filteredUsers.filter(user => user.role === "Staff").length}\n`;
    csvContent += `Working Students,${filteredUsers.filter(user => user.role === "Working Student").length}\n\n`;

    // Users by Department - Only include for Admin
    if (userRole === "Admin") {
      csvContent += "USERS BY DEPARTMENT\n";
      csvContent += "Department,Count\n";
      departments.forEach(dept => {
        const deptUsers = users.filter(user => user.department === dept).length;
        csvContent += `${dept},${deptUsers}\n`;
      });
      csvContent += "\n";
    }

    // Recent Activity Summary
    csvContent += "RECENT ACTIVITY SUMMARY\n";
    csvContent += "Period,Count\n";
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const monthAgoStr = monthAgo.toISOString().split('T')[0];

    csvContent += `Documents Today,${filteredQueue.filter(doc => doc.dateSent?.startsWith(todayStr)).length + filteredReceived.filter(doc => doc.dateSent?.startsWith(todayStr)).length + filteredArchived.filter(doc => doc.dateSent?.startsWith(todayStr)).length}\n`;
    csvContent += `Documents This Week,${filteredQueue.filter(doc => doc.dateSent && doc.dateSent >= weekAgoStr).length + filteredReceived.filter(doc => doc.dateSent && doc.dateSent >= weekAgoStr).length + filteredArchived.filter(doc => doc.dateSent && doc.dateSent >= weekAgoStr).length}\n`;
    csvContent += `Documents This Month,${filteredQueue.filter(doc => doc.dateSent && doc.dateSent >= monthAgoStr).length + filteredReceived.filter(doc => doc.dateSent && doc.dateSent >= monthAgoStr).length + filteredArchived.filter(doc => doc.dateSent && doc.dateSent >= monthAgoStr).length}\n`;
    csvContent += `Unread Notifications,${notificationsList.filter(n => !n.read).length}\n`;

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `dms-report-${userRole === "Department Head" ? `${userDepartment}-` : ""}${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // UI Components
  const renderSidebar = () => (
    <div className={`sidebar ${sidebarMinimized ? 'minimized' : ''}`}>
      <button className="sidebar-toggle" onClick={() => setSidebarMinimized(!sidebarMinimized)}>
        {sidebarMinimized ? '▶' : '◀'}
      </button>
      <h2>{currentUser} - {userDepartment}</h2>
      <ul>
        {MENU_ITEMS.filter(item => {
          // Show basic menu items for all users
          if (item.id !== 'users' && item.id !== 'settings' && item.id !== 'reports') return true;
          
          // Show users and reports for Admin and Department Head
          if (item.id === 'users' || item.id === 'reports') {
            return userRole === 'Admin' || userRole === 'Department Head';
          }
          
          // Show settings only for Admin
          if (item.id === 'settings') {
            return userRole === 'Admin';
          }
          
          return false;
        }).map((item) => {
          let notificationCount = 0;
          if (item.id === 'queue') notificationCount = notifications.queue;
          if (item.id === 'received') notificationCount = notifications.received;
          if (item.id === 'archive') notificationCount = notifications.archive;
          if (item.id === 'notifications') notificationCount = notifications.notifications;
          
          return (
            <li
              key={item.id}
              className={activeMenu === item.id ? "active" : ""}
              onClick={() => handleMenuClick(item.id)}
            >
              <span className="menu-icon">{item.icon}</span>
              <span className="menu-label">{item.label}</span>
              {notificationCount > 0 && (
                <span className="notification-badge">!</span>
              )}
            </li>
          );
        })}
      </ul>
      <button className="logout-btn" onClick={handleLogout}>
        <span className="logout-icon">🚪</span>
        <span className="logout-label">Logout</span>
      </button>
    </div>
  );

  const renderDashboard = () => (
    <section className="dashboard dashboard-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Dashboard</h2>
        <button className="btn-secondary" onClick={loadDocuments} style={{ fontSize: '14px', padding: '8px 16px' }}>Refresh</button>
      </div>
      
      {/* Admin: Clear Database Control */}
      {userRole === "Admin" && (
        <div className="database-controls">
          <button className="btn-database" onClick={handleClearDatabase} style={{ backgroundColor: "#dc3545" }}>
            Clear All Documents
          </button>
        </div>
      )}

      <div className="stats-container">
        <StatCard 
          icon="📋" 
          title="Outgoing" 
          count={
            queueDocuments.filter(doc => 
              userRole === "Admin" ? true : doc.senderDepartment === userDepartment
            ).length + 
            receivedDocuments.filter(doc => 
              doc.status === "Sent" && 
              (userRole === "Admin" || doc.senderDepartment === userDepartment)
            ).length
          } 
          label="Active Documents" 
        />
        <StatCard 
          icon="📥" 
          title="Inbox" 
          count={
            receivedDocuments.filter(doc => 
              userRole === "Admin" || doc.department === userDepartment
            ).length
          } 
          label="Pending Review" 
        />
        <StatCard icon="📦" title="History" count={filteredArchive.length} label="Completed" />
        <StatCard
          icon="📊"
          title="Department Documents"
          count={
            queueDocuments.filter(doc => 
              userRole === "Admin" ? true : doc.department === userDepartment || doc.senderDepartment === userDepartment
            ).length + 
            receivedDocuments.filter(doc => 
              userRole === "Admin" || doc.department === userDepartment || doc.senderDepartment === userDepartment
            ).length + 
            archivedDocuments.filter(doc => 
              userRole === "Admin" || doc.department === userDepartment || doc.senderDepartment === userDepartment
            ).length
          }
          label="Total in Department"
        />
      </div>

      {/* Recent Activity Section */}
      <div className="recent-activity">
        <h2>Recent Activity - {userDepartment} Department</h2>
        <div className="activity-list">
          {(() => {
            // Get recent documents for this department (last 10 activities)
            const recentDocs = [
              ...queueDocuments.filter(doc => 
                userRole === "Admin" || doc.department === userDepartment || doc.senderDepartment === userDepartment
              ),
              ...receivedDocuments.filter(doc => 
                userRole === "Admin" || doc.department === userDepartment || doc.senderDepartment === userDepartment
              ),
              ...archivedDocuments.filter(doc => 
                userRole === "Admin" || doc.department === userDepartment || doc.senderDepartment === userDepartment
              )
            ]
            .sort((a, b) => {
              const dateA = new Date(a.dateReceived || a.dateSent);
              const dateB = new Date(b.dateReceived || b.dateSent);
              return dateB - dateA; // Most recent first
            })
            .slice(0, 10); // Show only last 10 activities

            if (recentDocs.length === 0) {
              return <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>No recent activity found.</p>;
            }

            return recentDocs.map((doc) => {
              const isSender = doc.senderDepartment === userDepartment;
              const isReceiver = doc.department === userDepartment;
              const dateStr = doc.dateReceived || doc.dateSent;
              const date = new Date(dateStr);
              const timeAgo = dateStr ? (() => {
                const now = new Date();
                const diffMs = now - date;
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffMins = Math.floor(diffMs / (1000 * 60));

                if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
                if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
                if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
                return 'Just now';
              })() : 'Unknown';

              let activityType = '';
              let activityIcon = '';
              let activityColor = '';

              if (isSender && doc.status === 'Sent') {
                activityType = 'Sent document';
                activityIcon = '📤';
                activityColor = '#10b981';
              } else if (isReceiver && doc.status === 'Received') {
                activityType = 'Received document';
                activityIcon = '📥';
                activityColor = '#3b82f6';
              } else if (isReceiver && doc.status === 'Not Received') {
                activityType = 'Document not received';
                activityIcon = '❌';
                activityColor = '#ef4444';
              } else if (doc.status === 'Not Sent') {
                activityType = 'Document cancelled';
                activityIcon = '🚫';
                activityColor = '#f59e0b';
              } else {
                activityType = 'Document updated';
                activityIcon = '📝';
                activityColor = '#8b5cf6';
              }

              return (
                <div key={doc.id} className="activity-item" style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '12px', 
                  borderBottom: '1px solid #e5e7eb',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ 
                    fontSize: '20px', 
                    marginRight: '12px',
                    color: activityColor
                  }}>
                    {activityIcon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                      {doc.title}
                    </div>
                    <div style={{ fontSize: '14px', color: '#64748b' }}>
                      {activityType} • {doc.documentType || 'Unknown type'} • ID: {doc.id}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'right' }}>
                    {timeAgo}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </section>
  );

  const renderSendForm = () => (
    <section className="add-doc send-section">
      <h2>Send Document</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <FormInput
          label="Document Title *"
          value={formData.title}
          onChange={(e) => handleInputChange("title", e.target.value)}
          placeholder="Enter document title"
          required
        />
        
        <FormSelect
          label="Document Type *"
          value={formData.documentType}
          onChange={(e) => handleInputChange("documentType", e.target.value)}
          options={documentTypes}
          placeholder="Select Type"
        />
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <FormInput
          label="Sender Name *"
          value={formData.sender}
          onChange={(e) => handleInputChange("sender", e.target.value)}
          placeholder="Your name"
          required
        />
        
        <FormInput
          label="Recipient Name *"
          value={formData.recipient}
          onChange={(e) => handleInputChange("recipient", e.target.value)}
          placeholder="Recipient name"
          required
        />
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <FormSelect
          label="Sent to *"
          value={formData.department}
          onChange={(e) => handleInputChange("department", e.target.value)}
          options={departments}
          placeholder="Select Department"
        />
      </div>

      <div className="form-group full-width" style={{ marginBottom: '30px' }}>
        <label>Attach File</label>
        <div className="file-upload-wrapper">
          <input type="file" id="file-upload" accept="image/*,.pdf,.doc,.docx" onChange={handleFileChange} className="file-input" />
          <label htmlFor="file-upload" className="file-upload-btn">
            Choose File
          </label>
          {formData.attachedFile && <span className="file-name">{formData.attachedFile.name}</span>}
        </div>
        <small style={{ color: '#666', fontSize: '12px', marginTop: '5px', display: 'block' }}>
          Accepted formats: Images (JPG, JPEG, PNG, GIF, BMP, WEBP, SVG), PDF, Word documents (DOC, DOCX) - Max 25MB
        </small>
      </div>

      <div className="form-actions" style={{ justifyContent: 'center', gap: '20px' }}>
        <button className="btn-primary" onClick={createDocument} style={{ padding: '14px 28px', fontSize: '16px', fontWeight: '600' }}>
          Send Document
        </button>
        <button className="btn-secondary" onClick={resetForm} style={{ padding: '14px 28px', fontSize: '16px', fontWeight: '600' }}>
          Clear Form
        </button>
      </div>
    </section>
  );

  const renderNotifications = () => (
    <section className="notifications-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Notifications</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary" onClick={loadDocuments}>Refresh</button>
          <button 
            className="btn-secondary" 
            onClick={() => {
              // Mark all current notifications as cleared (grayed out) and read
              const currentNotificationIds = notificationsList.map(n => n.id);
              const unreadIds = notificationsList.filter(n => !n.read).map(n => n.id);
              
              setClearedNotificationIds(prev => [...new Set([...prev, ...currentNotificationIds])]);
              setReadNotificationIds(prev => [...new Set([...prev, ...unreadIds])]);
              setNotificationsList(prev => prev.map(n => ({ ...n, read: true })));
              setNotifications(prev => ({ ...prev, notifications: 0 }));
              setClearedNotifications(prev => ({ ...prev, notifications: true }));
            }}
            disabled={notificationsList.length === 0}
          >
            Clear All
          </button>
        </div>
      </div>
      {notificationsList.length === 0 ? (
        <p>No new notifications.</p>
      ) : (
        <div className="notifications-list">
          {notificationsList.map(notification => {
            const isFollowUp = notification.type === 'follow-up';
            
            return (
              <div 
                key={notification.id} 
                className={`notification-item ${notification.read ? 'read' : 'unread'} ${clearedNotificationIds.includes(notification.id) ? 'cleared' : ''} ${isFollowUp ? 'clickable' : ''}`}
                onClick={(e) => {
                  if (isFollowUp) {
                    e.preventDefault();
                    e.stopPropagation();
                    handleNotificationClick(notification);
                  }
                }}
                style={isFollowUp ? { cursor: 'pointer' } : {}}
              >
                <div className="notification-message">{notification.message}</div>
                <div className="notification-timestamp">{(() => {
                  const date = new Date(notification.timestamp);
                  const datePart = date.toLocaleDateString();
                  const timePart = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                  return `${datePart} ${timePart}`;
                })()}</div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );

  const renderDocumentTable = (documents, columns, showActions, onStatusChange, statusOptions, isArchive = false, isInboxClickable = false, highlightOldDocs = false) => {
    const getColumnRenderer = (col) => {
      switch (col) {
        case "ID": return (doc) => doc.id;
        case "Title": return (doc) => doc.title;
        case "Recipient Name": return (doc) => doc.recipient || "-";
        case "Sender Name": return (doc) => doc.sender;
        case "Sender Dept": return (doc) => doc.senderDepartment || "-";
        case "Sent to": return (doc) => doc.department;
        case "Document Type": return (doc) => doc.documentType || "-";
        case "Status": return (doc) => {
          return <span className={`status-badge status-${doc.status.toLowerCase().split(" ")[0]}`}>{doc.status}</span>;
        };
        case "Date Sent": return (doc) => {
          const dateStr = doc.dateReceived || doc.dateSent;
          if (!dateStr) return "-";
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return dateStr;
          const datePart = date.toLocaleDateString();
          const timePart = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
          return `${datePart} ${timePart}`;
        };
        case "Date Received": return (doc) => {
          const dateStr = doc.dateReceived || doc.dateSent;
          if (!dateStr) return "-";
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return dateStr;
          const datePart = date.toLocaleDateString();
          const timePart = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
          return `${datePart} ${timePart}`;
        };
        case "Updated By": return (doc) => doc.updatedBy || "-";
        case "Attachment": return (doc) => doc.fileName ? (
          <button 
            className="btn-secondary" 
            onClick={() => openFilePreview(doc.fileName)}
            style={{ padding: '5px 10px', fontSize: '12px' }}
          >
            👁️ Preview
          </button>
        ) : "-";
        case "Actions": return showActions ? (doc) => (
          <div style={{ position: 'relative' }}>
            <select
              value={doc.status}
              onChange={(e) => onStatusChange(doc.id, e.target.value)}
              className="status-update-select"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ) : null;
        default: return (doc) => "-";
      }
    };

    return (
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col} style={{ 
                textAlign: 'center', 
                fontSize: '14px', 
                textTransform: 'capitalize',
                fontWeight: '600',
                padding: '16px 20px'
              }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => {
            const isOld = highlightOldDocs && isDocumentOlderThan5Days(doc);
            const isHighlighted = highlightedDocId === doc.id;
            
            return (
              <tr 
                key={doc.id} 
                onClick={isInboxClickable ? () => {
                  setSelectedInboxDocument(doc);
                  setShowInboxModal(true);
                } : undefined}
                style={
                  isInboxClickable 
                    ? { 
                        cursor: 'pointer', 
                        transition: 'background-color 0.2s',
                        backgroundColor: isHighlighted ? '#fef3c7' : (isOld ? '#fee2e2' : '')
                      } 
                    : { backgroundColor: isHighlighted ? '#fef3c7' : (isOld ? '#fee2e2' : '') }
                }
                className={`${isHighlighted ? 'highlighted-row' : ''} ${isOld && !isHighlighted ? 'old-document' : ''}`}
                onMouseEnter={isInboxClickable ? (e) => {
                  if (!isHighlighted) {
                    e.target.closest('tr').style.backgroundColor = isOld ? '#fecaca' : '#f8fafc';
                  }
                } : undefined}
                onMouseLeave={isInboxClickable ? (e) => {
                  if (!isHighlighted) {
                    e.target.closest('tr').style.backgroundColor = isOld ? '#fee2e2' : '';
                  } else {
                    e.target.closest('tr').style.backgroundColor = '#fef3c7';
                  }
                } : undefined}
              >
                {columns.map((col) => {
                  const renderer = getColumnRenderer(col);
                  const cellContent = renderer ? renderer(doc) : null;
                  const isActionCell = col === "Actions" && showActions;
                  return cellContent ? (
                    <td key={col} className={isActionCell ? 'action-cell' : ''}>
                      {cellContent}
                    </td>
                  ) : null;
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  return (
    <div className="app">
      {renderSidebar()}
      <div className="main-content">
        {activeMenu === "dashboard" && renderDashboard()}

        {activeMenu === "send" && renderSendForm()}

        {activeMenu === "notifications" && renderNotifications()}

        {activeMenu === "archive" && (
          <section className="doc-list history-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>History</h2>
              <button className="btn-secondary" onClick={loadDocuments}>Refresh</button>
            </div>
            <SearchAndFilter
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedDepartments={selectedDepartments}
              setSelectedDepartments={setSelectedDepartments}
              selectedStatuses={selectedStatuses}
              setSelectedStatuses={setSelectedStatuses}
              departments={departments}
              selectedDocumentTypes={selectedDocumentTypes}
              setSelectedDocumentTypes={setSelectedDocumentTypes}
              documentTypes={documentTypes}
              sortOrder={historySortOrder}
              setSortOrder={setHistorySortOrder}
            />
            <div className="history-table-container">
              <div className="history-scrollbar-wrapper" ref={scrollbarWrapperRef}>
                <div className="history-scrollbar-track"></div>
              </div>
              <div className="history-table-wrapper" ref={tableWrapperRef}>
                {filteredArchive.length === 0 ? (
                  <p>No documents found.</p>
                ) : (
                  renderDocumentTable(
                    filteredArchive,
                    ["ID", "Title", "Recipient Name", "Sender Name", "Sender Dept", "Sent to", "Document Type", "Status", "Date Sent", "Updated By", "Attachment"],
                    false,
                    null,
                    null,
                    true
                  )
                )}
              </div>
            </div>
          </section>
        )}

        {activeMenu === "received" && (
          <section className="doc-list inbox-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>Inbox</h2>
              <button className="btn-secondary" onClick={loadDocuments}>Refresh</button>
            </div>
            {receivedDocuments.filter(doc => userRole === "Admin" || doc.department === userDepartment).length === 0 ? (
              <p>No received documents.</p>
            ) : (
              <div className="inbox-table-container">
                <div className="inbox-scrollbar-wrapper" ref={inboxScrollbarWrapperRef}>
                  <div className="inbox-scrollbar-track"></div>
                </div>
                <div className="inbox-table-wrapper" ref={inboxTableWrapperRef}>
                  {renderDocumentTable(
                    receivedDocuments.filter(doc => userRole === "Admin" || doc.department === userDepartment),
                    ["ID", "Title", "Recipient Name", "Sender Name", "Sender Dept", "Sent to", "Document Type", "Status", "Date Received", "Updated By"],
                    false,
                    null,
                    null,
                    false,
                    true,
                    true
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {activeMenu === "queue" && (
          <section className="doc-list outgoing-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>Outgoing</h2>
              <button className="btn-secondary" onClick={loadDocuments}>Refresh</button>
            </div>
            {(() => {
              // Include documents in queue + sent documents that haven't been received/not received yet
              const queueDocs = queueDocuments.filter(doc => 
                userRole === "Admin" ? true :
                doc.senderDepartment === userDepartment
              );
              
              const sentDocs = receivedDocuments.filter(doc => 
                doc.status === "Sent" && 
                (userRole === "Admin" || doc.senderDepartment === userDepartment)
              );
              
              const allOutgoingDocs = [...queueDocs, ...sentDocs];
              
              return allOutgoingDocs.length === 0 ? (
                <p>No documents to display.</p>
              ) : (
                <div className="outgoing-table-container">
                  <div className="outgoing-scrollbar-wrapper" ref={outgoingScrollbarWrapperRef}>
                    <div className="outgoing-scrollbar-track"></div>
                  </div>
                  <div className="outgoing-table-wrapper" ref={outgoingTableWrapperRef}>
                    <table>
                      <thead>
                        <tr>
                          {["ID", "Title", "Recipient Name", "Sender Name", "Sender Dept", "Sent to", "Document Type", "Status", "Date Sent", "Updated By"].map((col) => (
                            <th key={col} style={{ 
                              textAlign: 'center', 
                              fontSize: '14px', 
                              textTransform: 'capitalize',
                              fontWeight: '600',
                              padding: '16px 20px'
                            }}>
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {allOutgoingDocs.map((doc) => {
                          // Determine display status for archive (compound status)
                          const displayStatus = doc.status;
                          const isOld = isDocumentOlderThan5Days(doc);
                          const isHighlighted = highlightedDocId === doc.id;
                          
                          return (
                            <tr 
                              key={doc.id}
                              onClick={() => {
                                setSelectedOutgoingDocument(doc);
                                setTempOutgoingStatus(doc.status);
                                setShowOutgoingModal(true);
                              }}
                              style={{ 
                                cursor: 'pointer', 
                                transition: 'background-color 0.2s',
                                backgroundColor: isHighlighted ? '#fef3c7' : (isOld ? '#fee2e2' : '')
                              }}
                              className={`${isHighlighted ? 'highlighted-row' : ''} ${isOld && !isHighlighted ? 'old-document' : ''}`}
                              onMouseEnter={(e) => {
                                if (!isHighlighted) {
                                  e.target.closest('tr').style.backgroundColor = isOld ? '#fecaca' : '#f8fafc';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isHighlighted) {
                                  e.target.closest('tr').style.backgroundColor = isOld ? '#fee2e2' : '';
                                } else {
                                  e.target.closest('tr').style.backgroundColor = '#fef3c7';
                                }
                              }}
                            >
                              <td>{doc.id}</td>
                              <td>{doc.title}</td>
                              <td>{doc.recipient || "-"}</td>
                              <td>{doc.sender}</td>
                              <td>{doc.senderDepartment || "-"}</td>
                              <td>{doc.department}</td>
                              <td>{doc.documentType || "-"}</td>
                              <td>
                                <span className={`status-badge status-${displayStatus.toLowerCase().split(" ")[0]}`}>
                                  {displayStatus}
                                </span>
                              </td>
                              <td>{(() => {
                                const dateStr = doc.dateReceived || doc.dateSent;
                                if (!dateStr) return "-";
                                const date = new Date(dateStr);
                                if (isNaN(date.getTime())) return dateStr;
                                const datePart = date.toLocaleDateString();
                                const timePart = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                                return `${datePart} ${timePart}`;
                              })()}</td>
                              <td>{doc.updatedBy || "-"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </section>
        )}

        {activeMenu === "users" && (userRole === "Admin" || userRole === "Department Head") && (
          <section className="doc-list users-section">
            <h2>Manage Users</h2>
            
            <h3>Create New User</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Username *</label>
                <input
                  type="text"
                  placeholder="Enter username"
                  value={newUserForm.username}
                  onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  placeholder="Enter password"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  value={newUserForm.role}
                  onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                >
                  <option value="Staff">Staff</option>
                  <option value="Working Student">Working Student</option>
                  {userRole === "Admin" && <option value="Department Head">Department Head</option>}
                </select>
              </div>
              <div className="form-group">
                <label>Department *</label>
                <select
                  value={newUserForm.department}
                  onChange={(e) => setNewUserForm({ ...newUserForm, department: e.target.value })}
                >
                  {userRole === "Admin" ? 
                    departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    )) : 
                    <option value={userDepartment}>{userDepartment}</option>
                  }
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button className="btn-primary" onClick={createUser}>
                Create User
              </button>
              <button 
                className="btn-secondary" 
                onClick={() => setNewUserForm({ username: '', password: '', role: 'Staff', department: userRole === "Admin" ? 'EDP' : userDepartment })}
              >
                Clear
              </button>
            </div>

            <h3>Existing Users</h3>
            {(() => {
              const filteredUsers = userRole === "Admin" ? users : users.filter(user => user.department === userDepartment);
              return filteredUsers.length === 0 ? (
                <p>No users found in your department. Click "Refresh Users" to load.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th style={{ 
                        textAlign: 'center', 
                        fontSize: '12px', 
                        textTransform: 'capitalize',
                        fontWeight: '600',
                        padding: '8px 4px'
                      }}>ID</th>
                      <th style={{ 
                        textAlign: 'center', 
                        fontSize: '12px', 
                        textTransform: 'capitalize',
                        fontWeight: '600',
                        padding: '8px 4px'
                      }}>Username</th>
                      <th style={{ 
                        textAlign: 'center', 
                        fontSize: '12px', 
                        textTransform: 'capitalize',
                        fontWeight: '600',
                        padding: '8px 4px'
                      }}>Role</th>
                      <th style={{ 
                        textAlign: 'center', 
                        fontSize: '12px', 
                        textTransform: 'capitalize',
                        fontWeight: '600',
                        padding: '8px 4px'
                      }}>Department</th>
                      <th style={{ 
                        textAlign: 'center', 
                        fontSize: '12px', 
                        textTransform: 'capitalize',
                        fontWeight: '600',
                        padding: '8px 4px'
                      }}>Created At</th>
                      <th style={{ 
                        textAlign: 'center', 
                        fontSize: '12px', 
                        textTransform: 'capitalize',
                        fontWeight: '600',
                        padding: '8px 4px'
                      }}>Created By</th>
                      <th style={{ 
                        textAlign: 'center', 
                        fontSize: '12px', 
                        textTransform: 'capitalize',
                        fontWeight: '600',
                        padding: '8px 4px'
                      }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id}>
                        <td>{user.id}</td>
                        <td>{user.username}</td>
                        <td>
                          <span className={`status-badge ${
                            user.role === 'Admin' ? 'status-received' : 
                            user.role === 'Department Head' ? 'status-approved' : 
                            'status-waiting'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td>{user.department || '-'}</td>
                        <td>{user.createdAt}</td>
                        <td>{user.createdBy}</td>
                        <td>
                          {editingPassword === user.id ? (
                            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                              <input
                                type="password"
                                placeholder="New password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                style={{ padding: '5px', fontSize: '12px', width: '120px' }}
                              />
                              <button
                                className="btn-primary"
                                onClick={() => changePassword(user.id)}
                                style={{ padding: '5px 10px', fontSize: '12px' }}
                              >
                                Save
                              </button>
                              <button
                                className="btn-secondary"
                                onClick={() => { setEditingPassword(null); setNewPassword(''); }}
                                style={{ padding: '5px 10px', fontSize: '12px' }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '5px' }}>
                              <button
                                className="btn-secondary"
                                onClick={() => setEditingPassword(user.id)}
                                style={{ padding: '5px 10px', fontSize: '12px' }}
                              >
                                Change Password
                              </button>
                              {user.username !== 'admin' && user.role !== 'Admin' && (
                                <button 
                                  className="btn-secondary" 
                                  onClick={() => deleteUser(user.id)}
                                  style={{ padding: "5px 10px", fontSize: "12px", backgroundColor: "#dc3545" }}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </section>
        )}

        {activeMenu === "reports" && (
          <section className="doc-list reports-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>Reports {userRole === "Department Head" ? `- ${userDepartment} Department` : ""}</h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-secondary" onClick={loadDocuments}>Refresh Documents</button>
                <button className="btn-secondary" onClick={loadUsers}>Refresh Users</button>
                <button className="btn-primary" onClick={downloadReportData}>📥 Download Report</button>
              </div>
            </div>

            {/* Date Range Filter */}
            <div style={{ 
              display: 'flex', 
              gap: '20px', 
              alignItems: 'center', 
              marginBottom: '30px',
              padding: '20px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontWeight: '600', color: '#374151' }}>From Date:</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontWeight: '600', color: '#374151' }}>To Date:</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'end', gap: '10px' }}>
                <button 
                  className="btn-secondary" 
                  onClick={() => { setDateFrom(""); setDateTo(""); }}
                  style={{ padding: '8px 16px' }}
                >
                  Clear Dates
                </button>
              </div>
            </div>

            {/* Document Statistics */}
            <h3>Document Statistics</h3>
            <div className="stats-container" style={{ marginBottom: '30px' }}>
              <StatCard 
                icon="📄" 
                title="Total Documents" 
                count={
                  (() => {
                    const filteredQueue = filterDocumentsByDate(queueDocuments).filter(doc => 
                      userRole === "Admin" ? true : doc.department === userDepartment || doc.senderDepartment === userDepartment
                    );
                    const filteredReceived = filterDocumentsByDate(receivedDocuments).filter(doc => 
                      userRole === "Admin" ? true : doc.department === userDepartment || doc.senderDepartment === userDepartment
                    );
                    const filteredArchived = filterDocumentsByDate(archivedDocuments).filter(doc => 
                      userRole === "Admin" ? true : doc.department === userDepartment || doc.senderDepartment === userDepartment
                    );
                    return filteredQueue.length + filteredReceived.length + filteredArchived.length;
                  })()
                } 
                label="All Time" 
              />
              <StatCard 
                icon="📤" 
                title="Sent Documents" 
                count={
                  (() => {
                    const filteredReceived = filterDocumentsByDate(receivedDocuments).filter(doc => 
                      userRole === "Admin" ? true : doc.department === userDepartment || doc.senderDepartment === userDepartment
                    );
                    const filteredArchived = filterDocumentsByDate(archivedDocuments).filter(doc => 
                      userRole === "Admin" ? true : doc.department === userDepartment || doc.senderDepartment === userDepartment
                    );
                    return filteredReceived.length + filteredArchived.length;
                  })()
                } 
                label="Total Sent" 
              />
              <StatCard 
                icon="📥" 
                title="Received Documents" 
                count={
                  filterDocumentsByDate(archivedDocuments).filter(doc => 
                    (userRole === "Admin" ? true : doc.department === userDepartment || doc.senderDepartment === userDepartment) &&
                    doc.status === "Received"
                  ).length
                } 
                label="Confirmed Received" 
              />
              <StatCard 
                icon="⏳" 
                title="Pending Documents" 
                count={
                  (() => {
                    const filteredQueue = filterDocumentsByDate(queueDocuments).filter(doc => 
                      userRole === "Admin" ? true : doc.department === userDepartment || doc.senderDepartment === userDepartment
                    );
                    const filteredReceived = filterDocumentsByDate(receivedDocuments).filter(doc => 
                      userRole === "Admin" ? true : doc.department === userDepartment || doc.senderDepartment === userDepartment
                    );
                    return filteredQueue.filter(doc => doc.status === "Waiting for Confirmation").length +
                           filteredReceived.filter(doc => doc.status === "Sent").length;
                  })()
                } 
                label="Awaiting Action" 
              />
            </div>

            {/* Document Status Breakdown */}
            <h4>Document Status Breakdown</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '30px' }}>
              {[
                { 
                  status: "In Queue (Waiting for Confirmation)", 
                  count: (() => {
                    const filteredQueue = filterDocumentsByDate(queueDocuments).filter(doc => 
                      userRole === "Admin" ? true : doc.department === userDepartment || doc.senderDepartment === userDepartment
                    );
                    return filteredQueue.filter(doc => doc.status === "Waiting for Confirmation").length;
                  })(), 
                  color: "#f59e0b" 
                },
                { 
                  status: "Sent (Awaiting Response)", 
                  count: (() => {
                    const filteredReceived = filterDocumentsByDate(receivedDocuments).filter(doc => 
                      userRole === "Admin" ? true : doc.department === userDepartment || doc.senderDepartment === userDepartment
                    );
                    const filteredArchived = filterDocumentsByDate(archivedDocuments).filter(doc => 
                      userRole === "Admin" ? true : doc.department === userDepartment || doc.senderDepartment === userDepartment
                    );
                    return filteredReceived.filter(doc => doc.status === "Sent").length + 
                           filteredArchived.filter(doc => doc.status === "Sent").length;
                  })(), 
                  color: "#3b82f6" 
                },
                { 
                  status: "Received", 
                  count: filterDocumentsByDate(archivedDocuments).filter(doc => 
                    (userRole === "Admin" ? true : doc.department === userDepartment || doc.senderDepartment === userDepartment) &&
                    doc.status === "Received"
                  ).length, 
                  color: "#10b981" 
                },
                { 
                  status: "Not Received", 
                  count: filterDocumentsByDate(archivedDocuments).filter(doc => 
                    (userRole === "Admin" ? true : doc.department === userDepartment || doc.senderDepartment === userDepartment) &&
                    doc.status === "Not Received"
                  ).length, 
                  color: "#ef4444" 
                },
                { 
                  status: "Not Sent", 
                  count: filterDocumentsByDate(archivedDocuments).filter(doc => 
                    (userRole === "Admin" ? true : doc.department === userDepartment || doc.senderDepartment === userDepartment) &&
                    doc.status === "Not Sent"
                  ).length, 
                  color: "#6b7280" 
                }
              ].map(({ status, count, color }) => (
                <div key={status} style={{
                  padding: '15px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ 
                      width: '12px', 
                      height: '12px', 
                      borderRadius: '50%', 
                      backgroundColor: color,
                      marginRight: '10px'
                    }}></div>
                    <span style={{ fontWeight: '600', color: '#374151' }}>{status}</span>
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>{count}</div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>documents</div>
                </div>
              ))}
            </div>

            {/* Department Statistics - Only show for Admin, hide for Department Heads */}
            {userRole === "Admin" && (
              <>
                <h4>Documents by Department</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
                  {departments.map(dept => {
                    const deptCount = 
                      filterDocumentsByDate(queueDocuments).filter(doc => doc.department === dept).length +
                      filterDocumentsByDate(receivedDocuments).filter(doc => doc.department === dept).length +
                      filterDocumentsByDate(archivedDocuments).filter(doc => doc.department === dept).length;
                    return (
                      <div key={dept} style={{
                        padding: '15px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        backgroundColor: 'white',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }}>
                        <div style={{ fontWeight: '600', color: '#374151', marginBottom: '5px' }}>{dept}</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}>{deptCount}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>documents</div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Document Type Statistics */}
            <h4>Documents by Type</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
              {documentTypes.map(type => {
                const typeCount = 
                  filterDocumentsByDate(queueDocuments).filter(doc => 
                    (userRole === "Admin" ? true : doc.department === userDepartment || doc.senderDepartment === userDepartment) &&
                    doc.documentType === type
                  ).length +
                  filterDocumentsByDate(receivedDocuments).filter(doc => 
                    (userRole === "Admin" ? true : doc.department === userDepartment || doc.senderDepartment === userDepartment) &&
                    doc.documentType === type
                  ).length +
                  filterDocumentsByDate(archivedDocuments).filter(doc => 
                    (userRole === "Admin" ? true : doc.department === userDepartment || doc.senderDepartment === userDepartment) &&
                    doc.documentType === type
                  ).length;
                return (
                  <div key={type} style={{
                    padding: '15px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ fontWeight: '600', color: '#374151', marginBottom: '5px' }}>{type}</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}>{typeCount}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>documents</div>
                  </div>
                );
              })}
            </div>

            {/* User Statistics */}
            <h3>User Statistics</h3>
            <div className="stats-container" style={{ marginBottom: '30px' }}>
              <StatCard 
                icon="👥" 
                title="Total Users" 
                count={
                  userRole === "Admin" ? users.length : users.filter(user => user.department === userDepartment).length
                } 
                label="Registered Users" 
              />
              <StatCard 
                icon="👑" 
                title="Administrators" 
                count={
                  userRole === "Admin" ? 
                    users.filter(user => user.role === "Admin").length : 
                    users.filter(user => user.role === "Admin" && user.department === userDepartment).length
                } 
                label="Admin Users" 
              />
              <StatCard 
                icon="🏢" 
                title="Department Heads" 
                count={
                  userRole === "Admin" ? 
                    users.filter(user => user.role === "Department Head").length : 
                    users.filter(user => user.role === "Department Head" && user.department === userDepartment).length
                } 
                label="Dept Heads" 
              />
              <StatCard 
                icon="👨‍💼" 
                title="Staff Members" 
                count={
                  userRole === "Admin" ? 
                    users.filter(user => user.role === "Staff").length : 
                    users.filter(user => user.role === "Staff" && user.department === userDepartment).length
                } 
                label="Staff Users" 
              />
              <StatCard 
                icon="🎓" 
                title="Working Students" 
                count={
                  userRole === "Admin" ? 
                    users.filter(user => user.role === "Working Student").length : 
                    users.filter(user => user.role === "Working Student" && user.department === userDepartment).length
                } 
                label="Student Users" 
              />
            </div>

            {/* Users by Department - Only show for Admin, hide for Department Heads */}
            {userRole === "Admin" && (
              <>
                <h4>Users by Department</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
                  {departments.map(dept => {
                    const deptUsers = users.filter(user => user.department === dept).length;
                    return (
                      <div key={dept} style={{
                        padding: '15px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        backgroundColor: 'white',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }}>
                        <div style={{ fontWeight: '600', color: '#374151', marginBottom: '5px' }}>{dept}</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}>{deptUsers}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>users</div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Recent Activity Summary */}
            <h3>Recent Activity Summary</h3>
            <div style={{ 
              padding: '20px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }}>
                    {(() => {
                      const today = new Date();
                      const todayStr = today.toISOString().split('T')[0];
                      const filteredDocs = queueDocuments.filter(doc => 
                        (userRole === "Admin" ? true : doc.department === userDepartment || doc.senderDepartment === userDepartment) &&
                        doc.dateSent?.startsWith(todayStr)
                      ).length +
                      receivedDocuments.filter(doc => 
                        (userRole === "Admin" ? true : doc.department === userDepartment || doc.senderDepartment === userDepartment) &&
                        doc.dateSent?.startsWith(todayStr)
                      ).length +
                      archivedDocuments.filter(doc => 
                        (userRole === "Admin" ? true : doc.department === userDepartment || doc.senderDepartment === userDepartment) &&
                        doc.dateSent?.startsWith(todayStr)
                      ).length;
                      return filteredDocs;
                    })()}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>Documents Today</div>
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }}>
                    {(() => {
                      const weekAgo = new Date();
                      weekAgo.setDate(weekAgo.getDate() - 7);
                      const weekAgoStr = weekAgo.toISOString().split('T')[0];
                      const filteredDocs = queueDocuments.filter(doc => 
                        (userRole === "Admin" ? true : doc.department === userDepartment || doc.senderDepartment === userDepartment) &&
                        doc.dateSent && doc.dateSent >= weekAgoStr
                      ).length +
                      receivedDocuments.filter(doc => 
                        (userRole === "Admin" ? true : doc.department === userDepartment || doc.senderDepartment === userDepartment) &&
                        doc.dateSent && doc.dateSent >= weekAgoStr
                      ).length +
                      archivedDocuments.filter(doc => 
                        (userRole === "Admin" ? true : doc.department === userDepartment || doc.senderDepartment === userDepartment) &&
                        doc.dateSent && doc.dateSent >= weekAgoStr
                      ).length;
                      return filteredDocs;
                    })()}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>Documents This Week</div>
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }}>
                    {(() => {
                      const monthAgo = new Date();
                      monthAgo.setMonth(monthAgo.getMonth() - 1);
                      const monthAgoStr = monthAgo.toISOString().split('T')[0];
                      const filteredDocs = queueDocuments.filter(doc => 
                        (userRole === "Admin" ? true : doc.department === userDepartment || doc.senderDepartment === userDepartment) &&
                        doc.dateSent && doc.dateSent >= monthAgoStr
                      ).length +
                      receivedDocuments.filter(doc => 
                        (userRole === "Admin" ? true : doc.department === userDepartment || doc.senderDepartment === userDepartment) &&
                        doc.dateSent && doc.dateSent >= monthAgoStr
                      ).length +
                      archivedDocuments.filter(doc => 
                        (userRole === "Admin" ? true : doc.department === userDepartment || doc.senderDepartment === userDepartment) &&
                        doc.dateSent && doc.dateSent >= monthAgoStr
                      ).length;
                      return filteredDocs;
                    })()}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>Documents This Month</div>
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }}>
                    {notificationsList.filter(n => !n.read).length}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>Unread Notifications</div>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeMenu === "settings" && userRole === "Admin" && (
          <section className="doc-list settings-section">
            <h2>Settings</h2>

            {/* Departments Management */}
            <h3>Manage Departments</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Add New Department</label>
                <input
                  type="text"
                  placeholder="Enter department name"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                />
              </div>
            </div>
            <button className="btn-primary" onClick={addDepartment}>
              Add Department
            </button>

            <h4>Current Departments</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
              {departments.map((dept) => (
                <div key={dept} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  backgroundColor: '#f9f9f9'
                }}>
                  <span>{dept}</span>
                  <button
                    onClick={() => removeDepartment(dept)}
                    style={{
                      padding: '3px 8px',
                      fontSize: '12px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {/* Document Types Management */}
            <h3>Manage Document Types</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Add New Document Type</label>
                <input
                  type="text"
                  placeholder="Enter document type"
                  value={newDocType}
                  onChange={(e) => setNewDocType(e.target.value)}
                />
              </div>
            </div>
            <button className="btn-primary" onClick={addDocumentType}>
              Add Document Type
            </button>

            <h4>Current Document Types</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
              {documentTypes.map((type) => (
                <div key={type} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  backgroundColor: '#f9f9f9'
                }}>
                  <span>{type}</span>
                  <button
                    onClick={() => removeDocumentType(type)}
                    style={{
                      padding: '3px 8px',
                      fontSize: '12px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Inbox Status Update Modal */}
      {showInboxModal && selectedInboxDocument && (
        <div className="modal-overlay" onClick={() => setShowInboxModal(false)}>
          <div className="modal-content status-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: selectedInboxDocument.fileName ? '900px' : '600px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <div className="modal-header-content">
                <div className="modal-icon">📬</div>
                <div>
                  <h3>Update Document Status</h3>
                  <div className="document-quick-info">
                    <span className="doc-id">ID: {selectedInboxDocument.id}</span>
                    <span className={`status-badge status-${selectedInboxDocument.status.toLowerCase().split(" ")[0]}`}>
                      {selectedInboxDocument.status}
                    </span>
                  </div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowInboxModal(false)}>×</button>
            </div>
            
            <div className="modal-body" style={{ maxHeight: 'calc(90vh - 80px)', overflowY: 'auto' }}>
              <div className="document-info-container">
                <div className="document-details-grid">
                  <div className="detail-item">
                    <label className="detail-label">Title</label>
                    <span className="detail-value">{selectedInboxDocument.title}</span>
                  </div>
                  <div className="detail-item">
                    <label className="detail-label">Sender</label>
                    <span className="detail-value">{selectedInboxDocument.sender}</span>
                  </div>
                  <div className="detail-item">
                    <label className="detail-label">Department</label>
                    <span className="detail-value">{selectedInboxDocument.senderDepartment || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label className="detail-label">Type</label>
                    <span className="detail-value">{selectedInboxDocument.documentType || '-'}</span>
                  </div>
                </div>
              </div>
              
              <div className={`attachment-info ${!selectedInboxDocument.fileName ? 'no-attachment' : ''}`}>
                <div className="attachment-header">
                  <span className="attachment-icon">{selectedInboxDocument.fileName ? '📎' : '📄'}</span>
                  <span className="attachment-label">Attachment</span>
                </div>
                <div className="attachment-details">
                  {selectedInboxDocument.fileName ? (
                    <span className="file-name">{selectedInboxDocument.fileName}</span>
                  ) : (
                    <span className="no-attachment-text">No attachment</span>
                  )}
                </div>
              </div>

              {selectedInboxDocument.fileName && (() => {
                const fileName = selectedInboxDocument.fileName;
                const fileExtension = fileName.split('.').pop().toLowerCase();
                const fileUrl = `${SERVER_URL}/uploads/${fileName}`;
                const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
                const isPDF = fileExtension === 'pdf';
                const isWord = ['doc', 'docx'].includes(fileExtension);
                const isImage = imageTypes.includes(fileExtension);

                if (!isImage && !isPDF && !isWord) return null;

                return (
                  <div className="file-preview-container" style={{
                    marginTop: '20px',
                    padding: '15px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ marginBottom: '10px', fontWeight: '500', textAlign: 'left' }}>
                      {isImage && 'Image Preview:'}
                      {isPDF && 'PDF Preview:'}
                      {isWord && 'Document Preview:'}
                    </div>
                    {isImage && (
                      <img 
                        src={fileUrl}
                        alt="Preview" 
                        style={{
                          maxWidth: '100%',
                          maxHeight: '500px',
                          objectFit: 'contain',
                          borderRadius: '4px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const container = e.target.parentElement;
                          const errorMsg = document.createElement('p');
                          errorMsg.style.cssText = 'color: #999; padding: 20px;';
                          errorMsg.textContent = 'Unable to load image preview';
                          container.appendChild(errorMsg);
                        }}
                      />
                    )}
                    {isPDF && (
                      <iframe
                        src={fileUrl}
                        style={{
                          width: '100%',
                          height: '500px',
                          border: 'none',
                          borderRadius: '4px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                        title="PDF Preview"
                      />
                    )}
                    {isWord && (
                      <div style={{ padding: '20px', textAlign: 'center' }}>
                        <p style={{ color: '#666', marginBottom: '15px' }}>Word documents cannot be previewed directly in the browser.</p>
                        <a 
                          href={fileUrl}
                          download
                          className="btn-primary"
                          style={{
                            display: 'inline-block',
                            padding: '10px 20px',
                            backgroundColor: '#0066cc',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: '4px'
                          }}
                        >
                          📥 Download to View
                        </a>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="status-update-section">
                <h4 className="section-title">Update Status</h4>
                <div className="status-radio-group">
                  <label className="status-radio-option">
                    <input
                      type="radio"
                      name="inbox-status"
                      value="Not Received"
                      checked={selectedInboxDocument.status === "Not Received"}
                      onChange={(e) => {
                        const updatedDoc = { ...selectedInboxDocument, status: e.target.value };
                        setSelectedInboxDocument(updatedDoc);
                      }}
                    />
                    <span className="radio-checkmark"></span>
                    <div className="radio-content">
                      <span className="radio-label">Not Received</span>
                      <span className="radio-desc">Mark as not received</span>
                    </div>
                  </label>
                  
                  <label className="status-radio-option">
                    <input
                      type="radio"
                      name="inbox-status"
                      value="Received"
                      checked={selectedInboxDocument.status === "Received"}
                      onChange={(e) => {
                        const updatedDoc = { ...selectedInboxDocument, status: e.target.value };
                        setSelectedInboxDocument(updatedDoc);
                      }}
                    />
                    <span className="radio-checkmark"></span>
                    <div className="radio-content">
                      <span className="radio-label">Received</span>
                      <span className="radio-desc">Confirm receipt</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn-secondary modal-cancel-btn" 
                onClick={() => {
                  setShowInboxModal(false);
                  setSelectedInboxDocument(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="btn-primary modal-update-btn" 
                onClick={() => {
                  updateReceivedStatus(selectedInboxDocument.id, selectedInboxDocument.status);
                  setShowInboxModal(false);
                  setSelectedInboxDocument(null);
                }}
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Outgoing Document Details Modal */}
      {showOutgoingModal && selectedOutgoingDocument && (
        <div className="modal-overlay" onClick={() => {
          setShowOutgoingModal(false);
          setTempOutgoingStatus(null);
        }}>
          <div className="modal-content status-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: selectedOutgoingDocument.fileName ? '900px' : '600px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <div className="modal-header-content">
                <div className="modal-icon">📤</div>
                <div>
                  <h3>Document Details</h3>
                  <div className="document-quick-info">
                    <span className="doc-id">ID: {selectedOutgoingDocument.id}</span>
                    <span className={`status-badge status-${selectedOutgoingDocument.status.toLowerCase().split(" ")[0]}`}>
                      {selectedOutgoingDocument.status}
                    </span>
                  </div>
                </div>
              </div>
              <button className="modal-close" onClick={() => {
                setShowOutgoingModal(false);
                setOutgoingImagePreview(null);
                setTempOutgoingStatus(null);
              }}>×</button>
            </div>
            
            <div className="modal-body" style={{ maxHeight: 'calc(90vh - 80px)', overflowY: 'auto' }}>
              <div className="document-info-container">
                <div className="document-details-grid">
                  <div className="detail-item">
                    <label className="detail-label">Title</label>
                    <span className="detail-value">{selectedOutgoingDocument.title}</span>
                  </div>
                  <div className="detail-item">
                    <label className="detail-label">Recipient</label>
                    <span className="detail-value">{selectedOutgoingDocument.recipient || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label className="detail-label">Department</label>
                    <span className="detail-value">{selectedOutgoingDocument.department}</span>
                  </div>
                  <div className="detail-item">
                    <label className="detail-label">Type</label>
                    <span className="detail-value">{selectedOutgoingDocument.documentType || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label className="detail-label">Sender</label>
                    <span className="detail-value">{selectedOutgoingDocument.sender}</span>
                  </div>
                  <div className="detail-item">
                    <label className="detail-label">Sender Department</label>
                    <span className="detail-value">{selectedOutgoingDocument.senderDepartment || '-'}</span>
                  </div>
                </div>
              </div>
              
              <div className={`attachment-info ${!selectedOutgoingDocument.fileName ? 'no-attachment' : ''}`}>
                <div className="attachment-header">
                  <span className="attachment-icon">{selectedOutgoingDocument.fileName ? '📎' : '📄'}</span>
                  <span className="attachment-label">Attachment</span>
                </div>
                <div className="attachment-details">
                  {selectedOutgoingDocument.fileName ? (
                    <span className="file-name">{selectedOutgoingDocument.fileName}</span>
                  ) : (
                    <span className="no-attachment-text">No attachment</span>
                  )}
                </div>
              </div>

              {selectedOutgoingDocument.fileName && (() => {
                const fileName = selectedOutgoingDocument.fileName;
                const fileExtension = fileName.split('.').pop().toLowerCase();
                const fileUrl = `${SERVER_URL}/uploads/${fileName}`;
                const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
                const isPDF = fileExtension === 'pdf';
                const isWord = ['doc', 'docx'].includes(fileExtension);
                const isImage = imageTypes.includes(fileExtension);

                if (!isImage && !isPDF && !isWord) return null;

                return (
                  <div className="file-preview-container" style={{
                    marginTop: '20px',
                    padding: '15px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ marginBottom: '10px', fontWeight: '500', textAlign: 'left' }}>
                      {isImage && 'Image Preview:'}
                      {isPDF && 'PDF Preview:'}
                      {isWord && 'Document Preview:'}
                    </div>
                    {isImage && (
                      <img 
                        src={fileUrl}
                        alt="Preview" 
                        style={{
                          maxWidth: '100%',
                          maxHeight: '500px',
                          objectFit: 'contain',
                          borderRadius: '4px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const container = e.target.parentElement;
                          const errorMsg = document.createElement('p');
                          errorMsg.style.cssText = 'color: #999; padding: 20px;';
                          errorMsg.textContent = 'Unable to load image preview';
                          container.appendChild(errorMsg);
                        }}
                      />
                    )}
                    {isPDF && (
                      <iframe
                        src={fileUrl}
                        style={{
                          width: '100%',
                          height: '500px',
                          border: 'none',
                          borderRadius: '4px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                        title="PDF Preview"
                      />
                    )}
                    {isWord && (
                      <div style={{ padding: '20px', textAlign: 'center' }}>
                        <p style={{ color: '#666', marginBottom: '15px' }}>Word documents cannot be previewed directly in the browser.</p>
                        <a 
                          href={fileUrl}
                          download
                          className="btn-primary"
                          style={{
                            display: 'inline-block',
                            padding: '10px 20px',
                            backgroundColor: '#0066cc',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: '4px'
                          }}
                        >
                          📥 Download to View
                        </a>
                      </div>
                    )}
                  </div>
                );
              })()}

              {selectedOutgoingDocument.status === "Waiting for Confirmation" && (
                <div className="status-update-section">
                  <h4 className="section-title">Update Status</h4>
                  <div className="status-radio-group">
                    <label className="status-radio-option">
                      <input
                        type="radio"
                        name="outgoing-status"
                        value="Not Sent"
                        checked={tempOutgoingStatus === "Not Sent"}
                        onChange={(e) => {
                          setTempOutgoingStatus(e.target.value);
                        }}
                      />
                      <span className="radio-checkmark"></span>
                      <div className="radio-content">
                        <span className="radio-label">Not Sent</span>
                        <span className="radio-desc">Cancel sending</span>
                      </div>
                    </label>
                    
                    <label className="status-radio-option">
                      <input
                        type="radio"
                        name="outgoing-status"
                        value="Sent"
                        checked={tempOutgoingStatus === "Sent"}
                        onChange={(e) => {
                          setTempOutgoingStatus(e.target.value);
                        }}
                      />
                      <span className="radio-checkmark"></span>
                      <div className="radio-content">
                        <span className="radio-label">Sent</span>
                        <span className="radio-desc">Mark as sent</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              {selectedOutgoingDocument.status === "Waiting for Confirmation" ? (
                <>
                  <button 
                    className="btn-secondary modal-cancel-btn" 
                    onClick={() => {
                      setShowOutgoingModal(false);
                      setSelectedOutgoingDocument(null);
                      setTempOutgoingStatus(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn-primary modal-update-btn" 
                    onClick={() => {
                      updateQueueStatus(selectedOutgoingDocument.id, tempOutgoingStatus);
                      setShowOutgoingModal(false);
                      setSelectedOutgoingDocument(null);
                      setTempOutgoingStatus(null);
                    }}
                  >
                    Update Status
                  </button>
                </>
              ) : (
                <>
                  <button 
                    className="btn-secondary modal-cancel-btn" 
                    onClick={() => {
                      setShowOutgoingModal(false);
                      setSelectedOutgoingDocument(null);
                      setTempOutgoingStatus(null);
                    }}
                  >
                    Close
                  </button>
                  <button 
                    className="btn-primary modal-update-btn" 
                    onClick={() => {
                      addFollowUpNotification(selectedOutgoingDocument);
                      alert(`Follow-up notification sent to ${selectedOutgoingDocument.department} department for document: "${selectedOutgoingDocument.title}"`);
                      setShowOutgoingModal(false);
                      setSelectedOutgoingDocument(null);
                      setTempOutgoingStatus(null);
                    }}
                    style={{ backgroundColor: '#f59e0b', borderColor: '#f59e0b' }}
                  >
                    Follow Up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable Components
const StatCard = ({ icon, title, count, label }) => (
  <div className="stat-card">
    <div className="stat-icon">{icon}</div>
    <div className="stat-info">
      <h3>{title}</h3>
      <p className="stat-number">{count}</p>
      <span className="stat-label">{label}</span>
    </div>
  </div>
);

const FormInput = ({ label, value, onChange, placeholder, required }) => (
  <div className="form-group">
    <label>{label}</label>
    <input type="text" placeholder={placeholder} value={value} onChange={onChange} required={required} />
  </div>
);

const FormSelect = ({ label, value, onChange, options, placeholder }) => (
  <div className="form-group">
    <label>{label}</label>
    <select value={value} onChange={onChange}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt === "HR" ? "Human Resources" : opt === "Admin" ? "Administration" : opt}
        </option>
      ))}
    </select>
  </div>
);

const MultiSelectDropdown = ({ options, selected, onChange, placeholder, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside both the container and the dropdown
      if (containerRef.current && !containerRef.current.contains(event.target) &&
          dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const toggleDropdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
    setIsOpen(!isOpen);
  };

  const handleCheckboxChange = (e, option) => {
    e.stopPropagation();
    const newSelected = selected.includes(option)
      ? selected.filter(s => s !== option)
      : [...selected, option];
    onChange(newSelected);
  };

  const displayText = selected.length > 0
    ? selected.length === 1
      ? selected[0]
      : `${selected.length} selected`
    : placeholder;

  return (
    <div className="filter-group">
      <label>{label}</label>
      <div className="multi-select-container" ref={containerRef}>
        <button
          ref={buttonRef}
          type="button"
          onClick={toggleDropdown}
          className="multi-select-button"
        >
          <span>{displayText}</span>
          <span style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
        </button>
        {isOpen && createPortal(
          <div 
            ref={dropdownRef}
            className="multi-select-dropdown"
            style={{
              position: 'fixed',
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              zIndex: 99999
            }}
          >
            {options.map((option) => (
              <label key={option} onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={(e) => handleCheckboxChange(e, option)}
                />
                {option === "HR" ? "Human Resources" : option === "Admin" ? "Administration" : option}
              </label>
            ))}
          </div>,
          document.body
        )}
      </div>
    </div>
  );
};
const SearchAndFilter = ({
  searchQuery,
  setSearchQuery,
  selectedDepartments,
  setSelectedDepartments,
  selectedStatuses,
  setSelectedStatuses,
  departments,
  selectedDocumentTypes,
  setSelectedDocumentTypes,
  documentTypes,
  sortOrder,
  setSortOrder,
  showDepartmentFilter = true,
}) => (
  <div className="search-filter-container">
    <div className="search-box">
      <input
        type="text"
        placeholder="Search by ID, title, sender, recipient, sender dept, updater, date, department..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="search-input"
      />
    </div>
    <div className="filter-box">
      {showDepartmentFilter && (
        <MultiSelectDropdown
          options={departments}
          selected={selectedDepartments}
          onChange={setSelectedDepartments}
          placeholder="All Departments"
          label="Departments:"
        />
      )}
      <MultiSelectDropdown
        options={["Received", "Not Received", "Not Sent"]}
        selected={selectedStatuses}
        onChange={setSelectedStatuses}
        placeholder="All Statuses"
        label="Status:"
      />
      <MultiSelectDropdown
        options={documentTypes}
        selected={selectedDocumentTypes}
        onChange={setSelectedDocumentTypes}
        placeholder="All Document Types"
        label="Document Types:"
      />
      {sortOrder !== undefined && setSortOrder && (
        <div className="filter-group">
          <label>Sort Order:</label>
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="filter-select">
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      )}
    </div>
  </div>
);

export default App;
