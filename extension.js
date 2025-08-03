const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	console.log('Congratulations, your extension "dbml-previewer" is now active!');

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

	// Set the webview content
	panel.webview.html = getWebviewContent(content, fileName, panel.webview);

	// Handle messages from the webview (optional)
	panel.webview.onDidReceiveMessage(
		message => {
			switch (message.command) {
				case 'export':
					vscode.window.showWarningMessage('Exporting DBML is not yet supported');
					break;
			}
		},
		undefined,
		context.subscriptions
	);

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
 * @param {vscode.Webview} webview
 * @returns {string}
 */
function getWebviewContent(content, fileName, webview) {
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
				font-family: var(--vscode-font-family);
				background-color: var(--vscode-editor-background);
				color: var(--vscode-editor-foreground);
			}
			#root {
				width: 100vw;
				height: 100vh;
			}
		</style>
	</head>
	<body>
		<div id="root"></div>
		<script>
			window.initialContent = ${JSON.stringify(content)};
		</script>
		<script src="${scriptUri}"></script>
	</body>
	</html>`;
}

function deactivate() {
	// Clean up webview panel
	if (panel) {
		panel.dispose();
	}
}

module.exports = {
	activate,
	deactivate
}