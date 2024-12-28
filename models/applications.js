const { create, get, getAll, redeploy, undeploy } = require('@clevercloud/client/cjs/api/v2/application.js');
const { sendToApi } = require('./api.js');

function getTypes() {
    return ['docker', 'elixir', 'go', 'gradle', 'haskell', 'jar', 'maven', 'meteor', 'node', 'php', 'play1', 'play2', 'python', 'ruby', 'rust', 'sbt', 'static-apache', 'war'];
}

function getZones() {
    return ['par', 'grahds', 'rbx', 'rbxhds', 'scw', 'mtl', 'sgp', 'syd', 'wsw'];
}

async function createApplication({ name, type, region, instanceType, instanceCount, gitUrl }) {

    if (!name || !type || !region || !instanceType || !instanceCount || !gitUrl) {
        throw new Error('All fields are required');
    }

    console.log('Creating application:', name);

    try {
        const body = {
            deploy: 'git',
            name: name,
            zone: zone,
            description: name,
            instanceType: type,
            instanceVersion: null,
            instanceVariant: null,
            maxFlavor: null,
            maxInstances: null,
            minFlavor: null,
            minInstances: null,
            instanceLifetime: 'REGULAR',
            env: null,
        };

        const response = await create({ id: null }, body).then(sendToApi);
        console.log('API Response:', response);
        return response;
    } catch (error) {
        console.error('Error in createApplication:', error);
        throw error;
    }
}

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

async function restartApplication(appId, useCache) {
    if (!appId) {
        throw new Error('Application ID is required');
    }

    console.log('Restarting application with ID:', appId);

    try {
        const response = await redeploy({ id: null, appId, commit: null, useCache}).then(sendToApi);
        console.log('API Response:', response);
        return response;
    } catch (error) {
        console.error('Error in restartApplication:', error);
        throw error;
    }
}

async function stopApplication(appId) {
    if (!appId) {
        throw new Error('Application ID is required');
    }

    console.log('Stopping application with ID:', appId);

    try {
        const response = await undeploy({ id: null, appId }).then(sendToApi);
        console.log('API Response:', response);
        return response;
    } catch (error) {
        console.error('Error in stopApplication:', error);
        throw error;
    }
}

module.exports = {
    createApplication,
    getApplication,
    getApplications,
    getTypes,
    getZones,
    restartApplication,
    stopApplication
};
