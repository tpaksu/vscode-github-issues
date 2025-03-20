import * as vscode from 'vscode';
import { Octokit, RestEndpointMethodTypes } from '@octokit/rest';

import buildGithubTimeline from './lib/timeline';
import buildWebviewContents from './lib/webview';
import { OctokitResponse } from '@octokit/types';
import { components } from '@octokit/openapi-types';

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
    let outputChannel = vscode.window.createOutputChannel('GitHub Issues');
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

                const issue = await retrieveIssueData(octokit, owner, repo, issueNumber);

                const timelineRes = await retrieveTimelineEventsForIssue(octokit, owner, repo, issueNumber);

                outputChannel.clear();
                outputChannel.appendLine(`Issue: ${issue.data.title}`);
                outputChannel.appendLine(`Timeline: ${timelineRes.data.length}`);
                outputChannel.append(JSON.stringify(timelineRes.data, null, 2));

                let discussion = buildGithubDiscussionTimeline(timelineRes, outputChannel);

                const panel = vscode.window.createWebviewPanel(
                    'githubIssue',
                    `Issue #${issueNumber}`,
                    vscode.ViewColumn.One,
                    {
                        enableScripts: true, // Enable scripts in the webview
                        enableForms: true, // Enable form submission in the webview
                        enableCommandUris: true, // Enable command URIs in the webview
                    }
                );

                const issueUrl = `https://github.com/${owner}/${repo}/issues/${issueNumber}`;

                try {
                    panel.webview.html = buildWebviewContents(
                        issue as OctokitResponse<components['schemas']['issue']>,
                        +issueNumber,
                        issueUrl,
                        discussion
                    );
                } catch (error: any) {
                    vscode.window.showErrorMessage(`Failed to load issue: ${error.message}`);
                    outputChannel.appendLine(`Failed to load issue: ${error.message}`);
                    outputChannel.append(JSON.stringify(error, null, 2));
                }

                panel.webview.onDidReceiveMessage(async (message) => {
                    if (message.command === 'submitReply') {
                        const replyText = message.text;
                        try {
                            const newComment = await octokit.issues.createComment({
                                owner,
                                repo,
                                issue_number: parseInt(issueNumber),
                                body: replyText,
                            });
                            vscode.window.showInformationMessage('Reply submitted successfully');
                            panel.webview.postMessage({
                                command: 'updateDiscussion',
                                newComment: `
                                    <div class="timeline-item">
                                        <div class="timeline-badge">
                                            <img class="avatar" src="${newComment.data.user?.avatar_url}" alt="${
                                    newComment.data.user?.login
                                }" />
                                        </div>
                                        <div class="comment">
                                            <div class="comment-header">
                                                <strong>${newComment.data.user?.login}</strong>
                                                <span class="comment-date">${new Date(
                                                    newComment.data.created_at
                                                ).toLocaleDateString()}</span>
                                            </div>
                                            <div class="comment-body">
                                                ${newComment.data.body_html}
                                            </div>
                                        </div>
                                    </div>
                                `,
                            });
                        } catch (error: any) {
                            vscode.window.showErrorMessage(`Failed to submit reply: ${error.message}`);
                        }
                    }
                });
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

async function retrieveIssueData(octokit: Octokit, owner: string, repo: string, issueNumber: string) {
    return await octokit.issues.get({
        owner,
        repo,
        issue_number: parseInt(issueNumber),
        mediaType: {
            format: 'html',
        },
    });
}

function buildGithubDiscussionTimeline(
    timelineRes: OctokitResponse<components['schemas']['issue-event'][]>,
    outputChannel: vscode.OutputChannel
) {
    let discussion = '';
    try {
        // Update the discussion to match GitHub's layout
        discussion = buildGithubTimeline(timelineRes);
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to load timeline: ${error.message}`);
        outputChannel.appendLine(`Failed to load timeline: ${error.message}`);
        outputChannel.append(JSON.stringify(error, null, 2));
    }
    return discussion;
}

async function retrieveTimelineEventsForIssue(octokit: Octokit, owner: string, repo: string, issueNumber: string) {
    let allTimelineEvents: RestEndpointMethodTypes['issues']['listEventsForTimeline']['response']['data'] = [];
    let page = 1;
    let hasMorePages = true;

    while (hasMorePages) {
        const timelineRes = await octokit.issues.listEventsForTimeline({
            owner,
            repo,
            issue_number: parseInt(issueNumber),
            mediaType: {
                format: 'html',
            },
            page,
            per_page: 100,
        });

        allTimelineEvents.push(...timelineRes.data);

        // Check if we got less than the requested items, meaning no more pages
        hasMorePages = timelineRes.data.length === 100;
        page++;
    }

    return { data: allTimelineEvents } as OctokitResponse<components['schemas']['issue-event'][]>;
}

export function deactivate() {}
