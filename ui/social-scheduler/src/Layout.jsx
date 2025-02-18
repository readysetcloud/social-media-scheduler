// Layout.jsx
import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { FaBars, FaHome, FaUser, FaCalendarAlt, FaCog, FaSignOutAlt } from 'react-icons/fa';
import { signOut } from 'aws-amplify/auth';
import './Layout.css';

function Layout({ toggleNav, isNavExpanded }) {
  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="app-container">
      <header className="title-bar">
        <button className="nav-toggle" onClick={toggleNav}>
          <FaBars />
        </button>
        <h1>Social Butterfly</h1>
      </header>
      <nav className={`side-nav ${isNavExpanded ? 'expanded' : 'collapsed'}`}>
        <ul>
          <li>
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              <FaHome className="nav-icon" />
              <span className="nav-text">Home</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/accounts"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              <FaUser className="nav-icon" />
              <span className="nav-text">Accounts</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/schedule"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              <FaCalendarAlt className="nav-icon" />
              <span className="nav-text">Schedule</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              <FaCog className="nav-icon" />
              <span className="nav-text">Settings</span>
            </NavLink>
          </li>
        </ul>
        <button className="logout-button" onClick={handleLogout}>
          <FaSignOutAlt className="nav-icon" />
          <span className="nav-text">Logout</span>
        </button>
      </nav>
      <main className={`content-area ${isNavExpanded ? 'expanded' : 'collapsed'}`}>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
