const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

// Track the active preview panel
let activePreviewPanel = null;

// Bulk export state
let bulkExportPanel = null;
let bulkExportResults = [];
let bulkExportProgressResolve = null;
let bulkExportPanelReadyResolve = null;
let bulkExportOutputDir = '';

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

	// Register export to PNG command
	const exportToPNGCommand = vscode.commands.registerCommand('dbml-previewer.exportToPNG', function () {
		if (!activePreviewPanel) {
			vscode.window.showWarningMessage('No active DBML preview found. Please open a DBML preview first.');
			return;
		}

		activePreviewPanel.webview.postMessage({
			type: 'exportToPNG'
		});
	});

	// Register export to SVG command
	const exportToSVGCommand = vscode.commands.registerCommand('dbml-previewer.exportToSVG', function () {
		if (!activePreviewPanel) {
			vscode.window.showWarningMessage('No active DBML preview found. Please open a DBML preview first.');
			return;
		}

		activePreviewPanel.webview.postMessage({
			type: 'exportToSVG'
		});
	});

	const bulkExportCommand = vscode.commands.registerCommand('dbml-previewer.bulkExportToPNG', function (uri) {
		runBulkExport(context, uri);
	});

	context.subscriptions.push(previewCommand, previewFromExplorerCommand, exportToPNGCommand, exportToSVGCommand, bulkExportCommand);
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

	// Track this as the active preview panel
	activePreviewPanel = panel;

	// Set context for command availability
	vscode.commands.executeCommand('setContext', 'dbmlPreviewerActive', true);

	// Get configuration
	const config = vscode.workspace.getConfiguration('diagram');
	const inheritThemeStyle = config.get('inheritThemeStyle', true);
	const edgeType = config.get('edgeType', 'smoothstep');
	const exportQuality = config.get('exportQuality', 0.95);
	const exportBackground = config.get('exportBackground', true);
	const exportPadding = config.get('exportPadding', 20);

	// Set the webview content
	panel.webview.html = getWebviewContent(content, fileName, filePath, panel.webview, inheritThemeStyle, edgeType, exportQuality, exportBackground, exportPadding);

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
					const currentExportQuality = currentConfig.get('exportQuality', 0.95);
					const currentExportBackground = currentConfig.get('exportBackground', true);
					const currentExportPadding = currentConfig.get('exportPadding', 20);
					panel.webview.postMessage({
						type: 'configuration',
						inheritThemeStyle: currentInheritThemeStyle,
						edgeType: currentEdgeType,
						exportQuality: currentExportQuality,
						exportBackground: currentExportBackground,
						exportPadding: currentExportPadding
					});
					break;
			}
		},
		undefined,
		context.subscriptions
	);

	// Listen for configuration changes
	const configChangeListener = vscode.workspace.onDidChangeConfiguration(event => {
		if (event.affectsConfiguration('diagram.inheritThemeStyle') ||
		    event.affectsConfiguration('diagram.edgeType') ||
		    event.affectsConfiguration('diagram.exportQuality') ||
		    event.affectsConfiguration('diagram.exportBackground') ||
		    event.affectsConfiguration('diagram.exportPadding')) {
			const config = vscode.workspace.getConfiguration('diagram');
			const inheritThemeStyle = config.get('inheritThemeStyle', true);
			const edgeType = config.get('edgeType', 'smoothstep');
			const exportQuality = config.get('exportQuality', 0.95);
			const exportBackground = config.get('exportBackground', true);
			const exportPadding = config.get('exportPadding', 20);
			panel.webview.postMessage({
				type: 'configurationChanged',
				inheritThemeStyle: inheritThemeStyle,
				edgeType: edgeType,
				exportQuality: exportQuality,
				exportBackground: exportBackground,
				exportPadding: exportPadding
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
		// Clear active panel reference
		if (activePreviewPanel === panel) {
			activePreviewPanel = null;
			vscode.commands.executeCommand('setContext', 'dbmlPreviewerActive', false);
		}
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
 * @param {number} exportQuality
 * @param {boolean} exportBackground
 * @param {number} exportPadding
 * @returns {string}
 */
function getWebviewContent(content, fileName, filePath, webview, inheritThemeStyle, edgeType, exportQuality, exportBackground, exportPadding) {
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
			window.exportQuality = ${JSON.stringify(exportQuality)};
			window.exportBackground = ${JSON.stringify(exportBackground)};
			window.exportPadding = ${JSON.stringify(exportPadding)};
		</script>
		<script src="${scriptUri}"></script>
	</body>
	</html>`;
}

/**
 * Resolve a folder path setting (absolute or workspace-relative).
 * Returns null if the setting is empty or workspace root is unavailable.
 * @param {string} folderSetting
 * @returns {string|null}
 */
function resolveFolderPath(folderSetting) {
	if (!folderSetting) return null;
	if (path.isAbsolute(folderSetting)) return folderSetting;
	const wf = vscode.workspace.workspaceFolders;
	if (!wf || wf.length === 0) return null;
	return path.join(wf[0].uri.fsPath, folderSetting);
}

/**
 * Collect all .dbml files in a directory (non-recursive).
 * @param {string} sourceDir
 * @returns {{ filePath: string, outputName: string }[]}
 */
function collectDbmlFiles(sourceDir) {
	return fs.readdirSync(sourceDir, { withFileTypes: true })
		.filter(e => e.isFile() && e.name.toLowerCase().endsWith('.dbml'))
		.map(e => ({
			filePath: path.join(sourceDir, e.name),
			outputName: path.basename(e.name, '.dbml') + '.png'
		}));
}

/**
 * Create a dedicated webview panel for bulk export processing.
 * @param {vscode.ExtensionContext} context
 * @returns {vscode.WebviewPanel}
 */
function createBulkExportPanel(context) {
	const config = vscode.workspace.getConfiguration('diagram');
	const inheritThemeStyle = config.get('inheritThemeStyle', false);
	const edgeType = config.get('edgeType', 'smoothstep');
	const exportQuality = config.get('exportQuality', 0.95);
	const exportBackground = config.get('exportBackground', true);
	const exportPadding = config.get('exportPadding', 20);

	const panel = vscode.window.createWebviewPanel(
		'dbmlBulkExport',
		'DBML Bulk Export (Processing...)',
		{ viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
		{
			enableScripts: true,
			retainContextWhenHidden: true,
			localResourceRoots: [vscode.Uri.file(path.join(__dirname, 'dist'))]
		}
	);

	panel.webview.html = getWebviewContent('', 'bulk-export', '', panel.webview, inheritThemeStyle, edgeType, exportQuality, exportBackground, exportPadding);

	panel.webview.onDidReceiveMessage(
		message => handleBulkWebviewMessage(message, panel),
		undefined,
		context.subscriptions
	);

	panel.onDidDispose(() => {
		if (bulkExportPanel === panel) {
			bulkExportPanel = null;
		}
	});

	return panel;
}

/**
 * Handle messages from the bulk export webview panel.
 * @param {object} message
 * @param {vscode.WebviewPanel} panel
 */
function handleBulkWebviewMessage(message, panel) {
	if (message.type === 'ready') {
		if (bulkExportPanelReadyResolve) {
			bulkExportPanelReadyResolve();
			bulkExportPanelReadyResolve = null;
		}
		return;
	}

	if (message.command === 'getConfiguration') {
		const cfg = vscode.workspace.getConfiguration('diagram');
		panel.webview.postMessage({
			type: 'configuration',
			inheritThemeStyle: cfg.get('inheritThemeStyle', false),
			edgeType: cfg.get('edgeType', 'smoothstep'),
			exportQuality: cfg.get('exportQuality', 0.95),
			exportBackground: cfg.get('exportBackground', true),
			exportPadding: cfg.get('exportPadding', 20)
		});
		return;
	}

	if (message.type === 'bulkExportResult') {
		if (message.error) {
			bulkExportResults.push({ outputName: message.outputName, success: false, error: message.error });
		} else {
			try {
				const base64Data = message.dataUrl.replace(/^data:image\/png;base64,/, '');
				const outputPath = path.join(bulkExportOutputDir, message.outputName);
				fs.writeFileSync(outputPath, Buffer.from(base64Data, 'base64'));
				bulkExportResults.push({ outputName: message.outputName, success: true });
			} catch (err) {
				bulkExportResults.push({ outputName: message.outputName, success: false, error: `Failed to save: ${err.message}` });
			}
		}
		if (bulkExportProgressResolve) {
			bulkExportProgressResolve();
			bulkExportProgressResolve = null;
		}
	}
}

/**
 * Wait for the bulk export webview to signal it is ready.
 * @returns {Promise<void>}
 */
function waitForBulkPanelReady() {
	return new Promise(resolve => {
		bulkExportPanelReadyResolve = resolve;
		setTimeout(() => {
			if (bulkExportPanelReadyResolve) {
				bulkExportPanelReadyResolve = null;
				resolve();
			}
		}, 5000);
	});
}

/**
 * Send one file to the bulk export webview and wait for the result.
 * @param {string} outputName
 * @param {string} content
 * @returns {Promise<void>}
 */
function processOneBulkFile(outputName, content) {
	return new Promise(resolve => {
		const timeout = setTimeout(() => {
			if (bulkExportProgressResolve === wrappedResolve) {
				bulkExportProgressResolve = null;
				bulkExportResults.push({ outputName, success: false, error: 'Timed out waiting for render' });
				resolve();
			}
		}, 30000);

		const wrappedResolve = () => {
			clearTimeout(timeout);
			resolve();
		};

		bulkExportProgressResolve = wrappedResolve;

		bulkExportPanel.webview.postMessage({
			type: 'bulkExportProcess',
			content,
			outputName
		});
	});
}

/**
 * Show the bulk export summary notification.
 * @param {{ outputName: string, success: boolean, error?: string }[]} results
 * @param {string} outputDir
 */
function showBulkExportSummary(results, outputDir) {
	const succeeded = results.filter(r => r.success);
	const failed = results.filter(r => !r.success);

	if (failed.length === 0) {
		vscode.window.showInformationMessage(
			`Bulk export complete. ${succeeded.length} PNG file(s) saved to: ${outputDir}`,
			'Open Folder'
		).then(choice => {
			if (choice === 'Open Folder') {
				vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outputDir));
			}
		});
	} else {
		const errorLines = failed.map(r => `• ${r.outputName}: ${r.error}`).join('\n');
		vscode.window.showWarningMessage(
			`Bulk export: ${succeeded.length} succeeded, ${failed.length} failed.\n${errorLines}`,
			{ modal: true }
		);
	}
}

/**
 * Run the bulk export flow.
 * @param {vscode.ExtensionContext} context
 * @param {vscode.Uri|undefined} uri  Folder URI passed from Explorer context menu.
 */
async function runBulkExport(context, uri) {
	// 1. Determine source folder
	let sourceDir;
	if (uri && uri.fsPath) {
		sourceDir = uri.fsPath;
	} else {
		const picked = await vscode.window.showOpenDialog({
			canSelectFolders: true,
			canSelectFiles: false,
			canSelectMany: false,
			openLabel: 'Select folder containing .dbml files'
		});
		if (!picked || picked.length === 0) return;
		sourceDir = picked[0].fsPath;
	}

	// 2. Collect .dbml files
	let files;
	try {
		files = collectDbmlFiles(sourceDir);
	} catch (err) {
		vscode.window.showErrorMessage(`Cannot read source folder: ${err.message}`);
		return;
	}

	if (files.length === 0) {
		vscode.window.showWarningMessage('No .dbml files found in the selected folder.');
		return;
	}

	// 3. Determine output folder
	const config = vscode.workspace.getConfiguration('diagram');
	let outputDir = resolveFolderPath(config.get('bulkExport.outputFolder', ''));
	if (!outputDir) {
		outputDir = path.join(sourceDir, 'dbml-exports');
	}

	try {
		fs.mkdirSync(outputDir, { recursive: true });
	} catch (err) {
		vscode.window.showErrorMessage(`Cannot create output folder: ${err.message}`);
		return;
	}

	bulkExportOutputDir = outputDir;
	bulkExportResults = [];

	// 4. Create bulk export panel
	if (bulkExportPanel) {
		bulkExportPanel.dispose();
		bulkExportPanel = null;
	}
	bulkExportPanel = createBulkExportPanel(context);

	// 5. Process files with progress
	await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: 'DBML Bulk Export',
			cancellable: true
		},
		async (progress, token) => {
			await waitForBulkPanelReady();

			for (let i = 0; i < files.length; i++) {
				if (token.isCancellationRequested) break;

				const file = files[i];
				progress.report({
					message: `(${i + 1}/${files.length}) ${file.outputName}`,
					increment: (1 / files.length) * 100
				});

				try {
					const content = fs.readFileSync(file.filePath, 'utf8');
					await processOneBulkFile(file.outputName, content);
				} catch (err) {
					bulkExportResults.push({ outputName: file.outputName, success: false, error: err.message });
				}
			}

			if (bulkExportPanel) {
				bulkExportPanel.dispose();
				bulkExportPanel = null;
			}

			showBulkExportSummary(bulkExportResults, outputDir);
		}
	);
}

function deactivate() {
	// Extension deactivation - panels are automatically cleaned up by VS Code
}

module.exports = {
	activate,
	deactivate
}