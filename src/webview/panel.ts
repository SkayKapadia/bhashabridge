import * as vscode from 'vscode';

export function openBhashaBridgePanel(): void {
  const panel = vscode.window.createWebviewPanel(
    'bhashabridge',
    'BhashaBridge',
    vscode.ViewColumn.One,
    {}
  );

  panel.webview.html = getHtml();
}

function getHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BhashaBridge</title>
</head>
<body>
  <h1>BhashaBridge is running</h1>
</body>
</html>`;
}
