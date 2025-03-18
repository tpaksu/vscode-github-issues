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
                    mediaType: {
                        format: 'html',
                    },
                });

                console.log(issue);

                // Fetch comments for the issue (discussion)
                const commentsRes = await octokit.issues.listComments({
                    owner,
                    repo,
                    issue_number: parseInt(issueNumber),
                    mediaType: {
                        format: 'html',
                    },
                });

                const discussion = commentsRes.data.length
                    ? commentsRes.data
                          .map(
                              (comment) => `
                        <div class="comment">
                            <p><strong>${comment.user?.login}</strong> commented:</p>
                            <p>${comment.body_html}</p>
                        </div>
                    `
                          )
                          .join('')
                    : '<p>No discussion available.</p>';

                const panel = vscode.window.createWebviewPanel(
                    'githubIssue',
                    `Issue #${issueNumber}`,
                    vscode.ViewColumn.Two,
                    {}
                );

                const body = issue.data.body_html || '<p>No description provided.</p>';

                const issueUrl = `https://github.com/${owner}/${repo}/issues/${issueNumber}`;

                panel.webview.html = `
                    <html>
                        <head>
                            <meta charset="UTF-8">
                            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'self' https: data:;">
                            <style>
                                body {
                                    font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif);
                                    background-color: var(--vscode-editor-background, #f6f8fa);
                                    color: var(--vscode-editor-foreground, #24292e);
                                    margin: 0;
                                    padding: 0 16px;
                                    line-height: 1.5;
                                }
                                .container {
                                    max-width: 1000px; /* Increased max-width */
                                    margin: 20px auto;
                                    overflow: hidden;
                                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                                }
                                .header {
                                    padding: 20px 0;
                                    display: flex; /* Use flexbox for header elements */
                                    justify-content: space-between; /* Distribute space evenly */
                                    align-items: center; /* Vertically align items */
                                }
                                .header a {
                                    color: var(--vscode-linkColor, #ffffff);
                                    text-decoration: none;
                                }
                                .header h1 {
                                    margin: 0;
                                    font-size: 24px; /* Adjusted font size */
                                    font-weight: 600;
                                }
                                .issue-number {
                                    font-size: 16px; /* Added issue number styling */
                                    color: var(--vscode-secondary-foreground, #586069);
                                }
                                .content {
                                    padding: 20px;
                                    background-color: var(--vscode-editor-background, #fff);
                                    border: 1px solid var(--vscode-editorGroup-border, #e1e4e8);
                                    border-radius: 6px;

                                }
                                .discussion {
                                }
                                .discussion h2 {
                                    margin-top: 40px;
                                    font-size: 20px;
                                    font-weight: 600;
                                    margin-bottom: 15px; /* Added margin below heading */
                                }
                                .comment {
                                    margin-bottom: 20px;
                                    background-color: var(--vscode-editor-background, #fff);
                                    border: 1px solid var(--vscode-editorGroup-border, #e1e4e8);
                                    border-radius: 6px;
                                    padding: 20px;
                                }
                                .comment p {
                                    margin: 0;
                                    padding: 0;
                                }
                                .comment strong {
                                    font-weight: 600; /* Bold commenter's name */
                                }
                                img {
                                    max-width: 100%;
                                }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="header">
                                    <a href="${issueUrl}" target="_blank">
                                        <h1>${issue.data.title}</h1>
                                    </a>
                                </div>
                                <div class="content">
                                    ${body}
                                </div>
                                <div class="discussion">
                                    <h2>Discussion</h2>
                                    ${discussion}
                                </div>
                            </div>
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
