import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import '@aws-amplify/ui-react/styles.css';
import { config } from './config.js';
import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';

Amplify.configure(config);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Authenticator socialProviders={["google"]} variation="modal">
      {({ signOut, user}) => (
        <App user={user}/>
      )}
    </Authenticator>
  </StrictMode>,
);
