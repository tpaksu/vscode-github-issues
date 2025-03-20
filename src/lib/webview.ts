// Description: This file contains the code to build the contents of the webview.

import { components } from '@octokit/openapi-types';
import { OctokitResponse } from '@octokit/types';

export default function buildWebviewContents(
    issue: OctokitResponse<components['schemas']['issue']>,
    issueNumber: number,
    issueUrl: string,
    discussion: string
) {
    return `
        <html>
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'self' https: data:; script-src 'unsafe-inline' 'unsafe-eval';">
                <style>
                    body {
                        font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif);
                        background-color: var(--vscode-editor-background, #f6f8fa);
                        color: var(--vscode-editor-foreground, #24292e);
                        margin: 0;
                        padding: 0;
                        line-height: 1.5;
                    }

                    .container {
                        max-width: 1000px;
                        margin: 0 auto;
                        padding: 32px 48px;
                    }

                    .page-header {
                        margin-bottom: 20px;
                        border-bottom: 1px solid var(--vscode-editorGroup-border, #e1e4e8);
                        padding-bottom: 15px;
                    }

                    .issue-title-container {
                        display: flex;
                        align-items: baseline;
                    }

                    .issue-number {
                        color: var(--vscode-descriptionForeground, #586069);
                        font-weight: normal;
                        margin-left: 10px;
                    }

                    h1 {
                        font-size: 26px;
                        margin-bottom: 10px;
                        margin-top: 0;
                        font-weight: 600;
                        color: var(--vscode-foreground);
                    }

                        .issue {
                        position: relative;
                    }

                    .issue-item {
                        display: flex;
                        margin-bottom: 24px;
                        position: relative;
                    }

                    .issue-badge {
                        flex-shrink: 0;
                        margin-right: 16px;
                    }

                    .issue-state {
                        display: inline-block;
                        padding: 5px 12px;
                        border-radius: 15px;
                        font-weight: 600;
                        font-size: 12px;
                        margin-right: 8px;
                        background-color: var(--vscode-badge-background, #2cbe4e);
                        color: var(--vscode-badge-foreground, #ffffff);
                    }

                    .timeline {
                        position: relative;
                    }

                    .timeline-item {
                        display: flex;
                        margin-bottom: 24px;
                        position: relative;
                        flex-direction: row;
                        align-items: center;
                        gap: 4px;
                        flex-wrap: wrap;
                    }

                    .timeline-item > a {
                        display: flex;
                        align-items: center;
                        flex-direction: row;
                        color: var(--vscode-textLink-foreground);
                        text-decoration: none;
                    }

                    .timeline-item .avatar {
                        width: 20px;
                        height: 20px;
                    }

                    .timeline-item.timeline-item-commented {
                        align-items: flex-start;
                        margin-top: 12px;
                        margin-left: 0;
                        flex-direction: row;
                        flex-wrap: nowrap;
                    }

                    .timeline-item:not(.timeline-item-commented) {
                        margin-left: 80px;
                    }

                    .timeline-item.timeline-item-commented .avatar {
                        width: 40px;
                        height: 40px;
                    }

                    .timeline-item-label {
                        padding: 2px 8px;
                        border-radius: 12px;
                        font-size: 12px;
                        font-weight: 600;
                        margin-left: 4px;
                        color: #ffffffee;
                    }

                    .timeline-item.timeline-item-commented .timeline-item-actor {
                        display: none;
                    }

                    .timeline-badge {
                        flex-shrink: 0;
                        margin-right: 16px;
                    }

                    .avatar {
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        border: 1px solid var(--vscode-editorGroup-border, #e1e4e8);
                    }

                    blockquote {
                        margin: 0;
                        padding: 16px;
                        background-color: var(--vscode-textBlockQuote-background, #f6f8fa);
                        border-left: 4px solid var(--vscode-textBlockQuote-border, #dfe2e5);
                        border-radius: 6px;
                        margin-bottom: 16px;
                    }

                    blockquote p {
                        margin: 0;
                    }

                    li.task-list-item {
                        list-style-type: none;
                    }

                    ul.contains-task-list {
                        list-style-type: none;
                        padding-left: 0;
                    }

                    ol, ul {
                        padding-left: 20px;
                    }

                    .comment {
                        flex-grow: 1;
                        background-color: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-editorGroup-border, #e1e4e8);
                        border-radius: 6px;
                        overflow: hidden;
                        width: calc(100% - 60px);
                    }

                    .comment-header {
                        background-color: var(--vscode-sideBarSectionHeader-background, #f1f8ff);
                        border-bottom: 1px solid var(--vscode-editorGroup-border, #e1e4e8);
                        color: var(--vscode-foreground);
                        padding: 10px 16px;
                        display: flex;
                        justify-content: space-between;
                    }

                    .comment-date {
                        color: var(--vscode-descriptionForeground, #586069);
                        font-size: 12px;
                    }

                    .comment-body {
                        padding: 16px;
                    }

                    .comment-reactions {
                        display: flex;
                        align-items: center;
                        padding: 0 16px 16px;
                    }

                    .comment-reactions img {
                        margin-right: 8px;
                    }

                    .comment-reactions span {
                        margin-right: 16px;
                    }

                    .issue-header {
                        display: flex;
                        margin-bottom: 16px;
                    }

                    .issue-meta {
                        padding-top: 4px;
                    }

                    .issue-author {
                        font-size: 14px;
                    }

                    .issue-date {
                        color: var(--vscode-descriptionForeground, #586069);
                        font-size: 12px;
                        margin-left: 8px;
                    }

                    .issue-body {
                        background-color: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-editorGroup-border, #e1e4e8);
                        border-radius: 6px;
                        padding: 16px;
                        margin-bottom: 24px;
                    }

                    .reply {
                        margin-top: 24px;
                        background-color: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-editorGroup-border, #e1e4e8);
                        border-radius: 6px;
                        padding: 16px;
                        margin-left: 62px;
                    }

                    .reply h2 {
                        font-size: 16px;
                        font-weight: 600;
                        margin-top: 0;
                        margin-bottom: 12px;
                    }

                    .reply textarea {
                        width: calc(100% - 24px);
                        min-height: 100px;
                        padding: 10px;
                        border: 1px solid var(--vscode-editorGroup-border, #e1e4e8);
                        border-radius: 6px;
                        font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif);
                        font-size: 14px;
                        line-height: 1.5;
                        background-color: var(--vscode-input-background, #1e1e1e);
                        color: var(--vscode-input-foreground, #d4d4d4);
                        resize: vertical;
                    }

                    .reply button {
                        margin-top: 12px;
                        padding: 8px 16px;
                        background-color: var(--vscode-button-background, #007acc);
                        color: var(--vscode-button-foreground, #ffffff);
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                    }

                    .reply button:hover {
                        background-color: var(--vscode-button-hoverBackground, #005a9e);
                    }

                    .empty-discussion {
                        text-align: center;
                        padding: 20px;
                        color: var(--vscode-descriptionForeground, #586069);
                    }

                    img {
                        max-width: 100%;
                    }

                    a {
                        color: var(--vscode-textLink-foreground);
                        text-decoration: none;
                    }

                    a:hover {
                        text-decoration: underline;
                    }

                    code {
                        font-family: var(--vscode-editor-font-family, "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace);
                        background-color: var(--vscode-textCodeBlock-background, rgba(27, 31, 35, 0.05));
                        border-radius: 3px;
                        padding: 0.2em 0.4em;
                        font-size: 85%;
                    }

                    pre code {
                        display: block;
                        padding: 16px;
                        overflow: auto;
                        font-size: 85%;
                        line-height: 1.45;
                        background-color: var(--vscode-textCodeBlock-background, #f6f8fa);
                        border-radius: 6px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="page-header">
                        <div class="issue-title-container">
                            <h1>${issue.data.title} <span class="issue-number">#${issueNumber}</span></h1>
                        </div>
                        <div>
                            <span class="issue-state">Open</span>
                            <a href="${issueUrl}" target="_blank">View on GitHub</a>
                        </div>
                    </div>

                    <div class="issue">
                        <div class="issue-item">
                            <div class="issue-badge">
                                <img class="avatar" src="${issue.data.user?.avatar_url}" alt="${
        issue.data.user?.login
    }" />
                            </div>
                            <div class="comment">
                                <div class="comment-header">
                                    <strong>${issue.data.user?.login}</strong>
                                    <span class="comment-date">${new Date(
                                        issue.data.created_at
                                    ).toLocaleDateString()}</span>
                                </div>
                                <div class="comment-body">
                                    ${issue.data.body_html || '<p>No description provided.</p>'}
                                </div>
                            </div>
                        </div>

                        <div id="discussion-content">
                            ${discussion}
                        </div>
                    </div>

                    <div class="reply">
                        <h2>Add a Reply</h2>
                        <textarea id="reply-text" placeholder="Leave a comment"></textarea>
                        <button id="submit-reply">Comment</button>
                    </div>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    document.getElementById('submit-reply').addEventListener('click', () => {
                        const replyText = document.getElementById('reply-text').value;
                        if (replyText.trim() === '') return;

                        document.getElementById('submit-reply').disabled = true;
                        document.getElementById('submit-reply').textContent = 'Submitting...';

                        vscode.postMessage({
                            command: 'submitReply',
                            text: replyText
                        });
                    });

                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.command === 'updateDiscussion') {
                            const discussionContent = document.getElementById('discussion-content');
                            discussionContent.innerHTML += message.newComment;
                            window.scrollTo(0, document.body.scrollHeight);

                            // Reset the form
                            document.getElementById('reply-text').value = '';
                            document.getElementById('submit-reply').disabled = false;
                            document.getElementById('submit-reply').textContent = 'Comment';
                        }
                    });
                </script>
            </body>
        </html>
    `;
}
