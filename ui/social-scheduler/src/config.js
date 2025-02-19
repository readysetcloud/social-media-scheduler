export const config = {
  Auth: {
    Cognito: {
      userPoolClientId: import.meta.env.VITE_userPoolWebClientId,
      userPoolId: import.meta.env.VITE_userpoolId,
      loginWith: {
        oauth: {
          domain: 'social-butterfly-auth.auth.us-east-1.amazoncognito.com',
          scopes: ['email', 'profile', 'openid'],
          redirectSignIn: [import.meta.env.VITE_redirect],
          redirectSignOut: [import.meta.env.VITE_redirect],
          responseType: 'code'
        },
        username: false,
        email: true
      }
    }
  },
  API: {
    REST: {
      user: {
        endpoint: 'https://pi1g8k0jnb.execute-api.us-east-1.amazonaws.com/v1',
        region: 'us-east-1'
      }
    }
  }
};
