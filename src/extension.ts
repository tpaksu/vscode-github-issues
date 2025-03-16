import * as vscode from 'vscode';
import { Octokit } from '@octokit/rest';
import marked from 'marked';

async function getGitHubSession(): Promise<vscode.AuthenticationSession> {
    const scopes = ['repo', 'read:user'];
    try {
        // Get fresh session
        return await vscode.authentication.getSession('github', scopes, {
            createIfNone: true,
        });
    } catch (error) {
        throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('github-issue-viewer.showIssue', async () => {
        try {
            const session = await getGitHubSession();
            if (!session?.accessToken) {
                const retry = 'Retry';
                const result = await vscode.window.showErrorMessage(
                    'GitHub authentication failed. Would you like to try again?',
                    retry
                );
                if (result === retry) {
                    await vscode.commands.executeCommand('github-issue-viewer.showIssue');
                }
                return;
            }

            const octokit = new Octokit({
                auth: session.accessToken,
                userAgent: 'VS Code GitHub Issues Extension',
            });

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

            try {
                const issues = await octokit.issues.listForRepo({
                    owner,
                    repo,
                    filter: 'assigned', // Changed from 'assigned' to 'all' for testing
                    headers: {
                        accept: 'application/vnd.github.v3+json',
                    },
                });

                if (issues.data.length === 0) {
                    vscode.window.showInformationMessage('No issues found for this repository');
                    return;
                }

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

                const issue = await octokit.issues.get({
                    owner,
                    repo,
                    issue_number: parseInt(issueNumber),
                });

                const panel = vscode.window.createWebviewPanel(
                    'githubIssue',
                    `Issue #${issueNumber}`,
                    vscode.ViewColumn.Two,
                    {}
                );

                const body = marked.parse(issue.data.body || '');

                panel.webview.html = `
                    <html>
                        <head>
                            <style>
                                body {
                                    font-family: Arial, sans-serif;
                                    font-size: 16px;
                                    padding: 20px;
                                }
                                h1 {
                                    font-size: 1.5em;
                                }
                                img {
                                    max-width: 100%;
                                }
                            </style>
                        </head>
                        <body>
                            <h1>${issue.data.title}</h1>
                            <div>${body}</div>
                        </body>
                    </html>
                `;
            } catch (error: any) {
                if (error.status === 404) {
                    vscode.window.showErrorMessage("Repository not found or you don't have access to it");
                } else if (error.status === 401) {
                    // Force new authentication session
                    await getGitHubSession();
                    vscode.commands.executeCommand('github-issue-viewer.showIssue');
                } else {
                    vscode.window.showErrorMessage(`GitHub API Error: ${error.message}`);
                }
            }
        } catch (error: any) {
            const retry = 'Retry';
            const result = await vscode.window.showErrorMessage(
                `Authentication error: ${error.message}. Would you like to try again?`,
                retry
            );
            if (result === retry) {
                await vscode.commands.executeCommand('github-issue-viewer.showIssue');
            }
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
