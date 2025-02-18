import React from 'react';

const Schedule = ({ user }) => {
  return (
    <div>
      <h2>Schedule</h2>
      <p>Welcome, {user?.username || 'User'}! This is the Schedule page.</p>
    </div>
  );
};

export default Schedule;
