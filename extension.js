const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	const previewCommand = vscode.commands.registerCommand('dbml-previewer.preview', function () {
		const activeEditor = vscode.window.activeTextEditor;

		if (!activeEditor) {
			vscode.window.showErrorMessage('No active editor found');
			return;
		}

		const document = activeEditor.document;
		const filePath = document.fileName;

		if (!filePath.toLowerCase().endsWith('.dbml')) {
			vscode.window.showWarningMessage('Please open a DBML file to preview');
			return;
		}

		createPreviewPanel(context, filePath, document.getText());
	});

	// Register command to preview DBML from file explorer context menu
	const previewFromExplorerCommand = vscode.commands.registerCommand('dbml-previewer.previewFromExplorer', function (uri) {
		if (!uri) {
			vscode.window.showErrorMessage('No file selected');
			return;
		}

		if (!uri.fsPath.toLowerCase().endsWith('.dbml')) {
			vscode.window.showWarningMessage('Selected file is not a DBML file');
			return;
		}

		readFileAndPreview(context, uri.fsPath);
	});

	context.subscriptions.push(previewCommand, previewFromExplorerCommand);
}

/**
 * Read file content and create preview
 * @param {vscode.ExtensionContext} context 
 * @param {string} filePath 
 */
function readFileAndPreview(context, filePath) {
	try {
		const content = fs.readFileSync(filePath, 'utf8');
		createPreviewPanel(context, filePath, content);
	} catch (error) {
		vscode.window.showErrorMessage(`Error reading file: ${error.message}`);
	}
}

/**
 * Create and show the webview panel for preview
 * @param {vscode.ExtensionContext} context
 * @param {string} filePath
 * @param {string} content
 */
function createPreviewPanel(context, filePath, content) {
	const fileName = path.basename(filePath);

	const panel = vscode.window.createWebviewPanel(
		'dbmlPreview', // Panel type
		`Preview: ${fileName}`, // Panel title
		vscode.ViewColumn.Beside, // Show beside current editor
		{
			enableScripts: true,
			retainContextWhenHidden: true,
			localResourceRoots: [vscode.Uri.file(path.dirname(filePath)), vscode.Uri.file(path.join(__dirname, 'dist'))]
		}
	);

	// Get configuration
	const config = vscode.workspace.getConfiguration('diagram');
	const inheritThemeStyle = config.get('inheritThemeStyle', true);
	const edgeType = config.get('edgeType', 'smoothstep');

	// Set the webview content
	panel.webview.html = getWebviewContent(content, fileName, filePath, panel.webview, inheritThemeStyle, edgeType);

	// Handle messages from the webview
	panel.webview.onDidReceiveMessage(
		message => {
			switch (message.command) {
				case 'export':
					vscode.window.showWarningMessage('Exporting DBML is not yet supported');
					break;
				case 'getConfiguration':
					// Send current configuration to webview
					const currentConfig = vscode.workspace.getConfiguration('diagram');
					const currentInheritThemeStyle = currentConfig.get('inheritThemeStyle', true);
					const currentEdgeType = currentConfig.get('edgeType', 'smoothstep');
					panel.webview.postMessage({
						type: 'configuration',
						inheritThemeStyle: currentInheritThemeStyle,
						edgeType: currentEdgeType
					});
					break;
			}
		},
		undefined,
		context.subscriptions
	);

	// Listen for configuration changes
	const configChangeListener = vscode.workspace.onDidChangeConfiguration(event => {
		if (event.affectsConfiguration('diagram.inheritThemeStyle') || event.affectsConfiguration('diagram.edgeType')) {
			const config = vscode.workspace.getConfiguration('diagram');
			const inheritThemeStyle = config.get('inheritThemeStyle', true);
			const edgeType = config.get('edgeType', 'smoothstep');
			panel.webview.postMessage({
				type: 'configurationChanged',
				inheritThemeStyle: inheritThemeStyle,
				edgeType: edgeType
			});
		}
	});

	context.subscriptions.push(configChangeListener);

	// Auto-refresh when file changes (optional)
	const fileWatcher = vscode.workspace.createFileSystemWatcher(filePath);
	fileWatcher.onDidChange(() => {
		try {
			const updatedContent = fs.readFileSync(filePath, 'utf8');
			panel.webview.postMessage({
				type: 'updateContent',
				content: updatedContent
			});
		} catch (error) {
			console.error('Error auto-refreshing:', error);
		}
	});

	// Clean up watcher when panel is disposed
	panel.onDidDispose(() => {
		fileWatcher.dispose();
	});

	context.subscriptions.push(fileWatcher);
}

/**
 * Generate HTML content for the webview
 * @param {string} content
 * @param {string} fileName
 * @param {string} filePath
 * @param {vscode.Webview} webview
 * @param {boolean} inheritThemeStyle
 * @param {string} edgeType
 * @returns {string}
 */
function getWebviewContent(content, fileName, filePath, webview, inheritThemeStyle, edgeType) {
	// Get the local path to main script run in the webview
	const scriptPathOnDisk = vscode.Uri.file(path.join(__dirname, 'dist', 'webview.js'));
	const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

	return `<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>DBML Preview - ${fileName}</title>
		<style>
			body {
				margin: 0;
				padding: 0;
				font-family: ${inheritThemeStyle ? 'var(--vscode-font-family)' : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'};
				background-color: ${inheritThemeStyle ? 'var(--vscode-editor-background)' : '#ffffff'};
				color: ${inheritThemeStyle ? 'var(--vscode-editor-foreground)' : '#1f2937'};
			}
			#root {
				width: 100vw;
				height: 100vh;
			}
			* {
				box-sizing: border-box;
			}
		</style>
	</head>
	<body>
		<div id="root"></div>
		<script>
			window.initialContent = ${JSON.stringify(content)};
			window.filePath = ${JSON.stringify(filePath)};
			window.inheritThemeStyle = ${JSON.stringify(inheritThemeStyle)};
			window.edgeType = ${JSON.stringify(edgeType)};
		</script>
		<script src="${scriptUri}"></script>
	</body>
	</html>`;
}

function deactivate() {
	// Extension deactivation - panels are automatically cleaned up by VS Code
}

module.exports = {
	activate,
	deactivate
}