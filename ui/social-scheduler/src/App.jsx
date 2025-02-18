import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import Home from './pages/Home';
import Accounts from './pages/Accounts';
import Schedule from './pages/Schedule';
import Settings from './pages/Settings';

function App({ user }) {
  const [isNavExpanded, setIsNavExpanded] = useState(false);
  const toggleNav = () => setIsNavExpanded(prev => !prev);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Layout
              toggleNav={toggleNav}
              isNavExpanded={isNavExpanded}
              user={user}
            />
          }
        >
          <Route index element={<Home user={user} />} />
          <Route path="accounts" element={<Accounts user={user} />} />
          <Route path="schedule" element={<Schedule user={user} />} />
          <Route path="settings" element={<Settings user={user} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
