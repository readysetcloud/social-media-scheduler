import React from 'react';

const Settings = ({ user }) => {
  return (
    <div>
      <h2>Settings</h2>
      <p>Welcome, {user?.username || 'User'}! This is the Settings page.</p>
    </div>
  );
};

export default Settings;
