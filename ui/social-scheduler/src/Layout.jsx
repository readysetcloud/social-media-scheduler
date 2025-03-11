import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { FaBars, FaHome, FaUser, FaCalendarAlt, FaCog, FaSignOutAlt, FaRegBell } from 'react-icons/fa';
import { fetchAuthSession } from 'aws-amplify/auth';
import { CredentialProvider, TopicClient } from '@gomomento/sdk-web';
import { get, post, del } from 'aws-amplify/api';
import { signOut } from 'aws-amplify/auth';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import './Layout.css';

function Layout({ toggleNav, isNavExpanded }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [token, setToken] = useState(null);
  const [topics, setTopics] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const unreadRef = useRef(unreadCount);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        const session = await fetchAuthSession();
        const accessToken = session.tokens?.accessToken;
        if (!accessToken) return;

        setToken(accessToken);
        setUserId(session.userSub);

        const request = await get({
          apiName: 'user',
          path: '/notifications/unread',
          options: { withCredentials: true, headers: { Authorization: accessToken } }
        });

        const response = await request.response;
        if (response.statusCode === 200) {
          const body = await response.body.json();
          setUnreadCount(body.count);
          unreadRef.current = body.count;
        }

        setTopics(new TopicClient({ credentialProvider: CredentialProvider.fromString(session.tokens.idToken.payload.momento) }));
      } catch (error) {
        console.error('Error fetching unread notifications:', error);
      }
    };

    initialize();
  }, []);

  useEffect(() => {
    const subscribe = async () => {
      const sub = await topics.subscribe(import.meta.env.VITE_cacheName, userId, {
        onItem: (item) => handleTopicMessage(JSON.parse(item.value())),
        onError: (error) => console.error(error)
      });

      setSubscription(sub);
    };

    if (!topics || !token || !userId) return;

    subscribe();
  }, [topics, token, userId]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleTopicMessage = (message) => {
    switch (message.type) {
      case 'New Notification':
        setUnreadCount(message.count);
        unreadRef.current = message.count;
        break;
      default:
        console.warn(`Unsupported message type "${message.type}" received.`);
        break;
    }
  };

  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const request = await get({
        apiName: 'user',
        path: '/notifications',
        options: { withCredentials: true, headers: { Authorization: token } }
      });

      const response = await request.response;
      if (response.statusCode === 200) {
        const body = await response.body.json();
        setNotifications(body.notifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const toggleDropdown = async () => {
    if (!showDropdown) {
      fetchNotifications();
    }
    setShowDropdown(!showDropdown);
  };

  const handleNotificationClick = async (notificationId, follow) => {
    const request = await post({
      apiName: 'user',
      path: `/notifications/${notificationId}/read`,
      options: {
        withCredentials: true,
        headers: { Authorization: token },
        body: { follow }
      }
    });

    const response = await request.response;
    if (response.statusCode === 200) {
      const { redirectUrl, isExternal } = await response.body.json();
      if (isExternal) {
        window.open(redirectUrl, '_blank', 'noopener,noreferrer');
      } else {
        window.location = redirectUrl;
      }
    }

    if (response.statusCode != 500) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, isUnread: false } : n
        )
      );

      setUnreadCount((prev) => Math.max(prev - 1, 0));
      unreadRef.current = Math.max(unreadRef.current - 1, 0);
    }
  };

  const handleDismissNotification = async (notificationId) => {
    try {
      await del({
        apiName: 'user',
        path: `/notifications/${notificationId}`,
        options: {
          withCredentials: true,
          headers: { Authorization: token }
        }
      });

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
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
            <div className="notification-dropdown" ref={dropdownRef}>
              {loadingNotifications ? (
                <div className="notification-skeleton">
                  <Skeleton height={12} width="100%" />
                  <div className="notification-skeleton-actions">
                    <Skeleton height={12} containerClassName='skeleton-flex' inline={true} />
                    <Skeleton height={12} containerClassName='skeleton-flex' inline={true} />
                  </div>
                </div>
              ) : notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div key={notification.id} className={`notification-item ${notification.isUnread ? 'unread' : ''}`} onClick={() => handleNotificationClick(notification.id, true)}>
                    <div className="notification-text">{notification.message}</div>
                    <div className="notification-actions">
                      {notification.isUnread ? (
                        <>
                          <span
                            className="notification-link mark-read"
                            onClick={() => handleNotificationClick(notification.id, false)}
                          >
                            Mark as read
                          </span>
                        </>
                      ) : (<span />)}
                      <span
                        className="notification-link dismiss"
                        onClick={() => handleDismissNotification(notification.id)}
                      >
                        Dismiss
                      </span>
                    </div>
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
