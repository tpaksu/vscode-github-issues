// Description: This file contains the code to build the contents of the webview.

import { components } from '@octokit/openapi-types';
import { OctokitResponse } from '@octokit/types';

function renderAssignees(assignees: any[]): string {
    if (!assignees || assignees.length === 0) {
        return 'No one assigned';
    }
    return assignees.map(assignee =>
        `<div style="display: flex; align-items: center; margin-bottom: 8px;">
            <img src="${assignee.avatar_url}" alt="${assignee.login}" style="width: 20px; height: 20px; border-radius: 50%; margin-right: 8px;"/>
            ${assignee.login}
        </div>`
    ).join('');
}

function renderLabels(labels: any[]): string {
    if (!labels || labels.length === 0) {
        return 'None yet';
    }
    return labels.map(label => {
        const color = typeof label === 'string' ? '666666' : (label.color || '666666');
        const name = typeof label === 'string' ? label : (label.name || 'Unknown');
        const textColor = getContrastColor('#' + color);
        return `<span class="label" style="background-color: #${color}; color: ${textColor}">${name}</span>`;
    }).join(' ');
}

function getContrastColor(hexColor: string): string {
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#000000' : '#ffffff';
}

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
                    /* GitHub-like styling with VSCode theme colors */
                    body {
                        font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif);
                        background-color: var(--vscode-sideBar-background, #0d1117);
                        color: var(--vscode-foreground, #e6edf3);
                        margin: 0;
                        padding: 0;
                        line-height: 1.5;
                        font-size: 14px;
                    }

                    .github-container {
                        max-width: 1280px;
                        margin: 0 auto;
                        padding: 0;
                        display: flex;
                        gap: 24px;
                    }

                    .main-content {
                        flex: 1;
                        max-width: 896px;
                        padding: 24px;
                    }

                    .sidebar {
                        width: 296px;
                        padding: 24px 0;
                        border-left: 1px solid var(--vscode-editorGroup-border, #30363d);
                        padding-left: 24px;
                    }

                    /* Issue Header */
                    .issue-header {
                        margin-bottom: 16px;
                        padding-bottom: 8px;
                    }

                    .issue-title {
                        font-size: 32px;
                        font-weight: 600;
                        line-height: 1.25;
                        margin: 0 0 8px 0;
                        color: var(--vscode-foreground, #e6edf3);
                        word-break: break-word;
                    }

                    .issue-number {
                        color: var(--vscode-descriptionForeground, #8b949e);
                        font-weight: 400;
                    }

                    .issue-meta {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        margin-bottom: 16px;
                        flex-wrap: wrap;
                    }

                    .issue-state {
                        display: inline-flex;
                        align-items: center;
                        padding: 4px 12px;
                        border-radius: 2em;
                        font-weight: 500;
                        font-size: 14px;
                        line-height: 20px;
                        white-space: nowrap;
                    }

                    .issue-state.open {
                        background-color: var(--vscode-charts-green, #238636);
                        color: var(--vscode-button-foreground, #ffffff);
                    }

                    .issue-state.closed {
                        background-color: var(--vscode-errorForeground, #f85149);
                        color: var(--vscode-button-foreground, #ffffff);
                    }

                    .issue-state::before {
                        content: "";
                        display: inline-block;
                        width: 16px;
                        height: 16px;
                        margin-right: 4px;
                        background: currentColor;
                        mask: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0iY3VycmVudENvbG9yIj48cGF0aCBkPSJNOCAwYTggOCAwIDEgMSAwIDE2QTggOCAwIDAgMSA4IDBaTTEuNSA4YTYuNSA2LjUgMCAxIDAgMTMgMEE2LjUgNi41IDAgMCAwIDEuNSA4WiIvPjwvc3ZnPg==') no-repeat center;
                        -webkit-mask: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0iY3VycmVudENvbG9yIj48cGF0aCBkPSJNOCAwYTggOCAwIDEgMSAwIDE2QTggOCAwIDAgMSA4IDBaTTEuNSA4YTYuNSA2LjUgMCAxIDAgMTMgMEE2LjUgNi41IDAgMCAwIDEuNSA4WiIvPjwvc3ZnPg==') no-repeat center;
                    }

                    .issue-author {
                        color: var(--vscode-descriptionForeground, #8b949e);
                        font-size: 14px;
                    }

                    .issue-author strong {
                        color: var(--vscode-foreground, #e6edf3);
                        font-weight: 600;
                    }

                    .github-link {
                        color: var(--vscode-textLink-foreground, #58a6ff);
                        text-decoration: none;
                        font-size: 14px;
                        margin-left: auto;
                    }

                    .github-link:hover {
                        text-decoration: underline;
                    }

                    /* Discussion Timeline */
                    .discussion {
                        margin-top: 24px;
                    }

                    .timeline-item {
                        display: flex;
                        margin-bottom: 16px;
                        position: relative;
                    }

                    .timeline-item:not(:last-child)::before {
                        content: "";
                        position: absolute;
                        left: 20px;
                        top: 52px;
                        bottom: -16px;
                        width: 2px;
                        background-color: var(--vscode-editorGroup-border, #30363d);
                        z-index: 0;
                    }

                    /* Timeline items without comments use smaller avatars and different line positioning */
                    .timeline-item:not(.timeline-item-commented):not(:last-child)::before {
                        left: 10px;
                        top: 28px;
                    }

                    .avatar {
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        margin-right: 16px;
                        flex-shrink: 0;
                        position: relative;
                        z-index: 1;
                        border: 2px solid var(--vscode-sideBar-background, #0d1117);
                    }

                    .comment-container {
                        flex: 1;
                        min-width: 0;
                    }

                    .comment {
                        border: 1px solid var(--vscode-editorGroup-border, #30363d);
                        border-radius: 8px;
                        background-color: var(--vscode-editor-background, #161b22);
                        position: relative;
                    }

                    .comment::before {
                        content: "";
                        position: absolute;
                        top: 11px;
                        left: -8px;
                        width: 0;
                        height: 0;
                        border: 8px solid transparent;
                        border-right-color: var(--vscode-editorGroup-border, #30363d);
                    }

                    .comment::after {
                        content: "";
                        position: absolute;
                        top: 12px;
                        left: -6px;
                        width: 0;
                        height: 0;
                        border: 7px solid transparent;
                        border-right-color: var(--vscode-editor-background, #161b22);
                    }

                    .comment-header {
                        background-color: var(--vscode-sideBarSectionHeader-background, #21262d);
                        border-bottom: 1px solid var(--vscode-editorGroup-border, #30363d);
                        border-radius: 8px 8px 0 0;
                        padding: 8px 16px;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        font-size: 14px;
                    }

                    .comment-author {
                        font-weight: 600;
                        color: var(--vscode-foreground, #e6edf3);
                    }

                    .comment-association {
                        display: inline-block;
                        padding: 0 6px;
                        font-size: 12px;
                        font-weight: 500;
                        line-height: 18px;
                        border-radius: 12px;
                        background-color: var(--vscode-badge-background, #1f6feb);
                        color: var(--vscode-badge-foreground, #ffffff);
                        margin-left: 4px;
                    }

                    .comment-date {
                        color: var(--vscode-descriptionForeground, #8b949e);
                        font-size: 14px;
                        margin-left: auto;
                    }

                    .comment-body {
                        padding: 16px;
                        color: var(--vscode-foreground, #e6edf3);
                        font-size: 14px;
                        line-height: 1.5;
                    }

                    /* Sidebar */
                    .sidebar-section {
                        margin-bottom: 24px;
                    }

                    .sidebar-section h3 {
                        font-size: 12px;
                        font-weight: 600;
                        color: var(--vscode-descriptionForeground, #8b949e);
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                        margin: 0 0 8px 0;
                    }

                    .sidebar-content {
                        color: var(--vscode-descriptionForeground, #8b949e);
                        font-size: 14px;
                    }

                    /* Timeline Events */
                    .timeline-event {
                        display: flex;
                        align-items: center;
                        margin-bottom: 12px;
                        padding: 8px 0;
                        font-size: 14px;
                        color: var(--vscode-descriptionForeground, #8b949e);
                    }

                    .timeline-event .avatar {
                        width: 20px;
                        height: 20px;
                        margin-right: 8px;
                    }

                    .timeline-event-icon {
                        width: 16px;
                        height: 16px;
                        margin-right: 8px;
                        flex-shrink: 0;
                        opacity: 0.6;
                    }

                    /* Timeline Item Labels */
                    .timeline-item-label {
                        display: inline-block;
                        padding: 2px 8px;
                        font-size: 12px;
                        font-weight: 500;
                        line-height: 18px;
                        border-radius: 12px;
                        margin: 0 4px;
                        white-space: nowrap;
                        vertical-align: middle;
                    }

                    /* Timeline Item Structure */
                    .timeline-item:not(.timeline-item-commented) {
                        align-items: flex-start;
                        padding: 8px 0;
                        font-size: 14px;
                        color: var(--vscode-descriptionForeground, #8b949e);
                        line-height: 1.5;
                    }

                    .timeline-item:not(.timeline-item-commented) .timeline-badge {
                        width: 20px;
                        height: 20px;
                        margin-right: 8px;
                        flex-shrink: 0;
                    }

                    .timeline-item:not(.timeline-item-commented) .timeline-badge .avatar {
                        width: 20px;
                        height: 20px;
                        border: 1px solid var(--vscode-editorGroup-border, #30363d);
                    }

                    .timeline-item:not(.timeline-item-commented) a {
                        color: var(--vscode-textLink-foreground, #58a6ff);
                        text-decoration: none;
                        margin: 0 2px;
                    }

                    .timeline-item:not(.timeline-item-commented) a:hover {
                        text-decoration: underline;
                    }

                    /* Timeline Commit Styling */
                    .timeline-commit {
                        flex: 1;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        flex-wrap: wrap;
                    }

                    .commit-author {
                        font-weight: 600;
                        color: var(--vscode-foreground, #e6edf3);
                    }

                    .commit-sha {
                        font-family: var(--vscode-editor-font-family, "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace);
                        background-color: var(--vscode-textCodeBlock-background, rgba(110, 118, 129, 0.4));
                        border-radius: 4px;
                        padding: 2px 6px;
                        font-size: 12px;
                        margin: 0 4px;
                    }

                    .commit-message {
                        flex: 1;
                        margin: 0 4px;
                    }

                    /* Timeline Event Content */
                    .timeline-item-content {
                        flex: 1;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        flex-wrap: wrap;
                        min-height: 20px;
                    }

                    /* Review timeline items */
                    .timeline-item-reviewed .timeline-item-content {
                        align-items: flex-start;
                        flex-direction: column;
                        gap: 8px;
                    }

                    .timeline-item-reviewed .timeline-item-content > div:first-child {
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        flex-wrap: wrap;
                    }

                    /* Labels */
                    .label {
                        display: inline-block;
                        padding: 2px 8px;
                        font-size: 12px;
                        font-weight: 500;
                        line-height: 18px;
                        border-radius: 12px;
                        margin-right: 4px;
                        margin-bottom: 4px;
                    }

                    /* Code blocks and syntax highlighting */
                    code {
                        font-family: var(--vscode-editor-font-family, "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace);
                        background-color: var(--vscode-textCodeBlock-background, rgba(110, 118, 129, 0.4));
                        border-radius: 6px;
                        padding: 0.2em 0.4em;
                        font-size: 85%;
                    }

                    pre {
                        background-color: var(--vscode-textCodeBlock-background, #161b22);
                        border-radius: 6px;
                        padding: 16px;
                        overflow: auto;
                        border: 1px solid var(--vscode-editorGroup-border, #30363d);
                    }

                    pre code {
                        background: transparent;
                        padding: 0;
                        border-radius: 0;
                        display: block;
                        font-size: 85%;
                        line-height: 1.45;
                    }

                    /* Blockquotes */
                    blockquote {
                        margin: 0 0 16px 0;
                        padding: 0 1em;
                        color: var(--vscode-descriptionForeground, #8b949e);
                        border-left: 4px solid var(--vscode-editorGroup-border, #30363d);
                    }

                    blockquote p {
                        margin: 0;
                    }

                    /* GitHub-style callout boxes */
                    .markdown-alert {
                        padding: 8px 16px;
                        margin-bottom: 16px;
                        border-left: 4px solid;
                        border-radius: 0 6px 6px 0;
                        position: relative;
                    }

                    .markdown-alert > :first-child {
                        margin-top: 0;
                    }

                    .markdown-alert > :last-child {
                        margin-bottom: 0;
                    }

                    .markdown-alert-title {
                        display: flex;
                        align-items: center;
                        font-weight: 600;
                        margin-top: 0;
                        margin-left: -24px;
                        font-size: 14px;
                        margin-bottom: -8px;
                    }

                    .markdown-alert-title svg {
                        margin-right: 8px;
                        width: 16px;
                        height: 16px;
                        flex-shrink: 0;
                    }

                    /* Note - Blue */
                    .markdown-alert-note {
                        border-left-color: var(--vscode-charts-blue, #1f6feb);
                        background-color: rgba(31, 111, 235, 0.1);
                    }

                    .markdown-alert-note .markdown-alert-title {
                        color: var(--vscode-charts-blue, #1f6feb);
                    }

                    .markdown-alert-note .markdown-alert-title::before {
                        content: "";
                        display: inline-block;
                        width: 16px;
                        height: 16px;
                        margin-right: 8px;
                        flex-shrink: 0;
                        background-color: currentColor;
                        mask: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0iY3VycmVudENvbG9yIj48cGF0aCBkPSJNMCA4YTggOCAwIDEgMSAxNiAwQTggOCAwIDAgMSAwIDhabTguNS0zYTEgMSAwIDAgMC0xLTF2LTFhMSAxIDAgMCAwLTIgMHYxYTEgMSAwIDAgMC0xIDFoNFptMCA2YTEgMSAwIDAgMC0xLTF2LTRWN2ExIDEgMCAwIDAtMiAwdjVhMSAxIDAgMCAwIDEgMWg0WiIvPjwvc3ZnPg==') no-repeat center;
                        -webkit-mask: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0iY3VycmVudENvbG9yIj48cGF0aCBkPSJNMCA4YTggOCAwIDEgMSAxNiAwQTggOCAwIDAgMSAwIDhabTguNS0zYTEgMSAwIDAgMC0xLTF2LTFhMSAxIDAgMCAwLTIgMHYxYTEgMSAwIDAgMC0xIDFoNFptMCA2YTEgMSAwIDAgMC0xLTF2LTRWN2ExIDEgMCAwIDAtMiAwdjVhMSAxIDAgMCAwIDEgMWg0WiIvPjwvc3ZnPg==') no-repeat center;
                    }

                    /* Important - Purple */
                    .markdown-alert-important {
                        border-left-color: var(--vscode-charts-purple, #8250df);
                        background-color: rgba(130, 80, 223, 0.1);
                    }

                    .markdown-alert-important .markdown-alert-title {
                        color: var(--vscode-charts-purple, #8250df);
                    }

                    .markdown-alert-important .markdown-alert-title::before {
                        content: "";
                        display: inline-block;
                        width: 16px;
                        height: 16px;
                        margin-right: 8px;
                        flex-shrink: 0;
                        background-color: currentColor;
                        mask: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0iY3VycmVudENvbG9yIj48cGF0aCBkPSJNMCA4YTggOCAwIDEgMSAxNiAwQTggOCAwIDAgMSAwIDhabTggNmExIDEgMCAwIDAtMS0xVjhhMSAxIDAgMCAwLTItMHY1YTEgMSAwIDAgMCAxIDFoNFptMC00YTEgMSAwIDAgMC0xLTFWNGExIDEgMCAwIDAtMiAwdjVhMSAxIDAgMCAwIDEgMWg0WiIvPjwvc3ZnPg==') no-repeat center;
                        -webkit-mask: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0iY3VycmVudENvbG9yIj48cGF0aCBkPSJNMCA4YTggOCAwIDEgMSAxNiAwQTggOCAwIDAgMSAwIDhabTggNmExIDEgMCAwIDAtMS0xVjhhMSAxIDAgMCAwLTItMHY1YTEgMSAwIDAgMCAxIDFoNFptMC00YTEgMSAwIDAgMC0xLTFWNGExIDEgMCAwIDAtMiAwdjVhMSAxIDAgMCAwIDEgMWg0WiIvPjwvc3ZnPg==') no-repeat center;
                    }

                    /* Warning - Yellow/Orange */
                    .markdown-alert-warning {
                        border-left-color: var(--vscode-charts-orange, #d1242f);
                        background-color: rgba(209, 36, 47, 0.1);
                    }

                    .markdown-alert-warning .markdown-alert-title {
                        color: var(--vscode-charts-orange, #d1242f);
                    }

                    .markdown-alert-warning .markdown-alert-title::before {
                        content: "";
                        display: inline-block;
                        width: 16px;
                        height: 16px;
                        margin-right: 8px;
                        flex-shrink: 0;
                        background-color: currentColor;
                        mask: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0iY3VycmVudENvbG9yIj48cGF0aCBkPSJNNi40NTcgMS4wNDdjLjY0Mi0xLjM5NiAyLjQ0NC0xLjM5NiAzLjA4NiAwbDYuMDg3IDEzLjI3OGMuNjE4IDEuMzQzLS40MzEgMi44MjEtMS45NDMgMi44MjFIMi4zMTNjLTEuNTEyIDAtMi41NjEtMS40NzgtMS45NDMtMi44MjFMNi40NTcgMS4wNDdaTTggNmExIDEgMCAwIDAtMSAxdjMuMjVhMSAxIDAgMCAwIDIgMFY3YTEgMSAwIDAgMC0xLTFabTAgOWExIDEgMCAxIDAgMC0yIDEgMSAwIDAgMCAwIDJaIi8+PC9zdmc+') no-repeat center;
                        -webkit-mask: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0iY3VycmVudENvbG9yIj48cGF0aCBkPSJNNi40NTcgMS4wNDdjLjY0Mi0xLjM5NiAyLjQ0NC0xLjM5NiAzLjA4NiAwbDYuMDg3IDEzLjI3OGMuNjE4IDEuMzQzLS40MzEgMi44MjEtMS45NDMgMi44MjFIMi4zMTNjLTEuNTEyIDAtMi41NjEtMS40NzgtMS45NDMtMi44MjFMNi40NTcgMS4wNDdaTTggNmExIDEgMCAwIDAtMSAxdjMuMjVhMSAxIDAgMCAwIDIgMFY3YTEgMSAwIDAgMC0xLTFabTAgOWExIDEgMCAxIDAgMC0yIDEgMSAwIDAgMCAwIDJaIi8+PC9zdmc+') no-repeat center;
                    }

                    /* Caution - Yellow */
                    .markdown-alert-caution {
                        border-left-color: var(--vscode-charts-yellow, #bf8700);
                        background-color: rgba(191, 135, 0, 0.1);
                    }

                    .markdown-alert-caution .markdown-alert-title {
                        color: var(--vscode-charts-yellow, #bf8700);
                    }

                    .markdown-alert-caution .markdown-alert-title::before {
                        content: "";
                        display: inline-block;
                        width: 16px;
                        height: 16px;
                        margin-right: 8px;
                        flex-shrink: 0;
                        background-color: currentColor;
                        mask: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0iY3VycmVudENvbG9yIj48cGF0aCBkPSJNNi40NTcgMS4wNDdjLjY0Mi0xLjM5NiAyLjQ0NC0xLjM5NiAzLjA4NiAwbDYuMDg3IDEzLjI3OGMuNjE4IDEuMzQzLS40MzEgMi44MjEtMS45NDMgMi44MjFIMi4zMTNjLTEuNTEyIDAtMi41NjEtMS40NzgtMS45NDMtMi44MjFMNi40NTcgMS4wNDdaTTggNmExIDEgMCAwIDAtMSAxdjMuMjVhMSAxIDAgMCAwIDIgMFY3YTEgMSAwIDAgMC0xLTFabTAgOWExIDEgMCAxIDAgMC0yIDEgMSAwIDAgMCAwIDJaIi8+PC9zdmc+') no-repeat center;
                        -webkit-mask: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0iY3VycmVudENvbG9yIj48cGF0aCBkPSJNNi40NTcgMS4wNDdjLjY0Mi0xLjM5NiAyLjQ0NC0xLjM5NiAzLjA4NiAwbDYuMDg3IDEzLjI3OGMuNjE4IDEuMzQzLS40MzEgMi44MjEtMS45NDMgMi44MjFIMi4zMTNjLTEuNTEyIDAtMi41NjEtMS40NzgtMS45NDMtMi44MjFMNi40NTcgMS4wNDdaTTggNmExIDEgMCAwIDAtMSAxdjMuMjVhMSAxIDAgMCAwIDIgMFY3YTEgMSAwIDAgMC0xLTFabTAgOWExIDEgMCAxIDAgMC0yIDEgMSAwIDAgMCAwIDJaIi8+PC9zdmc+') no-repeat center;
                    }

                    /* Tip - Green */
                    .markdown-alert-tip {
                        border-left-color: var(--vscode-charts-green, #1a7f37);
                        background-color: rgba(26, 127, 55, 0.1);
                    }

                    .markdown-alert-tip .markdown-alert-title {
                        color: var(--vscode-charts-green, #1a7f37);
                    }

                    .markdown-alert-tip .markdown-alert-title::before {
                        content: "";
                        display: inline-block;
                        width: 16px;
                        height: 16px;
                        margin-right: 8px;
                        flex-shrink: 0;
                        background-color: currentColor;
                        mask: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0iY3VycmVudENvbG9yIj48cGF0aCBkPSJNOCAxLjVjLTIuMzYzIDAtMy42MjkgMS4xODItMy42MjkgMi4xODIgMCAuNTUzLjM5MyAxLjE2OCAxLjE2MiAxLjE2OGgwYzUuODUgMCA5Ljg2NyAxLjM3IDkuODY3IDMuNzVhMi4yNSAyLjI1IDAgMCAxLTQuNTczIDEuNzE4IDEgMSAwIDAgMS0xLjUxNi0xLjY5OHoiLz48L3N2Zz4=') no-repeat center;
                        -webkit-mask: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0iY3VycmVudENvbG9yIj48cGF0aCBkPSJtOS4xMTQgMS4xMjUgMy45MTYtLjc4M2MuMzU4LS4wNzMuNzI1LjEwOC45MjguMzkzLjIwMy4yODUuMjczLjY1Mi4xNzMuOTg3bC0xLjY5MyA1LjY0OCAzLjExNiAxLjMyM2MuMzk4LjE2OS42Mi41NzUuNTM0Ljk5My0uMDg1LjQxOC0uMzg4Ljc1NC0uNzY2Ljg1bC01IDE0LjE3OGMtLjEwNy4zMDEtLjMwNi41NS0uNTc3LjczNXoiLz48L3N2Zz4=') no-repeat center;
                    }

                    /* Legacy blockquote fallbacks for non-GitHub callouts */
                    blockquote:not(.markdown-alert) {
                        margin: 0 0 16px 0;
                        padding: 0 1em;
                        color: var(--vscode-descriptionForeground, #8b949e);
                        border-left: 4px solid var(--vscode-editorGroup-border, #30363d);
                    }

                    blockquote:not(.markdown-alert) p {
                        margin: 0;
                    }


                    /* Lists */
                    ul, ol {
                        padding-left: 20px;
                        margin: 0 0 16px 0;
                    }

                    li {
                        margin: 4px 0;
                    }

                    li.task-list-item {
                        list-style-type: none;
                        margin-left: -20px;
                    }

                    ul.contains-task-list {
                        padding-left: 0;
                    }

                    /* Links */
                    a {
                        color: var(--vscode-textLink-foreground, #58a6ff);
                        text-decoration: none;
                    }

                    a:hover {
                        text-decoration: underline;
                    }

                    /* Images */
                    img {
                        max-width: 100%;
                        height: auto;
                        border-radius: 6px;
                    }

                    /* Tables */
                    table {
                        border-collapse: collapse;
                        width: 100%;
                        margin: 16px 0;
                    }

                    th, td {
                        border: 1px solid var(--vscode-editorGroup-border, #30363d);
                        padding: 8px 12px;
                        text-align: left;
                    }

                    th {
                        background-color: var(--vscode-sideBarSectionHeader-background, #21262d);
                        font-weight: 600;
                    }

                    /* Reply Form */
                    .reply-form {
                        margin-top: 24px;
                        display: flex;
                        gap: 16px;
                    }

                    .reply-form .avatar {
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        flex-shrink: 0;
                    }

                    .reply-container {
                        flex: 1;
                    }

                    .reply-box {
                        border: 1px solid var(--vscode-editorGroup-border, #30363d);
                        border-radius: 8px;
                        background-color: var(--vscode-input-background, #0d1117);
                        overflow: hidden;
                    }

                    .reply-tabs {
                        display: flex;
                        background-color: var(--vscode-sideBarSectionHeader-background, #21262d);
                        border-bottom: 1px solid var(--vscode-editorGroup-border, #30363d);
                    }

                    .reply-tab {
                        padding: 8px 16px;
                        font-size: 14px;
                        font-weight: 500;
                        color: var(--vscode-descriptionForeground, #8b949e);
                        cursor: pointer;
                        border: none;
                        background: none;
                        border-bottom: 2px solid transparent;
                    }

                    .reply-tab.active {
                        color: var(--vscode-foreground, #e6edf3);
                        border-bottom-color: var(--vscode-focusBorder, #1f6feb);
                    }

                    .reply-textarea {
                        width: 100%;
                        min-height: 120px;
                        padding: 16px;
                        border: none;
                        resize: vertical;
                        font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif);
                        font-size: 14px;
                        line-height: 1.5;
                        background-color: var(--vscode-input-background, #0d1117);
                        color: var(--vscode-input-foreground, #e6edf3);
                        outline: none;
                    }

                    .reply-textarea::placeholder {
                        color: var(--vscode-input-placeholderForeground, #6e7681);
                    }

                    .reply-actions {
                        display: flex;
                        justify-content: flex-end;
                        padding: 12px 16px;
                        background-color: var(--vscode-sideBarSectionHeader-background, #21262d);
                        border-top: 1px solid var(--vscode-editorGroup-border, #30363d);
                    }

                    .reply-button {
                        padding: 6px 16px;
                        font-size: 14px;
                        font-weight: 500;
                        border-radius: 6px;
                        border: none;
                        cursor: pointer;
                        transition: background-color 0.2s ease;
                    }

                    .reply-button.primary {
                        background-color: var(--vscode-button-background, #238636);
                        color: var(--vscode-button-foreground, #ffffff);
                    }

                    .reply-button.primary:hover {
                        background-color: var(--vscode-button-hoverBackground, #2ea043);
                    }

                    .reply-button.primary:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                    }

                    /* Reply Content Container */
                    .reply-content {
                        position: relative;
                        min-height: 120px;
                    }

                    /* Reply Preview */
                    .reply-preview {
                        min-height: 120px;
                        padding: 16px;
                        border: none;
                        background-color: var(--vscode-input-background, #0d1117);
                        color: var(--vscode-input-foreground, #e6edf3);
                        font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif);
                        font-size: 14px;
                        line-height: 1.5;
                        overflow-y: auto;
                    }

                    .preview-placeholder {
                        color: var(--vscode-input-placeholderForeground, #6e7681);
                        font-style: italic;
                        text-align: center;
                        padding: 32px 16px;
                    }

                    /* Empty states */
                    .empty-discussion {
                        text-align: center;
                        padding: 32px 16px;
                        color: var(--vscode-descriptionForeground, #8b949e);
                        font-size: 14px;
                    }

                    /* Responsive design */
                    @media (max-width: 1012px) {
                        .github-container {
                            flex-direction: column;
                        }

                        .sidebar {
                            width: 100%;
                            border-left: none;
                            border-top: 1px solid var(--vscode-editorGroup-border, #30363d);
                            padding-left: 0;
                            padding-top: 24px;
                        }

                        .main-content {
                            max-width: none;
                        }
                    }

                    @media (max-width: 768px) {
                        .main-content {
                            padding: 16px;
                        }

                        .issue-title {
                            font-size: 24px;
                        }

                        .avatar {
                            width: 32px;
                            height: 32px;
                        }

                        .reply-form .avatar {
                            width: 32px;
                            height: 32px;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="github-container">
                    <div class="main-content">
                        <!-- Issue Header -->
                        <div class="issue-header">
                            <h1 class="issue-title">
                                ${issue.data.title}
                                <span class="issue-number">#${issueNumber}</span>
                            </h1>
                            <div class="issue-meta">
                                <span class="issue-state open">Open</span>
                                <span class="issue-author">
                                    <strong>${issue.data.user?.login}</strong> opened this issue on
                                    ${new Date(issue.data.created_at).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                    })}
                                </span>
                                <a href="${issueUrl}" target="_blank" class="github-link">View on GitHub →</a>
                            </div>
                        </div>

                        <!-- Discussion Timeline -->
                        <div class="discussion">
                            <!-- Original Issue Comment -->
                            <div class="timeline-item">
                                <img class="avatar" src="${issue.data.user?.avatar_url}" alt="${issue.data.user?.login}" />
                                <div class="comment-container">
                                    <div class="comment">
                                        <div class="comment-header">
                                            <span class="comment-author">${issue.data.user?.login}</span>
                                            <span class="comment-association">Author</span>
                                            <span class="comment-date">
                                                ${new Date(issue.data.created_at).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                        <div class="comment-body">
                                            ${issue.data.body_html || '<p><em>No description provided.</em></p>'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Timeline Events -->
                            <div id="discussion-content">
                                ${discussion}
                            </div>
                        </div>

                        <!-- Reply Form -->
                        <div class="reply-form">
                            <img class="avatar" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iMjAiIGZpbGw9IiM3QzNBRUQiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0xMiAxMkM5Ljc5IDEyIDggMTAuMjEgOCA4UzkuNzkgNiAxMiA2UzE2IDcuNzkgMTYgMTBTMTQuMjEgMTIgMTIgMTJaTTEyIDRDNy41OCA0IDQgNy41OCA0IDEyUzcuNTggMjAgMTIgMjBTMjAgMTYuNDIgMjAgMTJTMTYuNDIgNCAxMiA0WiIgZmlsbD0iIzRGNDZBMSIvPgo8L3N2Zz4KPC9zdmc+" alt="You" />
                            <div class="reply-container">
                                <div class="reply-box">
                                    <div class="reply-tabs">
                                        <button class="reply-tab active" data-tab="write">Write</button>
                                        <button class="reply-tab" data-tab="preview">Preview</button>
                                    </div>
                                    <div class="reply-content">
                                        <textarea id="reply-text" class="reply-textarea" placeholder="Leave a comment"></textarea>
                                        <div id="reply-preview" class="reply-preview" style="display: none;">
                                            <div class="preview-placeholder">Nothing to preview</div>
                                        </div>
                                    </div>
                                    <div class="reply-actions">
                                        <button id="submit-reply" class="reply-button primary">Comment</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Sidebar -->
                    <div class="sidebar">
                        <div class="sidebar-section">
                            <h3>Assignees</h3>
                            <div class="sidebar-content">
                                ${renderAssignees(issue.data.assignees || [])}
                            </div>
                        </div>

                        <div class="sidebar-section">
                            <h3>Labels</h3>
                            <div class="sidebar-content">
                                ${renderLabels(issue.data.labels || [])}
                            </div>
                        </div>

                        <div class="sidebar-section">
                            <h3>Milestone</h3>
                            <div class="sidebar-content">
                                ${issue.data.milestone ? issue.data.milestone.title : 'No milestone'}
                            </div>
                        </div>
                    </div>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();

                    // Reply form functionality
                    document.getElementById('submit-reply').addEventListener('click', () => {
                        const replyText = document.getElementById('reply-text').value;
                        if (replyText.trim() === '') return;

                        const submitButton = document.getElementById('submit-reply');
                        submitButton.disabled = true;
                        submitButton.textContent = 'Commenting...';

                        vscode.postMessage({
                            command: 'submitReply',
                            text: replyText
                        });
                    });

                    // Handle keyboard shortcuts
                    document.getElementById('reply-text').addEventListener('keydown', (e) => {
                        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                            document.getElementById('submit-reply').click();
                        }
                    });

                    // Tab switching functionality
                    const tabs = document.querySelectorAll('.reply-tab');
                    const textarea = document.getElementById('reply-text');
                    const preview = document.getElementById('reply-preview');
                    
                    console.log('Tab switching setup - Found elements:', {
                        tabs: tabs.length,
                        textarea: !!textarea,
                        preview: !!preview
                    });

                    tabs.forEach((tab, index) => {
                        console.log('Adding click listener to tab', index, tab.getAttribute('data-tab'));
                        tab.addEventListener('click', (e) => {
                            console.log('Tab clicked:', tab.getAttribute('data-tab'));
                            e.preventDefault();
                            
                            // Remove active class from all tabs
                            tabs.forEach(t => t.classList.remove('active'));
                            // Add active class to clicked tab
                            tab.classList.add('active');

                            const tabType = tab.getAttribute('data-tab');
                            if (tabType === 'write') {
                                console.log('Switching to write tab');
                                if (textarea) textarea.style.display = 'block';
                                if (preview) preview.style.display = 'none';
                            } else if (tabType === 'preview') {
                                console.log('Switching to preview tab');
                                if (textarea) textarea.style.display = 'none';
                                if (preview) preview.style.display = 'block';
                                updatePreview();
                            }
                        });
                    });

                    // Simple markdown rendering function
                    function renderMarkdown(text) {
                        if (!text.trim()) {
                            return '<div class=\"preview-placeholder\">Nothing to preview</div>';
                        }

                        // Basic markdown rendering
                        let html = text
                            // Headers
                            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                            // Bold
                            .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>')
                            .replace(/__(.*?)__/g, '<strong>$1</strong>')
                            // Italic
                            .replace(/\\*(.*?)\\*/g, '<em>$1</em>')
                            .replace(/_(.*?)_/g, '<em>$1</em>')
                            // Code
                            .replace(/\`(.*?)\`/g, '<code>$1</code>')
                            // Links
                            .replace(/\\[([^\\]]+)\\]\\(([^\\)]+)\\)/g, '<a href=\"$2\" target=\"_blank\">$1</a>')
                            // Line breaks
                            .replace(/\\n/g, '<br>');

                        return html;
                    }

                    // Update preview content
                    function updatePreview() {
                        console.log('updatePreview called');
                        if (!textarea || !preview) {
                            console.error('Missing textarea or preview elements in updatePreview');
                            return;
                        }
                        
                        const text = textarea.value;
                        console.log('Preview text length:', text.length);
                        const rendered = renderMarkdown(text);
                        preview.innerHTML = rendered;
                        
                        // Apply callout transformation to preview as well
                        try {
                            transformGitHubCallouts();
                        } catch (error) {
                            console.error('Error in transformGitHubCallouts:', error);
                        }
                    }

                    // Update preview when typing (debounced)
                    let previewTimeout;
                    if (textarea) {
                        textarea.addEventListener('input', () => {
                            clearTimeout(previewTimeout);
                            previewTimeout = setTimeout(() => {
                                const previewTab = document.querySelector('.reply-tab[data-tab=\"preview\"]');
                                if (previewTab && previewTab.classList.contains('active')) {
                                    updatePreview();
                                }
                            }, 300);
                        });
                    }

                    // Handle messages from extension
                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.command === 'updateDiscussion') {
                            const discussionContent = document.getElementById('discussion-content');

                            // Create new comment with GitHub styling
                            const newCommentHtml = \`
                                <div class="timeline-item">
                                    <img class="avatar" src="\${message.newComment.user?.avatar_url || 'https://github.com/identicons/app/identicons/user.png'}" alt="\${message.newComment.user?.login || 'You'}" />
                                    <div class="comment-container">
                                        <div class="comment">
                                            <div class="comment-header">
                                                <span class="comment-author">\${message.newComment.user?.login || 'You'}</span>
                                                <span class="comment-date">just now</span>
                                            </div>
                                            <div class="comment-body">
                                                \${message.newComment.body_html || message.newComment.body}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            \`;

                            discussionContent.innerHTML += newCommentHtml;

                            // Smooth scroll to new comment
                            setTimeout(() => {
                                window.scrollTo({
                                    top: document.body.scrollHeight,
                                    behavior: 'smooth'
                                });
                            }, 100);

                            // Reset the form
                            document.getElementById('reply-text').value = '';
                            const submitButton = document.getElementById('submit-reply');
                            submitButton.disabled = false;
                            submitButton.textContent = 'Comment';
                        }
                    });

                    // Auto-resize textarea
                    const textarea = document.getElementById('reply-text');
                    textarea.addEventListener('input', function() {
                        this.style.height = 'auto';
                        this.style.height = Math.max(120, this.scrollHeight) + 'px';
                    });

                    // Transform GitHub callouts from rendered HTML
                    function transformGitHubCallouts() {
                        const commentBodies = document.querySelectorAll('.comment-body');

                        commentBodies.forEach(body => {
                            // Find blockquotes that start with callout keywords
                            const blockquotes = body.querySelectorAll('blockquote');

                            blockquotes.forEach(blockquote => {
                                const firstParagraph = blockquote.querySelector('p:first-child');
                                if (!firstParagraph) return;

                                const text = firstParagraph.textContent.trim().toLowerCase();
                                let calloutType = null;
                                let calloutTitle = '';

                                // Detect callout type from text content
                                if (text.startsWith('[!note]') || text.startsWith('**note**') || text.startsWith('note:')) {
                                    calloutType = 'note';
                                    calloutTitle = 'Note';
                                } else if (text.startsWith('[!important]') || text.startsWith('**important**') || text.startsWith('important:')) {
                                    calloutType = 'important';
                                    calloutTitle = 'Important';
                                } else if (text.startsWith('[!warning]') || text.startsWith('**warning**') || text.startsWith('warning:')) {
                                    calloutType = 'warning';
                                    calloutTitle = 'Warning';
                                } else if (text.startsWith('[!caution]') || text.startsWith('**caution**') || text.startsWith('caution:')) {
                                    calloutType = 'caution';
                                    calloutTitle = 'Caution';
                                } else if (text.startsWith('[!tip]') || text.startsWith('**tip**') || text.startsWith('tip:')) {
                                    calloutType = 'tip';
                                    calloutTitle = 'Tip';
                                }

                                if (calloutType) {
                                    // Transform the blockquote into a GitHub-style alert
                                    blockquote.className = \`markdown-alert markdown-alert-\${calloutType}\`;

                                    // Remove the callout keyword from the first paragraph
                                    let content = firstParagraph.innerHTML;
                                    content = content.replace(/^\\[!\\w+\\]\\s*/i, '');
                                    content = content.replace(/^\\*\\*\\w+\\*\\*\\s*/i, '');
                                    content = content.replace(/^\\w+:\\s*/i, '');

                                    // Create title element
                                    const titleElement = document.createElement('div');
                                    titleElement.className = 'markdown-alert-title';
                                    titleElement.textContent = calloutTitle;

                                    // Update first paragraph content
                                    firstParagraph.innerHTML = content;

                                    // Insert title at the beginning if there's meaningful content
                                    if (content.trim()) {
                                        blockquote.insertBefore(titleElement, firstParagraph);
                                    } else {
                                        // If first paragraph is empty after removing keyword, remove it
                                        firstParagraph.remove();
                                        blockquote.insertBefore(titleElement, blockquote.firstChild);
                                    }
                                }
                            });
                        });
                    }

                    // Run callout transformation on page load
                    transformGitHubCallouts();
                </script>
            </body>
        </html>
    `;
}
