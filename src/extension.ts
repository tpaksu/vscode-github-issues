import * as vscode from 'vscode';
import { Octokit } from '@octokit/rest';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('github-issues.showIssue', async () => {
        const octokit = new Octokit();
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }

        // Get repository info from git config
        const gitConfig = await vscode.workspace.fs.readFile(
            vscode.Uri.joinPath(workspaceFolder.uri, '.git', 'config')
        );
        const configText = Buffer.from(gitConfig).toString('utf8');
        const remoteUrlMatch = configText.match(/url = .*github\.com[:/](.*?)\/(.*?)\.git/);

        if (!remoteUrlMatch) {
            throw new Error('No GitHub repository found');
        }

        const [, owner, repo] = remoteUrlMatch;

        const issues = await octokit.issues.list({
            owner,
            repo,
            filter: 'assigned',
        });

        const items = [
            ...issues.data.map((issue) => ({
                label: `#${issue.number} ${issue.title}`,
                number: issue.number.toString(),
            })),
            { label: 'Enter issue number manually', number: '' },
        ];

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select an issue or enter manually',
        });

        const issueNumber =
            selected?.number ||
            (await vscode.window.showInputBox({
                placeHolder: 'Enter issue number',
                prompt: 'Please enter the GitHub issue number',
            }));

        if (!issueNumber) {
            return;
        }

        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                throw new Error('No workspace folder found');
            }

            // Get repository info from git config
            const gitConfig = await vscode.workspace.fs.readFile(
                vscode.Uri.joinPath(workspaceFolder.uri, '.git', 'config')
            );
            const configText = Buffer.from(gitConfig).toString('utf8');
            const remoteUrlMatch = configText.match(/url = .*github\.com[:/](.*?)\/(.*?)\.git/);

            if (!remoteUrlMatch) {
                throw new Error('No GitHub repository found');
            }

            const [, owner, repo] = remoteUrlMatch;

            const issue = await octokit.issues.get({
                owner,
                repo,
                issue_number: parseInt(issueNumber),
            });

            const panel = vscode.window.createWebviewPanel(
                'githubIssue',
                `Issue #${issueNumber}`,
                vscode.ViewColumn.One,
                {}
            );

            panel.webview.html = `
                <html>
                    <body>
                        <h1>${issue.data.title}</h1>
                        <div>${issue.data.body}</div>
                    </body>
                </html>
            `;
        } catch (error) {
            vscode.window.showErrorMessage('Failed to fetch issue');
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
