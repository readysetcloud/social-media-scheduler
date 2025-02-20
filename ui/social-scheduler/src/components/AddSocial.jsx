import React, { useState } from 'react';
import './AddSocial.css';

const AddSocial = ({ onSubmit, onCancel }) => {
  const [platform, setPlatform] = useState('LinkedIn');
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit({ platform, name });
    }
  };

  return (
    <form className="add-social-form" onSubmit={handleSubmit}>
      <h2 className="header">Add Social Account</h2>
      <div className="radio-group">
        <label className="radio-label">
          <input
            type="radio"
            className="no-margin"
            name="platform"
            value="LinkedIn"
            checked={platform === 'LinkedIn'}
            onChange={() => setPlatform('LinkedIn')}
          />
          LinkedIn
        </label>
        <label className="radio-label">
          <input
            type="radio"
            className="no-margin"
            name="platform"
            value="X"
            checked={platform === 'X'}
            onChange={() => setPlatform('X')}
          />
          X
        </label>
      </div>
      <div className="input-group">
        <label htmlFor="social-name">Account Name:</label>
        <input
          id="social-name"
          placeholder="Optional name of account"
          type="text"
          maxLength="25"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="form-buttons">
        <button type="submit" className="submit-button">Login to {platform}</button>
        <button type="button" className="cancel-button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
};

export default AddSocial;
