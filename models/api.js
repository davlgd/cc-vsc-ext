const { getTokens } = require('./auth.js');

const { addOauthHeader } = require('@clevercloud/client/cjs/oauth.js');
const { prefixUrl } = require('@clevercloud/client/cjs/prefix-url.js');
const { request } = require('@clevercloud/client/cjs/request.fetch.js');

module.exports.sendToApi = (requestParams) => {

    const { token, secret } = getTokens();

    const API_HOST = 'https://api.clever-cloud.com'
    const tokens = {
        OAUTH_CONSUMER_KEY: 'T5nFjKeHH4AIlEveuGhB5S3xg8T19e',
        OAUTH_CONSUMER_SECRET: 'MgVMqTr6fWlf2M0tkC2MXOnhfqBWDT',
        API_OAUTH_TOKEN: token,
        API_OAUTH_TOKEN_SECRET: secret,
    };

    return Promise.resolve(requestParams)
        .then(prefixUrl(API_HOST))
        .then(addOauthHeader(tokens))
        .then(request);
        // chain a .catch() call here if you need to handle some errors or maybe redirect to login
}
