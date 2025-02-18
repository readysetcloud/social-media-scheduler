import React from 'react';

const Accounts = ({ user }) => {
  return (
    <div>
      <h2>Accounts</h2>
      <p>Welcome, {user?.username || 'User'}! This is the Accounts page.</p>
    </div>
  );
};

export default Accounts;
