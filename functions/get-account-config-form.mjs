import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    let { accountId } = event.pathParameters;
    accountId = accountId.toLowerCase();
    const data = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: accountId,
        sk: 'account'
      })
    }));
    if (!data.Item) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: 'Account not found' })
      };
    }


    const form = getFormHtml(data.Item.name.S, accountId);
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

const getFormHtml = (name, id) => `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Configure ${name} API Keys</title>
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
</style>
</head>
<body>
  <form id="apiKeysForm">
    <h2>Configure ${name} API Keys</h2>
    <fieldset>
      <legend>Twitter</legend>
      <p>You can register for a <a href="https://developer.twitter.com/en/portal/petition/essential/terms?plan=free">Twitter Developer account</a> to get the info required for this form.</p>
      <div class="form-group">
        <label for="apiKey">API Key</label>
        <input type="password" id="apiKey" name="apiKey" required>
      </div>
      <div class="form-group">
        <label for="apiKeySecret">API Key Secret</label>
        <input type="password" id="apiKeySecret" name="apiKeySecret" required>
      </div>
      <div class="form-group">
        <label for="bearerToken">Bearer Token</label>
        <input type="password" id="bearerToken" name="bearerToken" required>
      </div>
      <div class="form-group">
        <label for="accessToken">Access Token</label>
        <input type="password" id="accessToken" name="accessToken" required>
      </div>
      <div class="form-group">
        <label for="accessTokenSecret">Access Token Secret</label>
        <input type="password" id="accessTokenSecret" name="accessTokenSecret" required>
      </div>
    </fieldset>
    <input type="submit" value="Submit" onclick="submitForm(event)">
  </form>
  <script>
    function submitForm(event) {
      event.preventDefault();
      const form = document.getElementById('apiKeysForm');
      const formData = new FormData(form);
      const data = {};
      formData.forEach((value, key) => { data[key] = value; });

      fetch('./${id}', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      .then(response => response.json())
      .then(data => {
        console.log('Success:', data);
        window.location.href = '/v1/accounts';
      })
      .catch((error) => {
        console.error('Error:', error);
        alert('Error submitting form');
      });
    }
  </script>
</body>
</html>
`;

