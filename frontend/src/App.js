import React from 'react';
import SmartLocationDashboard from './components/SmartLocationDashboard';
import './App.css';

function App() {
  return (
    <div className="app-container" style={{ 
      background: '#f5f7fa', 
      minHeight: '100vh', 
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    }}>
      <SmartLocationDashboard />
    </div>
  );
}

export default App;
