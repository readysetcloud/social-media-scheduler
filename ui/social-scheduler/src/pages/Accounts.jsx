import React, { useState, useEffect } from 'react';
import { get } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import Modal from '../components/Modal';
import './Accounts.css';

const Accounts = ({ user }) => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false); // Initially closed

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.accessToken;
        if (!token) return;

        const response = await get({
          apiName: 'user',
          path: '/accounts',
          options: { withCredentials: true, headers: { Authorization: token } }
        });

        setAccounts(response.accounts);
      } catch (err) {
        console.error('Error fetching accounts:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, []);

  if (loading) return <p className="loading-message">Loading accounts...</p>;
  if (error) return <p className="error-message">Error loading accounts: {error.message}</p>;

  return (
    <div className="accounts-container">
      <div className="sidebar">
        <h2 className="sidebar-title">Accounts</h2>
        <ul className="account-list">
          {accounts?.map((account, index) => (
            <li key={index} className="account-item">
              {account.name}
            </li>
          ))}
          <li className="account-item add-account-item" onClick={openModal}>
            + Add Account
          </li>
        </ul>
      </div>

      <div className="main-content">
        <h1 className="welcome-message">Welcome, {user?.username || 'User'}!</h1>
        <p className="select-message">Select an account from the left to view details.</p>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <h2>New Account</h2>
        <p>Enter the details for a new account.</p>
        <button onClick={closeModal}>Close</button>
      </Modal>
    </div>
  );
};

export default Accounts;
