const fs = require('fs');
const path = require('path');

function getTokens() {
    const homeDir = require('os').homedir();
    const configFile = path.join(homeDir, '.config/clever-cloud/clever-tools.json');

    const content = fs.readFileSync(configFile, 'utf8');
    const { token, secret } = JSON.parse(content);

    return { token, secret };
}

module.exports = {
    getTokens
};
