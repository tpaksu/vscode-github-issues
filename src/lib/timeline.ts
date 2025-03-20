import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';

TimeAgo.addLocale(en);
const timeAgo = new TimeAgo('en-US');

// Enhanced timeline event interface to match GitHub API structure
interface TimelineEvent {
    event: string;
    actor?: {
        login?: string;
        avatar_url?: string;
        html_url?: string;
    };
    created_at?: string;
    commit_id?: string;
    commit_url?: string;
    performed_via_github_app?: any;
    // Git commit fields
    sha?: string;
    html_url?: string;
    author?: {
        name?: string;
        email?: string;
        date?: string;
    };
    committer?: {
        name?: string;
        email?: string;
        date?: string;
    };
    message?: string;
    // PR review fields
    state?: string;
    body?: string;
    body_html?: string;
    submitted_at?: string;
    // Source fields for cross-references
    source?: {
        type?: string;
        issue?: {
            url?: string;
            html_url?: string;
            title?: string;
        };
        repository?: {
            full_name?: string;
            html_url?: string;
        };
    };
    // Other fields
    [key: string]: any;
}

// Helper functions for common UI patterns
const formatTimeAgo = (dateStr?: string): string => {
    if (!dateStr) return 'Unknown time';
    return timeAgo.format(new Date(dateStr));
};

const createActorLink = (actor?: TimelineEvent['actor']): string => {
    if (!actor) return 'Unknown user';
    const avatarUrl = actor.avatar_url || 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png';
    return `<a href="${actor.html_url || '#'}" target="_blank">
              <div class="timeline-badge">
                  <img class="avatar" src="${avatarUrl}" alt="${actor.login || 'Unknown'}" />
              </div>
              <span class="timeline-item-actor">${actor.login || 'Unknown'}</span>
            </a>`;
};

const createUserLink = (user?: { login?: string; html_url?: string }): string => {
    if (!user) return 'someone';
    return `<a href='${user.html_url || '#'}'>${user.login || 'someone'}</a>`;
};

const createLabelElement = (label?: { name?: string; color?: string }): string => {
    if (!label) return 'a label';
    const color = label.color || '767676';
    return `<div class='timeline-item-label' style='border: 1px solid #${color}; background-color: #${color}80'>${
        label.name || 'Unknown label'
    }</div>`;
};

const createReactionsHtml = (reactions?: any): string => {
    if (!reactions) return '';

    return Object.entries(reactions)
        .map(([reaction, count]: [string, any]) => {
            if (!count || count === 0 || reaction === 'url' || reaction === 'total_count') {
                return false;
            }
            return `
                <img src="https://github.githubassets.com/images/icons/emoji/${reaction}.png" width="16" height="16" alt="${reaction}" />
                <span>${count}</span>
            `;
        })
        .filter(Boolean)
        .join('');
};

