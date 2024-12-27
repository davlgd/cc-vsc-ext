const { sendToApi } = require('./api.js');
const { getTokens } = require('./auth.js');
const { get } = require('@clevercloud/client/cjs/api/v2/organisation.js');

async function getUserData() {
    return get({ id: null }).then(sendToApi);
}

function isLogged() {
    const tokens = getTokens();
    return tokens != { "token": null, "secret": null };
}

module.exports = {
    getUserData,
    isLogged
};