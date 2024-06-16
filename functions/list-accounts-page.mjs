import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";

const ddb = new DynamoDBClient();

export const handler = async () => {
  try {
    const data = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      IndexName: 'schedules',
      KeyConditionExpression: '#type = :type',
      ExpressionAttributeNames: {
        '#type': 'type'
      },
      ExpressionAttributeValues: marshall({
        ':type': 'account'
      })
    }));

    const accounts = data.Items || [];
    const htmlResponse = getHtml(accounts);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html'
      },
      body: htmlResponse
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

const getHtml = (accounts) => `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Accounts List</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/4.5.0/css/bootstrap.min.css">
<style>
  body { padding: 20px; }
  .modal-content { padding: 20px; }
  .add-button { margin-bottom: 10px; }
  .test-button { margin-right: 10px; }
</style>
</head>
<body>
  <h1>Accounts List</h1>
  <button type="button" class="btn btn-primary float-right add-button" data-toggle="modal" data-target="#addAccountModal">
    Add Account
  </button>
  <table class="table">
    <thead>
      <tr>
        <th>Account Name</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      ${accounts.map(account => `
        <tr>
          <td><a href="/v1/accounts/${account.pk.S}">${account.name.S}</a></td>
          <td><button class="btn btn-primary test-button" onclick="testTwitter('${account.pk.S}')">Test Twitter</button></td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="modal fade" id="addAccountModal" tabindex="-1" role="dialog" aria-labelledby="addAccountModalLabel" aria-hidden="true">
    <div class="modal-dialog" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="addAccountModalLabel">Add New Account</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <form id="addAccountForm">
            <div class="form-group">
              <label for="accountId">Id</label>
              <input type="text" class="form-control" id="accountId" placeholder="This used in events to identify the account" required>
            </div>
            <div class="form-group">
              <label for="accountName">Name</label>
              <input type="text" class="form-control" id="accountName" placeholder="Friendly name for your benefit :)" required>
            </div>
            <button type="button" class="btn btn-primary" onclick="addAccount(event)">Submit</button>
          </form>
        </div>
      </div>
    </div>
  </div>

  <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js"></script>
  <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.0/js/bootstrap.min.js"></script>
  <script>
    function addAccount(event) {
      event.preventDefault();
      const id = document.getElementById('accountId').value;
      const name = document.getElementById('accountName').value;
      fetch('./accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name })
      })
      .then(response => response.json())
      .then(data => {
        console.log('Success:', data);
        window.location.href = '/v1/accounts/' + id;
      })
      .catch(error => {
        console.error('Error:', error);
      });
    }
    function testTwitter(accountId) {
      fetch('./accounts/' + accountId + '/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'THIS IS A TEST, PLEASE IGNORE!', platform: 'twitter' })
      })
      .then(response => response.json())
      .then(data => {
        window.open(data.url, '_blank');
      })
      .catch(error => {
        console.error('Error:', error);
        alert('Failed to test Twitter');
      });
    }
  </script>
</body>
</html>
`;

