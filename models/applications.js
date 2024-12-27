const { get, getAll } = require('@clevercloud/client/cjs/api/v2/application.js');
const { sendToApi } = require('./api.js');

async function getApplications() {
    return getAll({ id: null, instanceId: null }).then(sendToApi);
}

async function getApplication(appId) {
    if (!appId) {
        throw new Error('Application ID is required');
    }

    console.log('Getting application with ID:', appId);

    try {
        const response = await get({ id: null, appId }).then(sendToApi);
        console.log('API Response:', response);
        return response;
    } catch (error) {
        console.error('Error in getApplication:', error);
        throw error;
    }
}

module.exports = {
    getApplication,
    getApplications
};
