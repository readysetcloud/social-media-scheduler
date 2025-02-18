import { CognitoIdentityProviderClient, AdminAddUserToGroupCommand } from '@aws-sdk/client-cognito-identity-provider';
const cognito = new CognitoIdentityProviderClient();

export const handler = async (event) => {
  try {
    const { userName, groupName } = event.detail;
    await cognito.send(new AdminAddUserToGroupCommand({
      GroupName: groupName,
      UserPoolId: process.env.USER_POOL_ID,
      Username: userName
    }));

  } catch (err) {
    console.error(err);
  }
};
