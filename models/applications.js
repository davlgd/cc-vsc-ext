const { get, getAll} = require('@clevercloud/client/cjs/api/v2/application.js');
const { sendToApi } = require('./api.js');

async function getApplications() {
    return getAll({ id: null, instanceId: null }).then(sendToApi);
}

async function getApplication(appId) {
    return get({ id: null, appId }).then(sendToApi);
}

module.exports = {
    getApplication,
    getApplications
};
