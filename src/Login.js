import React, { useState } from 'react';
import './Login.css';

const DEFAULT_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const DEFAULT_SERVER_URL = process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace('/api', '') : 'http://localhost:3001';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverIP, setServerIP] = useState('');
  const [configuredAPI, setConfiguredAPI] = useState('');
  
  // Get current API URL (from localStorage or default)
  const getAPIUrl = () => {
    const saved = localStorage.getItem('serverAPIUrl');
    return saved || DEFAULT_API_URL;
  };
  
  const getServerUrl = () => {
    const saved = localStorage.getItem('serverAPIUrl');
    return saved ? saved.replace('/api', '') : DEFAULT_SERVER_URL;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${getAPIUrl()}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (data.success) {
        if (rememberMe) {
          localStorage.setItem('rememberedUsername', username);
        } else {
          localStorage.removeItem('rememberedUsername');
        }
        onLogin(true, data.user.username, data.user.role, data.user.department);
        setError('');
      } else {
        setError('Invalid username or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Failed to connect to server. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load remembered username on component mount
  React.useEffect(() => {
    const rememberedUsername = localStorage.getItem('rememberedUsername');
    if (rememberedUsername) {
      setUsername(rememberedUsername);
      setRememberMe(true);
    }
    
    // Load configured server
    const savedAPI = localStorage.getItem('serverAPIUrl');
    if (savedAPI) {
      setConfiguredAPI(savedAPI);
      const ip = savedAPI.replace('http://', '').replace(':3001/api', '');
      setServerIP(ip);
    }
  }, []);
  
  const handleServerConfig = () => {
    setShowServerConfig(true);
    if (!serverIP) {
      // Pre-fill with default
      const defaultIP = DEFAULT_API_URL.replace('http://', '').replace(':3001/api', '');
      setServerIP(defaultIP);
    }
  };
  
  const saveServerConfig = () => {
    if (!serverIP.trim()) {
      alert('Please enter a server IP address');
      return;
    }
    
    // Build the API URL
    const newAPIUrl = `http://${serverIP.trim()}:3001/api`;
    localStorage.setItem('serverAPIUrl', newAPIUrl);
    setConfiguredAPI(newAPIUrl);
    setShowServerConfig(false);
    alert(`Server configured!\n\nConnecting to: ${serverIP.trim()}\n\nYou can now login.`);
  };
  
  const useDefaultServer = () => {
    localStorage.removeItem('serverAPIUrl');
    setConfiguredAPI('');
    const defaultIP = DEFAULT_API_URL.replace('http://', '').replace(':3001/api', '');
    setServerIP(defaultIP);
    setShowServerConfig(false);
    alert(`Using default server: ${defaultIP}`);
  };

  return (
    <div className="login-container">
      <div className="login-background">
      </div>

      {/* Server Configuration Modal */}
      {showServerConfig && (
        <div className="modal-overlay" onClick={() => setShowServerConfig(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>🔧 Server Configuration</h2>
            <p style={{ marginBottom: '20px', color: '#666' }}>
              Enter the IP address of the PC running the server
            </p>
            
            <div className="form-field">
              <label htmlFor="serverIP">
                <span className="field-icon">🌐</span>
                Server IP Address
              </label>
              <div className="input-wrapper">
                <input
                  type="text"
                  id="serverIP"
                  placeholder="e.g., 192.168.0.101 or localhost"
                  value={serverIP}
                  onChange={(e) => setServerIP(e.target.value)}
                  autoFocus
                />
              </div>
              <small style={{ display: 'block', marginTop: '5px', color: '#888' }}>
                Find this by running 'ipconfig' on the server PC
              </small>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button 
                type="button"
                className="login-btn" 
                onClick={saveServerConfig}
                style={{ flex: 1 }}
              >
                Save & Connect
              </button>
              <button 
                type="button"
                className="import-db-btn" 
                onClick={useDefaultServer}
                style={{ flex: 1 }}
              >
                🔄 Use Default
              </button>
            </div>
            
            <button 
              type="button"
              onClick={() => setShowServerConfig(false)}
              style={{ 
                marginTop: '10px', 
                width: '100%',
                padding: '10px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#999'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="login-box">
        <div className="login-header">
          <div className="logo-container">
            <div className="logo-icon">📄</div>
          </div>
          <h1>Document Management System</h1>
          
          {/* Server Status Indicator */}
          <div style={{ 
            marginTop: '10px', 
            padding: '8px 12px', 
            background: '#f0f9ff',
            border: '1px solid #bfdbfe',
            borderRadius: '6px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>
              🌐 <strong>Server:</strong> {configuredAPI ? configuredAPI.replace('http://', '').replace(':3001/api', '') : 'Default'}
            </span>
            <button 
              type="button"
              onClick={handleServerConfig}
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '4px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Configure
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-field">
            <label htmlFor="username">
              <span className="field-icon">👤</span>
              Username
            </label>
            <div className="input-wrapper">
              <input
                type="text"
                id="username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="password">
              <span className="field-icon">🔒</span>
              Password
            </label>
            <div className="input-wrapper">
              <input
                type="password"
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-options">
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <button type="submit" className={`login-btn ${isLoading ? 'loading' : ''}`} disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Signing In...
              </>
            ) : (
              <>
                Sign In
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
