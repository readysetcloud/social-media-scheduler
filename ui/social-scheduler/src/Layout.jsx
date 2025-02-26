import React, { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { FaBars, FaHome, FaUser, FaCalendarAlt, FaCog, FaSignOutAlt, FaRegBell } from 'react-icons/fa';
import { fetchAuthSession } from 'aws-amplify/auth';
import { get } from 'aws-amplify/api';
import { signOut } from 'aws-amplify/auth';
import './Layout.css';

function Layout({ toggleNav, isNavExpanded }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const session = await fetchAuthSession();
        const accessToken = session.tokens?.accessToken;
        if (!accessToken) return;

        setToken(accessToken);
        const request = await get({
          apiName: 'user',
          path: '/notifications/unread',
          options: { withCredentials: true, headers: { Authorization: accessToken } }
        });

        const response = await request.response;
        if (response.statusCode == 200) {
          const body = await response.body.json();
          setUnreadCount(body.count);
        }

      } catch (error) {
        console.error('Error fetching unread notifications:', error);
      }
    };
    fetchUnreadCount();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/notifications');
      const data = await response.json();
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const toggleDropdown = async () => {
    if (!showDropdown) {
      await fetchNotifications();
    }
    setShowDropdown(!showDropdown);
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="app-container">
      <header className="title-bar">
        <button className="nav-toggle" onClick={toggleNav}>
          <FaBars />
        </button>
        <h1>Social Butterfly</h1>
        <div className="notification-wrapper">
          <button className="notification-icon" onClick={toggleDropdown}>
            <FaRegBell />
            {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
          </button>
          {showDropdown && (
            <div className="notification-dropdown">
              {notifications.length > 0 ? (
                notifications.map((notification, index) => (
                  <div key={index} className="notification-item">
                    {notification.message}
                  </div>
                ))
              ) : (
                <div className="notification-item">No new notifications</div>
              )}
            </div>
          )}
        </div>
      </header>
      <nav className={`side-nav ${isNavExpanded ? 'expanded' : 'collapsed'}`}>
        <ul>
          <li>
            <NavLink to="/" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              <FaHome className="nav-icon" />
              <span className="nav-text">Home</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/accounts" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              <FaUser className="nav-icon" />
              <span className="nav-text">Accounts</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/schedule" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              <FaCalendarAlt className="nav-icon" />
              <span className="nav-text">Schedule</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/settings" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
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
