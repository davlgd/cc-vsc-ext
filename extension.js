// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const { getUserData, isLogged } = require('./models/user.js');
const { getApplication, getApplications, restartApplication, stopApplication } = require('./models/applications.js');
const fs = require('fs');
const path = require('path');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "clever-code" is now active!');

	if (isLogged()) {
		console.log('You are logged in to Clever Cloud');
		const user = await getUserData();
		vscode.window.showInformationMessage(`Welcome to Visual Studio Code, ${user.name}`)
	}
	else {
		console.log('You are not logged in to Clever Cloud');
		vscode.window.showInformationMessage('You are not logged in to Clever Cloud');
	}

	let currentWebview;

	// Fonction pour afficher le bouton de sélection
	function showSelectionButton() {
		if (currentWebview) {
			currentWebview.webview.html = `
				<style>
					body {
						padding: 15px;
						font-family: var(--vscode-font-family);
						display: flex;
						justify-content: center;
					}
					button {
						background-color: var(--vscode-button-background);
						color: var(--vscode-button-foreground);
						border: none;
						padding: 8px 16px;
						border-radius: 4px;
						cursor: pointer;
						font-size: 14px;
					}
					button:hover {
						background-color: var(--vscode-button-hoverBackground);
					}
				</style>
				<button onclick="selectApp()">Select an application</button>
				<script>
					const vscode = acquireVsCodeApi();
					function selectApp() {
						vscode.postMessage({ command: 'select' });
					}
				</script>
			`;
		}
	}

	// Fonction pour lire le fichier .clever.json
	function readLocalConfig() {
		try {
			const workspaceFolders = vscode.workspace.workspaceFolders;
			if (!workspaceFolders) return null;

			const cleverJsonPath = path.join(workspaceFolders[0].uri.fsPath, '.clever.json');
			if (!fs.existsSync(cleverJsonPath)) return null;

			const content = fs.readFileSync(cleverJsonPath, 'utf8');
			return JSON.parse(content);
		} catch (error) {
			console.error('Error reading .clever.json:', error);
			return null;
		}
	}

	// Fonction pour afficher une application spécifique
	async function displayApplication(appId) {
		try {
			console.log('Fetching application data for ID:', appId);
			const appData = await getApplication(appId);

			if (!appData) {
				throw new Error('No application data received');
			}

			console.log('Received application data:', appData);

			// Vérification des propriétés requises
			if (!appData.instance || !appData.instance.variant) {
				throw new Error('Invalid application data structure');
			}

			// Grouper les données par catégories
			const basicInfo = {
				'Application Name': appData.name,
				'Description': appData.description || 'No description',
				'Zone': appData.zone,
				'Status': appData.state,
				'Branch': appData.branch
			};

			const deployment = {
				'Deploy URL': appData.deployUrl,
				'Last Deploy': new Date(appData.creationDate).toLocaleString(),
				'Commit ID': appData.commitId?.substring(0, 7) || 'N/A'
			};

			// Formater les données de l'instance
			const instanceInfo = {
				'Type': appData.instance.type,
				 'Variant': appData.instance.variant.slug, // Modification ici pour n'afficher que le slug
				'Version': appData.instance.version,
				'Min Instances': appData.instance.minInstances,
				'Max Instances': appData.instance.maxInstances
			};

			// Formater les données du flavor actuel avec 4 décimales pour le prix
			const currentFlavor = appData.instance.minFlavor;
			const flavorInfo = {
				'Size': currentFlavor.name,
				'CPU': `${currentFlavor.cpus} CPUs`,
				'Memory': currentFlavor.memory.formatted,
				'Price': `${currentFlavor.price.toFixed(4)}€/hour`
			};

			const domains = appData.vhosts?.map(vh => vh.fqdn) || [];
			const environment = appData.env?.map(e => `${e.name}=${e.value}`) || [];

			// Ajouter les boutons de contrôle selon l'état de l'application
			const controlButtons = (() => {
				if (appData.state === "WANTS_TO_BE_UP") {
					return `
						<div class="control-buttons">
							<button onclick="refreshStatus()" class="control-button">
								Refresh status
							</button>
						</div>
					`;
				}

				if (appData.state === "SHOULD_BE_UP" || appData.state === "SHOULD_BE_DOWN") {
					return `
						<div class="control-buttons">
							<button onclick="sendCommand('restart', true)" class="control-button">
								Restart
							</button>
							<button onclick="sendCommand('restart', false)" class="control-button warning">
								Rebuild
							</button>
							${appData.state === "SHOULD_BE_UP" ? `
								<button onclick="sendCommand('stop')" class="control-button danger">
									Stop
								</button>
							` : ''}
						</div>
					`;
				}

				return '';
			})();

			let html = `
				<link rel="stylesheet" type="text/css" href="${currentWebview.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'assets', 'styles.css')))}">

				<div class="section">
					<div class="section-title">Basic Information</div>
					${controlButtons}
					<div class="info-grid">
						${Object.entries(basicInfo).map(([key, value]) => `
							<div class="label">${key}:</div>
							<div class="value">${value}</div>
						`).join('')}
					</div>
				</div>

				<div class="section">
					<div class="section-title">Instance Configuration</div>
					<div class="info-grid">
						${Object.entries(instanceInfo).map(([key, value]) => `
							<div class="label">${key}:</div>
							<div class="value">${value}</div>
						`).join('')}
					</div>
					<div class="instance-details">
						<div class="section-title">Current Flavor</div>
						<div class="instance-flavor">
							${Object.entries(flavorInfo).map(([key, value]) => `
								<div class="flavor-card">
									<div class="label">${key}</div>
									<div class="value">${value}</div>
								</div>
							`).join('')}
						</div>
					</div>
				</div>

				<div class="section">
					<div class="section-title">Deployment</div>
					<div class="info-grid">
						${Object.entries(deployment).map(([key, value]) => `
							<div class="label">${key}:</div>
							<div class="value">${value}</div>
						`).join('')}
					</div>
				</div>

				${domains.length ? `
					<div class="section">
						<div class="section-title">Domains</div>
						${domains.map(domain => `
							<a href="https://${domain}" class="domain-link" target="_blank">${domain}</a>
						`).join('<br>')}
					</div>
				` : ''}

				${environment.length ? `
					<div class="section">
						<div class="section-title">Environment Variables</div>
						<div class="env-grid">
							${environment.map(env => {
								const [name, value] = env.split('=');
								return `
									<div class="env-var">
										<span class="env-name">${name}</span>
										<span class="env-value">${value}</span>
									</div>`;
							}).join('')}
						</div>
					</div>
				` : ''}

				<script>
					const vscode = acquireVsCodeApi();
					function sendCommand(action, useCache) {
						vscode.postMessage({
							command: action,
							appId: '${appId}',
							useCache: useCache
						});
						}
					function refreshStatus() {
						vscode.postMessage({
							command: 'refresh',
							appId: '${appId}'
						});
					}
				</script>
			`;

			if (currentWebview) {
				currentWebview.webview.html = html;

				// Ajouter les gestionnaires d'événements pour les boutons
				currentWebview.webview.onDidReceiveMessage(async message => {
					try {
						switch (message.command) {
							case 'refresh':
								await displayApplication(message.appId);
								break;
							case 'restart':
								await restartApplication(message.appId, message.useCache);
								vscode.window.showInformationMessage(
									`Application ${message.useCache ? 'restarted' : 'rebuilt'} successfully`
								);
								await displayApplication(message.appId);
								break;
							case 'stop':
								await stopApplication(message.appId);
								vscode.window.showInformationMessage('Application stopped successfully');
								await displayApplication(message.appId);
								break;
						}
					} catch (error) {
						vscode.window.showErrorMessage(`Failed to ${message.command} application: ${error.message}`);
					}
				});
			}

		} catch (error) {
			console.error('Error in displayApplication:', error);
			vscode.window.showErrorMessage(`Failed to load application data: ${error.message}`);
			showSelectionButton();
		}
	}

	// Fonction pour gérer les applications locales
	async function handleLocalApps() {
		const config = readLocalConfig();
		if (!config || !config.apps || !config.apps.length === 0) {
			return false;
		}

		try {
			if (config.apps.length === 1) {
				// Une seule application, l'afficher directement
				await displayApplication(config.apps[0].app_id);
				return true;
			}

			if (config.apps.length > 1) {
				// Plusieurs applications, montrer un picker
				const appNames = config.apps.map(app => app.name || app.alias);
				const selectedApp = await vscode.window.showQuickPick(appNames, {
					placeHolder: 'Select an application from .clever.json'
				});

				if (selectedApp) {
					const app = config.apps.find(app => (app.name || app.alias) === selectedApp);
					await displayApplication(app.app_id);
					return true;
				}
			}
		} catch (error) {
			console.error('Error handling local apps:', error);
		}

		return false;
	}

	// Fonction pour afficher le sélecteur d'applications
	async function showApplicationPicker() {
		try {
			// Vérifier d'abord les applications locales
			const hasLocalApps = await handleLocalApps();
			if (hasLocalApps) return;

			// Si pas d'applications locales, continuer avec le comportement normal
			const apps = await getApplications();
			const appNames = apps.map(app => app.name);
			const selectedApp = await vscode.window.showQuickPick(appNames);

			if (selectedApp) {
				const selectedAppId = apps.find(app => app.name === selectedApp).id;
				const appData = await getApplication(selectedAppId);

				let html = '<table style="width:100%">';
				for (const [key, value] of Object.entries(appData)) {
					html += `
						<tr>
							<td style="padding:8px;border-bottom:1px solid #ccc"><strong>${key}</strong></td>
							<td style="padding:8px;border-bottom:1px solid #ccc">${JSON.stringify(value)}</td>
						</tr>`;
				}
				html += '</table>';

				if (currentWebview) {
					currentWebview.webview.html = html;
				}
			} else {
				showSelectionButton();
			}
		} catch (error) {
			vscode.window.showErrorMessage('Failed to load applications');
			showSelectionButton();
		}
	}

	const ccAppProvider = vscode.window.registerWebviewViewProvider('ccApp', {
		resolveWebviewView(webviewView) {
			currentWebview = webviewView;
			webviewView.webview.options = {
				enableScripts: true
			 };

			 // Vérifier immédiatement les applications locales
			handleLocalApps().then(hasLocalApps => {
				// Afficher le bouton de sélection uniquement si pas d'applications locales
				if (!hasLocalApps) {
					showSelectionButton();
				}
			});

			// Écouter les messages du webview
			webviewView.webview.onDidReceiveMessage(message => {
				if (message.command === 'select') {
					showApplicationPicker();
				}
			});
		}
	});

	context.subscriptions.push(ccAppProvider);

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	const hello = vscode.commands.registerCommand('clever-code.helloWorld', function () {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from clever-code!');
	});

	// Modifier la commande applications pour utiliser la même fonction
	const applications = vscode.commands.registerCommand('clever-code.applications', showApplicationPicker);

	const profile = vscode.commands.registerCommand('clever-code.profile', function () {
		// The code you place here
		vscode.window.showInformationMessage('Profile');
	});

	context.subscriptions.push(hello, applications, profile);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
