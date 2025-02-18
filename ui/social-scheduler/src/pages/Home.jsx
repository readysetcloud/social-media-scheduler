import React from 'react';

const Home = ({ user }) => {
  return (
    <div>
      <h2>Home</h2>
      <p>Welcome, {user?.username || 'User'}! This is your home page.</p>
    </div>
  );
};

export default Home;
