const { create, get, getAll, redeploy, remove, undeploy } = require('@clevercloud/client/cjs/api/v2/application.js');
const { getAvailableInstances } = require('@clevercloud/client/cjs/api/v2/product.js');
const { sendToApi } = require('./api.js');

function getTypes() {
    return ['docker', 'elixir', 'go', 'gradle', 'haskell', 'jar', 'maven', 'meteor', 'node', 'php', 'play1', 'play2', 'python', 'ruby', 'rust', 'sbt', 'static-apache', 'war'];
}

function getZones() {
    return ['par', 'grahds', 'rbx', 'rbxhds', 'scw', 'mtl', 'sgp', 'syd', 'wsw'];
}

async function createApplication({ name, type, zone }) {

    if (!name || !type || !zone) {
        throw new Error('All fields are required');
    }

    console.log('Creating application:', name);

    const instanceTypes = await getAvailableInstances({}).then(sendToApi);
    const instanceType = instanceTypes.find(i => i.variant.slug=== type);

    try {
        const body = {
            deploy: 'git',
            name: name,
            zone: zone,
            description: name,
            instanceType: instanceType.type,
            instanceVersion: instanceType.version,
            instanceVariant: instanceType.variant.id,
            maxFlavor: "nano",
            maxInstances: 1,
            minFlavor: "nano",
            minInstances: 1,
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

async function deleteApplication(appId) {
    if (!appId) {
        throw new Error('Application ID is required');
    }

    console.log('Deleting application with ID:', appId);

    try {
        const response = await remove({ id: null, appId }).then(sendToApi);
        console.log('API Response:', response);
        return response;
    } catch (error) {
        console.error('Error in deleteApplication:', error);
        throw error;
    }
}

async function getApplications() {
    return (await getAll({ id: null, instanceId: null }).then(sendToApi)).sort((a, b) => a.name.localeCompare(b.name));
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
    deleteApplication,
    getApplication,
    getApplications,
    getTypes,
    getZones,
    restartApplication,
    stopApplication
};
