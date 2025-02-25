import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { get, del, put } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import Modal from '../components/Modal';
import AddSocial from '../components/AddSocial';
import './Accounts.css';
import socialIcons from '../utils/socialIcons';

const Accounts = ({ user }) => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [name, setName] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [token, setToken] = useState(null);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const session = await fetchAuthSession();
        const accessToken = session.tokens?.accessToken;
        if (!accessToken) return;

        setToken(accessToken);
        const request = await get({
          apiName: 'user',
          path: '/accounts',
          options: { withCredentials: true, headers: { Authorization: accessToken } }
        });

        const response = await request.response;
        if (response.statusCode == 200) {
          const body = await response.body.json();
          setAccounts(body.accounts);

          const params = new URLSearchParams(location.search);
          const selectedId = params.get('selected');

          if (selectedId) {
            const foundAccount = body.accounts.find(acc => acc.id === selectedId);
            if (foundAccount) {
              loadAccount(foundAccount.id, accessToken);
            }
          }
        }
        else {
          console.warn('Failed to load accounts');
        }
      } catch (err) {
        console.error('Error fetching accounts:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [location.search]);

  const loadAccount = async (accountId, accessToken) => {
    const request = await get({
      apiName: 'user',
      path: `/accounts/${accountId}`,
      options: { withCredentials: true, headers: { Authorization: accessToken ?? token } }
    });

    const response = await request.response;
    if (response.statusCode == 200) {
      const body = await response.body.json();
      setSelectedAccount(body);
    }
  };

  const handleAccountClick = async (account) => {
    setTestMessage('');
    navigate(`?selected=${account.id}`, { replace: true });

    loadAccount(account.id);
  };

  const handleSendTestMessage = () => {
    console.log(`Test message for ${selectedAccount.name}:`, testMessage);
    alert(`Test message sent: ${testMessage}`);
  };

  const handleDeleteAccount = async (accountId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this account?");
    if (!confirmDelete) return;

    try {
      const request = await del({
        apiName: 'user',
        path: `/accounts/${accountId}`,
        options: { withCredentials: true, headers: { Authorization: token } }
      });

      const response = await request.response;
      if (response.statusCode === 204) {
        setAccounts(accounts.filter(account => account.id !== accountId));
        setSelectedAccount(null);
        navigate("?");
      } else {
        console.warn('Failed to delete account');
      }
    } catch (err) {
      console.error('Error deleting account:', err);
    }
  };

  const handleUpdateAccount = async () => {
    if (!selectedAccount) return;

    try {
      const request = await put({
        apiName: "user",
        path: `/accounts/${selectedAccount.id}`,
        options: {
          withCredentials: true,
          headers: {
            Authorization: token,
            "Content-Type": "application/json"
          },
          body: {
            name: selectedAccount.name
          }
        }
      });

      const response = await request.response;

      if (response.statusCode === 204) {
        setAccounts((prevAccounts) =>
          prevAccounts.map((account) =>
            account.id === selectedAccount.id
              ? { ...account, name: selectedAccount.name }
              : account
          )
        );
      } else {
        console.warn("Failed to update account");
        alert("Failed to update account. Please try again.");
      }
    } catch (err) {
      console.error("Error updating account:", err);
      alert("An error occurred while updating the account.");
    }
  };

  const handleAddSocialSubmit = async (formData) => {
    const request = await get({
      apiName: 'user',
      path: `/${formData.platform.toLowerCase()}/login${formData.name ? '?name=' + formData.name : ''}`,
      options: { withCredentials: true, headers: { Authorization: token }, }
    });

    const response = await request.response;
    if (response.statusCode == 200) {
      const body = await response.body.json();
      const { loginUrl } = body;
      window.location = loginUrl;
    }

    closeModal();
  };

  if (loading) return <p className="loading-message">Loading accounts...</p>;
  if (error) return <p className="error-message">Error loading accounts: {error.message}</p>;

  return (
    <div className="accounts-container">
      <div className="sidebar">
        <h2 className="sidebar-title">Accounts</h2>
        <ul className="account-list">
          {accounts?.map((account, index) => (
            <li key={index}
              className={`account-item ${selectedAccount?.id === account.id ? 'selected' : ''}`}
              onClick={() => handleAccountClick(account)}
            >
              <img
                src={socialIcons[account.platform.toLowerCase()] || ''}
                alt={`${account.platform} icon`}
                width="20"
                height="20"
                className="social-icon"
              />
              {account.name}
            </li>
          ))}
          <li className="account-item add-account-item" onClick={openModal}>
            + Add Account
          </li>
        </ul>
      </div>

      <div className="main-content">
        {selectedAccount ? (
          <>
            <div className="account-details">
              <div className="account-header">
                <img
                  src={socialIcons[selectedAccount.platform.toLowerCase()] || ''}
                  alt={`${selectedAccount.platform} icon`}
                />
                {selectedAccount.screenName}
              </div>

              <div className="account-meta">
                <p className="detail-field"><strong>Platform:</strong> {selectedAccount.platform}</p>
                <p className="detail-field"><strong>Linked on:</strong> {new Date(selectedAccount.createdDate).toLocaleString()}</p>
                {selectedAccount.expires && (
                <p className="detail-field"><strong>Credentials expire:</strong> {new Date(selectedAccount.expires).toLocaleString()}</p>
              )}
              </div>

              <label className="detail-field">
                Name:
                <input
                  type="text"
                  value={selectedAccount.name}
                  onChange={(e) => setSelectedAccount({ ...selectedAccount, name: e.target.value })}
                  className="input-field"
                />
              </label>

              <div className="button-container">
                <button className="delete-button" onClick={() => handleDeleteAccount(selectedAccount.id)}>Delete</button>
                <button className="save-button" onClick={() => handleUpdateAccount()}>Save</button>
              </div>
            </div>

            {/* TEST MESSAGE CARD (ONLY SHOW IF BEFORE EXPIRES OR NO EXPIRES) */}
            {(!selectedAccount.expires || new Date(selectedAccount.createdDate) < new Date(selectedAccount.expires)) && (
              <div className="test-message-container">
                <h3 className="test-message-title">Send a Test Message</h3>
                <textarea
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="textarea-field"
                  placeholder="Enter test message..."
                />
                <div className="button-container">
                  <button className="send-button" onClick={handleSendTestMessage}>Send Test</button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="select-message">Select an account from the left to view details.</p>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <AddSocial onSubmit={handleAddSocialSubmit} onCancel={closeModal} />
      </Modal>
    </div>
  );
};

export default Accounts;
