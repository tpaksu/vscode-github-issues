import * as vscode from 'vscode';
import { Octokit, RestEndpointMethodTypes } from '@octokit/rest';

import buildGithubTimeline from './lib/timeline';
import buildWebviewContents from './lib/webview';
import { OctokitResponse } from '@octokit/types';
import { components } from '@octokit/openapi-types';

interface IssueQuickPickItem extends vscode.QuickPickItem {
    number: string;
}

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

            // Try to get issue number from current branch name first
            let issueNumber = await getCurrentBranchIssueNumber(workspaceFolder);
            
            if (issueNumber) {
                // Try to verify the issue exists
                try {
                    await octokit.issues.get({
                        owner,
                        repo,
                        issue_number: parseInt(issueNumber),
                    });
                    // Issue exists, use it directly
                } catch (error: any) {
                    if (error.status === 404) {
                        // Issue doesn't exist, reset and show selection
                        issueNumber = null;
                    } else {
                        throw error; // Re-throw other errors
                    }
                }
            }

            if (!issueNumber) {
                try {
                    const issues = await octokit.issues.listForRepo({
                        owner,
                        repo,
                        filter: 'all',
                        headers: {
                            accept: 'application/vnd.github.v3+json',
                        },
                    });

                    if (issues.data.length === 0) {
                        vscode.window.showInformationMessage('No issues found for this repository');
                        return;
                    }

                    const quickPick = vscode.window.createQuickPick<IssueQuickPickItem>();
                    quickPick.items = [
                        ...issues.data.map((issue): IssueQuickPickItem => ({
                            label: `#${issue.number} ${issue.title}`,
                            detail: issue.body?.substring(0, 100) + (issue.body && issue.body.length > 100 ? '...' : ''),
                            number: issue.number.toString(),
                        })),
                        { label: 'Enter issue number manually', detail: 'Type a specific issue number', number: '' },
                    ];
                    quickPick.placeholder = 'Select an issue or type issue number to filter';
                    quickPick.canSelectMany = false;

                    // Add filtering functionality
                    quickPick.onDidChangeValue(async (value) => {
                        const trimmedValue = value.trim();
                        if (/^\d+$/.test(trimmedValue)) {
                            // User typed a number, filter issues and add direct selection option
                            const issueNum = parseInt(trimmedValue);
                            const filteredIssues = issues.data.filter(issue => 
                                issue.number.toString().includes(trimmedValue) ||
                                issue.title.toLowerCase().includes(trimmedValue.toLowerCase())
                            );
                            
                            quickPick.items = [
                                { label: `#${issueNum} (Direct)`, detail: 'Go directly to this issue number', number: trimmedValue },
                                ...filteredIssues.map((issue): IssueQuickPickItem => ({
                                    label: `#${issue.number} ${issue.title}`,
                                    detail: issue.body?.substring(0, 100) + (issue.body && issue.body.length > 100 ? '...' : ''),
                                    number: issue.number.toString(),
                                })),
                                { label: 'Enter issue number manually', detail: 'Type a specific issue number', number: '' },
                            ];
                        } else if (trimmedValue.length > 0) {
                            // Filter by title/content
                            const filteredIssues = issues.data.filter(issue => 
                                issue.title.toLowerCase().includes(trimmedValue.toLowerCase()) ||
                                issue.body?.toLowerCase().includes(trimmedValue.toLowerCase())
                            );
                            quickPick.items = [
                                ...filteredIssues.map((issue): IssueQuickPickItem => ({
                                    label: `#${issue.number} ${issue.title}`,
                                    detail: issue.body?.substring(0, 100) + (issue.body && issue.body.length > 100 ? '...' : ''),
                                    number: issue.number.toString(),
                                })),
                                { label: 'Enter issue number manually', detail: 'Type a specific issue number', number: '' },
                            ];
                        } else {
                            // Reset to full list
                            quickPick.items = [
                                ...issues.data.map((issue): IssueQuickPickItem => ({
                                    label: `#${issue.number} ${issue.title}`,
                                    detail: issue.body?.substring(0, 100) + (issue.body && issue.body.length > 100 ? '...' : ''),
                                    number: issue.number.toString(),
                                })),
                                { label: 'Enter issue number manually', detail: 'Type a specific issue number', number: '' },
                            ];
                        }
                    });

                    quickPick.show();

                    const selected = await new Promise<IssueQuickPickItem | undefined>((resolve) => {
                        quickPick.onDidAccept(() => {
                            const selection = quickPick.selectedItems[0];
                            quickPick.hide();
                            resolve(selection);
                        });
                        quickPick.onDidHide(() => {
                            resolve(undefined);
                        });
                    });

                    issueNumber =
                        selected?.number ||
                        (await vscode.window.showInputBox({
                            placeHolder: 'Enter issue number',
                            prompt: 'Please enter the GitHub issue number',
                        })) || null;

                    if (!issueNumber) {
                        return;
                    }
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
                    return;
                }
            }

            try {
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

// Separate the branch parsing logic for easier testing
export function parseBranchNameForIssueNumber(branchName: string): string | null {
    // Parse issue number from branch name patterns like:
    // - add/123-feature-description
    // - fix/456-bug-description  
    // - update/789-enhancement-description
    // - feature/123-some-feature
    // - bugfix/456-some-bug
    // - 123-direct-issue-branch
    
    // Pattern 1: [path/]type/[number]-[description] or [path/]type/[number]
    const typeNumberMatch = branchName.match(/(?:^|.*\/)(?:add|fix|update|feature|bugfix|hotfix|chore)\/(\d+)(?:-|$)/);
    if (typeNumberMatch) {
        return typeNumberMatch[1];
    }
    
    // Pattern 2: [number]-[description] (direct issue branch) 
    const directNumberMatch = branchName.match(/^(\d+)(?:-|$)/);
    if (directNumberMatch) {
        return directNumberMatch[1];
    }
    
    // Pattern 3: Any branch containing issue-[number] or #[number]
    const issueMatch = branchName.match(/(?:issue-|#)(\d+)/);
    if (issueMatch) {
        return issueMatch[1];
    }
    
    // Pattern 4: Branch ending with -[number]
    const endingNumberMatch = branchName.match(/-(\d+)$/);
    if (endingNumberMatch) {
        return endingNumberMatch[1];
    }
    
    return null;
}

export async function getCurrentBranchIssueNumber(workspaceFolder: vscode.WorkspaceFolder): Promise<string | null> {
    try {
        // Read the current branch from .git/HEAD
        const headFile = await vscode.workspace.fs.readFile(
            vscode.Uri.joinPath(workspaceFolder.uri, '.git', 'HEAD')
        );
        const headContent = Buffer.from(headFile).toString('utf8').trim();
        
        // Extract branch name from "ref: refs/heads/branch-name"
        const branchMatch = headContent.match(/ref: refs\/heads\/(.+)/);
        if (!branchMatch) {
            return null;
        }
        
        const branchName = branchMatch[1];
        return parseBranchNameForIssueNumber(branchName);
    } catch (error) {
        // Fail silently and return null if we can't read git info
        return null;
    }
}

export function deactivate() {}
