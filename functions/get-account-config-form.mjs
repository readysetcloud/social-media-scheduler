import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    let { accountId } = event.pathParameters;
    accountId = accountId.toLowerCase();
    let account = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: accountId,
        sk: 'account'
      })
    }));
    if (!account.Item) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: 'Account not found' })
      };
    } else {
      account = unmarshall(account.Item);
    }

    const form = getFormHtml(account);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html'
      },
      body: form
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Something went wrong' })
    };
  }
};

const getFormHtml = (account) => `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Configure ${account.name} API Keys</title>
<style>
  body {
    font-family: Arial, sans-serif;
    background-color: #f4f4f4;
    padding: 20px;
    display: flex;
    justify-content: center;
  }
  form {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    max-width: 615px;
  }
  h2 {
    text-align: center;
  }
  fieldset {
    border: 2px solid #ccc;
    border-radius: 10px;
    padding: 10px;
    margin-bottom: 15px;
  }
  legend {
    padding: 0 10px;
    font-size: larger;
    font-weight: bold;
  }
  .form-group {
    margin-bottom: 15px;
  }
  .top-margin {
    margin-top: 15px;
  }
  .flex-group {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .flex-side-by-side {
    display: flex;
    flex-direction: row;
    gap: 10px;
    align-items: center;
    margin-bottom: 10px;
  }
  .help-text {
    font-size: .9rem;
    color: slategray;
    margin-bottom: 10px;
  }
  .hint-text {
    text-decoration: italics;
    font-size: .95rem;
    margin-bottom: 10px;
  }
  label {
    display: block;
    margin-bottom: 5px;
  }
  input {
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  input[type="password"] {
    width: 90%;
  }
  input[type="submit"] {
    width: 100%;
    background-color: #A238FF;
    color: white;
    border: none;
    cursor: pointer;
    margin-top: 20px;
  }
  input[type="submit"]:hover {
    background-color: #250083;
  }
  button {
    background-color: #A238FF;
    color: white;
    border: none;
    cursor: pointer;
    border-radius: 5px;
    padding: 10px;
  }
  button:hover {
    background-color: #250083;
  }
</style>
</head>
<body>
  <form id="apiKeysForm">
    <h2>Configure ${account.name} API Keys</h2>
    <fieldset>
      <legend>Twitter</legend>
      <div class="help-text">You can register for a <a href="https://developer.twitter.com/en/portal/petition/essential/terms?plan=free">Twitter Developer account</a> to get the info required for this form.</div>
      <div class="form-group">
        <label for="handle">Handle</label>
        <input id="handle" name="handle" value="${account.twitter?.handle ?? ''}" required>
      </div>
      ${account.twitter?.status == 'active' ? `<div class="hint-text">Credentials are saved in the system but are omitted here for security.</div>
        <div class="top-margin">
          <input type="checkbox" id="twitterRemoveCredentials" name="twitterRemoveCredentials" value="false">
          <span>Remove saved credentials</span>
        </div>
        <hr/>
        ` : ''}
      <div class="form-group">
        <label for="apiKey">API Key</label>
        <input type="password" id="apiKey" name="apiKey" >
      </div>
      <div class="form-group">
        <label for="apiKeySecret">API Key Secret</label>
        <input type="password" id="apiKeySecret" name="apiKeySecret" >
      </div>
      <div class="form-group">
        <label for="bearerToken">Bearer Token</label>
        <input type="password" id="bearerToken" name="bearerToken" >
      </div>
      <div class="form-group">
        <label for="accessToken">Access Token</label>
        <input type="password" id="accessToken" name="accessToken" >
      </div>
      <div class="form-group">
        <label for="accessTokenSecret">Access Token Secret</label>
        <input type="password" id="accessTokenSecret" name="accessTokenSecret" >
      </div>
    </fieldset>
    <fieldset>
      <legend>Discord</legend>
      <div class="help-text">Enter the channel id you'd like to post messages to. You can <a href="https://docs.statbot.net/docs/faq/general/how-find-id/">find the channel id here</a>.</div>
      <div class="form-group">
        <label for="channel">Channel id</label>
        <input id="channel" name="channel" value="${account.discord?.channel ?? ''}">
      </div>
    </fieldset>
    <fieldset>
      <legend>LinkedIn</legend>
      ${(account.linkedIn?.status == 'active' && account.linkedIn?.statusTimestamp) ? `
        <div class="help-text">This account was authenticated at ${account.linkedIn.statusTimestamp}
        </div><hr/>` : ''}
      ${account.linkedIn?.status == 'expired' ? `
        <div class="help-text">Your authentication to this account is expired. Please re-authenticate.
        </div><hr/>`: ''}
      <div class="flex-side-by-side">
        <label><input type="radio" name="linkedInType" value="organization" onclick="toggleOrganizationField(true)" checked> Organization</label>
        <label><input type="radio" name="linkedInType" value="personal" onclick="toggleOrganizationField(false)"> Personal</label>
      </div>
      <div id="organizationField">
        <div class="hint-text">Your organization id is found in the address bar when viewing the company page on LinkedIn. Look for it at "/company/{orgId}".</div>
        <div class="flex-group">
          <div class="form-group">
            <label for="linkedInEntity">Organization Id</label>
            <input id="linkedInEntity" name="linkedInEntity" value="${account.linkedIn?.organizationId ?? ''}" >
          </div>
          <div>
          ${getLinkedInActionButton(account.linkedIn)}
          </div>
        </div>
      </div>
      <div id="personalField" style="display:none;">
      <div class="hint-text">When publishing posts to LinkedIn, they will be created under your personal account.</div>
        ${getLinkedInActionButton(account.linkedIn)}
      </div>
    </fieldset>
    <input type="submit" value="Submit" onclick="submitForm(event)">
  </form>
  <script>
    function submitForm(event) {
      event.preventDefault();
      const form = document.getElementById('apiKeysForm');
      const formData = new FormData(form);
      const data = {
        twitter: {
          apiKey: formData.get('apiKey'),
          apiKeySecret: formData.get('apiKeySecret'),
          bearerToken: formData.get('bearerToken'),
          handle: formData.get('handle'),
          accessToken: formData.get('accessToken'),
          accessTokenSecret: formData.get('accessTokenSecret'),
          removeCredentials: formData.get('twitterRemoveCredentials')
        },
        linkedIn: {
          organizationId: formData.get('linkedInEntity'),
          type: formData.get('linkedInType')
        },
        discord: {
          channel: formData.get('channel')
        }
      };

      fetch('./${account.pk}', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      .then(data => {
        console.log('Success:', data);
        window.location.href = '/v1/accounts';
      })
      .catch((error) => {
        console.error('Error:', error);
        alert('Error submitting form');
      });
    }

    function authenticateLinkedIn() {
      const linkedInEntity = document.getElementById('linkedInEntity').value;
      fetch('/v1/linkedin/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ accountId: "${account.pk}" })
      })
      .then(response => response.json())
      .then(data => {
        window.location.href = data.url;
      })
      .catch((error) => {
        console.error('Error:', error);
        alert('Error authenticating LinkedIn');
      });
    }

    function revokeLinkedIn() {
      const data = {
        linkedIn: {
          removeCredentials: true
        }
      };

      fetch('./${account.pk}', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      .then(data => {
        console.log('Success:', data);
        window.location.reload();
      })
      .catch((error) => {
        console.error('Error:', error);
        alert('Error revoking LinkedIn credentials');
      });
    }
    function toggleOrganizationField(show) {
      const orgField = document.getElementById('organizationField');
      const personalField = document.getElementById('personalField');
      if (show) {
        orgField.style.display = 'block';
        personalField.style.display = 'none';
      } else {
        orgField.style.display = 'none';
        personalField.style.display = 'block';
      }
    }
  </script>
</body>
</html>
`;
const getLinkedInActionButton = (linkedIn) => {
  if (linkedIn?.status == 'active') {
    return `<button type="button" class="btn btn-primary" onClick="revokeLinkedIn()">
      Revoke
    </button>`;
  } else if (linkedIn?.status == 'expired') {
    return `<button type="button" class="btn btn-primary" onClick="authenticateLinkedIn()">
    Re-authenticate
  </button>`;
  }
  else {
    return `<button type="button" class="btn btn-primary" onClick="authenticateLinkedIn()">
      Authenticate
    </button>`;
  }
};

