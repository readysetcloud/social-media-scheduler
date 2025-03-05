import { AuthClient, ExpiresIn } from "@gomomento/sdk";

const auth = new AuthClient({});

export const handler = async (event) => {
  try {
    const tenantId = event.request.userAttributes.sub;
    console.log(tenantId);

    const scope = {
      permissions: [{
        role: 'subscribeonly',
        cache: process.env.CACHE_NAME,
        topic: tenantId
      }]
    };

    const token = await auth.generateDisposableToken(scope, ExpiresIn.minutes(60), { tokenId: tenantId });

    event.response.claimsOverrideDetails = {
      claimsToAddOrOverride: {
        'momento': token.authToken
      }
    };

    return event;
  } catch (err) {
    console.error(err);
    throw err;
  }
};
