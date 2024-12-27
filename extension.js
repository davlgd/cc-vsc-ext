// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const { getUserData, isLogged } = require('./models/user.js');
const { getApplication, getApplications } = require('./models/applications.js');
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
					body { padding: 15px; font-family: var(--vscode-font-family); }
					button {
						padding: 8px 16px;
						margin: 10px 0;
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
			const appData = await getApplication(appId);
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
		} catch (error) {
			vscode.window.showErrorMessage('Failed to load application data');
			showSelectionButton();
		}
	}

	// Fonction pour gérer les applications locales
	async function handleLocalApps() {
		const config = readLocalConfig();
		if (!config || !config.apps || config.apps.length === 0) {
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