export default function buildGithubTimeline(timelineRes: any): string {
    if (!timelineRes?.data || !Array.isArray(timelineRes.data)) {
        return '<div class="empty-discussion">No timeline data available</div>';
    }

    try {
        if (!timelineRes.data.length) {
            return '<div class="empty-discussion">No comments or events</div>';
        }

        return timelineRes.data
            .filter((event: any) => {
                if (!event || typeof event !== 'object') return false;
                if (event.event === 'mentioned' && !event.hasOwnProperty('source')) return false;
                return true;
            })
            .map((event: TimelineEvent) => {
                try {
                    // Special case for commits
                    if (event.event === 'committed' || (event.sha && event.commit)) {
                        const commitUrl = event.html_url || '#';
                        const message = event.message || event.commit?.message || 'Unknown commit message';
                        const author = event.author?.name || event.actor?.login || 'Unknown';
                        const shortSha = (event.sha || '').substring(0, 7);

                        return `<div class="timeline-item timeline-item-committed">
                            <a href="${commitUrl}" target="_blank">
                                <div class="timeline-badge">
                                    <img class="avatar" src="${event.actor?.avatar_url || 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'}" alt="${author}" />
                                </div>
                            </a>
                            <div class="timeline-commit">
                                <span class="commit-author">${author}</span> committed
                                <a href="${commitUrl}" target="_blank" class="commit-sha">${shortSha}</a>:
                                <span class="commit-message">${message}</span>
                                <span class="comment-date">${formatTimeAgo(event.author?.date || event.created_at)}</span>
                            </div>
                        </div>`;
                    }

                    // Special case for reviews
                    if (event.event === 'reviewed') {
                        const reviewStateClass = event.state === 'approved' ? 'review-approved' :
                                                 event.state === 'changes_requested' ? 'review-changes' :
                                                 'review-commented';
                        const reviewStateText = event.state === 'approved' ? 'approved these changes' :
                                                event.state === 'changes_requested' ? 'requested changes' :
                                                'reviewed the pull request';

                        let output = `<div class="timeline-item timeline-item-reviewed ${reviewStateClass}">
                            ${createActorLink(event.user || event.actor)} ${reviewStateText}`;

                        if (event.body || event.body_html) {
                            output += `<div class="comment">
                                <div class="comment-header">
                                    <strong>${event.user?.login || event.actor?.login || 'Unknown'}</strong>
                                    <span class="comment-date">${formatTimeAgo(event.submitted_at || event.created_at)}</span>
                                </div>
                                <div class="comment-body">
                                    ${event.body_html || event.body || ''}
                                </div>
                            </div>`;
                        } else {
                            output += ` ${formatTimeAgo(event.submitted_at || event.created_at)}`;
                        }

                        output += `</div>`;
                        return output;
                    }

                    // Handle missing actor for non-comment events
                    if (!event.actor && event.event !== 'commented') {
                        return `<div class="timeline-item timeline-item-${event.event || 'unknown'}">
                            <span>Unknown user performed action: ${event.event || 'unknown'}</span>
                        </div>`;
                    }

                    // Start the timeline item
                    let output = `<div class="timeline-item timeline-item-${event.event || 'unknown'}">
                        ${createActorLink(event.actor)} `;

                    // Handle the specific event type
                    switch (event.event) {
                        // Label events
                        case 'labeled':
                            output += `added ${createLabelElement(event.label)}`;
                            break;
                        case 'unlabeled':
                            output += `removed ${createLabelElement(event.label)}`;
                            break;

                        // Assignment events
                        case 'assigned':
                            output += `assigned ${createUserLink(event.assignee)}`;
                            break;
                        case 'unassigned':
                            if (
                                event.assignee?.login &&
                                event.actor?.login &&
                                event.assignee.login === event.actor.login
                            ) {
                                output += `removed their assignment`;
                            } else {
                                output += `unassigned ${createUserLink(event.assignee)}`;
                            }
                            break;

                        // Status events
                        case 'ready_for_review':
                            output += `marked as ready for review`;
                            break;
                        case 'closed':
                            output += `closed this`;
                            break;
                        case 'reopened':
                            output += `reopened this`;
                            break;
                        case 'converted_to_draft':
                            output += `converted this to a draft`;
                            break;

                        // Conversation events
                        case 'locked':
                            output += `locked this conversation`;
                            break;
                        case 'unlocked':
                            output += `unlocked this conversation`;
                            break;
                        case 'subscribed':
                            output += `subscribed`;
                            break;
                        case 'connected':
                            output += `connected this issue`;
                            break;

                        // Project events
                        case 'transferred':
                            output += `transferred this issue to ${createUserLink(event.source?.repository)}`;
                            break;
                        case 'added_to_project':
                            output += `added this to a project`;
                            break;
                        case 'removed_from_project':
                            output += `removed this from a project`;
                            break;
                        case 'converted_note_to_issue':
                            output += `converted a project note to this issue`;
                            break;

                        // Milestone events
                        case 'milestoned':
                            output += `added this to the ${createUserLink(event.milestone)} milestone`;
                            break;
                        case 'demilestoned':
                            output += `removed this from the ${createUserLink(event.milestone)} milestone`;
                            break;

                        // Reference events
                        case 'referenced':
                        case 'cross-referenced':
                            const sourceType = event.source?.type || '';
                            const sourceTitle = event.source?.issue?.title || 'Unknown issue';
                            const sourceUrl = event.source?.issue?.html_url || '#';

                            output += `${event.event === 'cross-referenced' ? 'cross-referenced' : 'referenced'} this in `;
                            output += `<a href='${sourceUrl}'>${sourceTitle}</a>`;
                            break;

                        case 'mentioned':
                            if (event.source?.issue) {
                                output += `mentioned this in ${createUserLink(event.source.issue)}`;
                            }
                            break;

                        // Rename events
                        case 'renamed':
                            output += `renamed this from <code>${event.rename?.from || 'Unknown'}</code>
                                to <code>${event.rename?.to || 'Unknown'}</code>`;
                            break;

                        // Review events
                        case 'review_requested':
                            if (event.requested_team) {
                                output += `requested a review from team ${event.requested_team.name || 'Unknown team'}`;
                            } else {
                                output += `requested a review from ${createUserLink(event.requested_reviewer)}`;
                            }
                            break;

                        case 'review_request_removed':
                            if (event.requested_team) {
                                output += `removed the review request for team ${event.requested_team.name || 'Unknown team'}`;
                            } else {
                                output += `removed the review request for ${createUserLink(event.requested_reviewer)}`;
                            }
                            break;

                        // Issue events
                        case 'issue_type_added':
                            output += `added the issue type ${event.issue_type || 'Unknown'}`;
                            break;
                        case 'sub_issue_added':
                            output += `added a sub-issue`;
                            break;
                        case 'parent_issue_added':
                            output += `added a parent issue`;
                            break;

                        // Duplicate events
                        case 'marked_as_duplicate':
                            output += `marked this as a duplicate`;
                            break;
                        case 'unmarked_as_duplicate':
                            output += `unmarked this as a duplicate`;
                            break;

                        // Branch events
                        case 'head_ref_deleted':
                            output += `deleted the source branch`;
                            break;
                        case 'head_ref_restored':
                            output += `restored the source branch`;
                            break;
                        case 'base_ref_changed':
                            output += `changed the base branch`;
                            break;

                        // Special handling for comments
                        case 'commented':
                            const reactionsHtml = createReactionsHtml(event.reactions);

                            output += `<div class="comment">
                                <div class="comment-header">
                                    <strong>${event.user?.login || 'Unknown'}</strong>
                                    <span class="comment-date">${formatTimeAgo(event.created_at)}</span>
                                </div>
                                <div class="comment-body">
                                    ${event.body_html || event.body || 'No content'}
                                </div>
                                ${
                                    event.reactions?.total_count && event.reactions.total_count > 0
                                        ? `<div class="comment-reactions">${reactionsHtml}</div>`
                                        : ''
                                }
                            </div>`;
                            break;

                        // Fallback for unknown events
                        default:
                            output += `${event.event || 'performed an action'}`;
                            if (process.env.NODE_ENV === 'development') {
                                output += `<details><summary>Details</summary><pre>${JSON.stringify(
                                    event,
                                    null,
                                    2
                                )}</pre></details>`;
                            }
                            break;
                    }

                    // Add timestamp for non-comment events
                    if (event.event !== 'commented' && event.created_at) {
                        output += ` ${formatTimeAgo(event.created_at)}`;
                    }

                    output += `</div>`;
                    return output;
                } catch (eventError) {
                    console.error('Error processing timeline event:', eventError);
                    return `<div class="timeline-item timeline-item-error">
                        <span>Error processing event: ${(eventError as Error).message || 'Unknown error'}</span>
                    </div>`;
                }
            })
            .join('');
    } catch (error) {
        console.error('Error building timeline:', error);
        return '<div class="empty-discussion">Error loading timeline</div>';
    }
}
