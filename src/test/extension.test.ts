import * as assert from 'assert';
import * as vscode from 'vscode';
import { parseBranchNameForIssueNumber } from '../extension';

suite('Extension Test Suite', () => {
    
    suite('parseBranchNameForIssueNumber', () => {
        test('should extract issue number from add/123-feature branch', () => {
            const result = parseBranchNameForIssueNumber('add/123-feature-description');
            assert.strictEqual(result, '123');
        });

        test('should extract issue number from fix/456-bug branch', () => {
            const result = parseBranchNameForIssueNumber('fix/456-bug-fix');
            assert.strictEqual(result, '456');
        });

        test('should extract issue number from update/789-enhancement branch', () => {
            const result = parseBranchNameForIssueNumber('update/789-enhancement');
            assert.strictEqual(result, '789');
        });

        test('should extract issue number from feature/123-some-feature branch', () => {
            const result = parseBranchNameForIssueNumber('feature/123-some-feature');
            assert.strictEqual(result, '123');
        });

        test('should extract issue number from bugfix/456-some-bug branch', () => {
            const result = parseBranchNameForIssueNumber('bugfix/456-some-bug');
            assert.strictEqual(result, '456');
        });

        test('should extract issue number from hotfix/789-urgent branch', () => {
            const result = parseBranchNameForIssueNumber('hotfix/789-urgent');
            assert.strictEqual(result, '789');
        });

        test('should extract issue number from chore/321-cleanup branch', () => {
            const result = parseBranchNameForIssueNumber('chore/321-cleanup');
            assert.strictEqual(result, '321');
        });

        test('should extract issue number from direct number branch 123-description', () => {
            const result = parseBranchNameForIssueNumber('123-direct-issue-branch');
            assert.strictEqual(result, '123');
        });

        test('should extract issue number from issue-456-description branch', () => {
            const result = parseBranchNameForIssueNumber('issue-456-description');
            assert.strictEqual(result, '456');
        });

        test('should extract issue number from #789-description branch', () => {
            const result = parseBranchNameForIssueNumber('#789-description');
            assert.strictEqual(result, '789');
        });

        test('should extract issue number from branch with just number at start', () => {
            const result = parseBranchNameForIssueNumber('42');
            assert.strictEqual(result, '42');
        });

        test('should extract issue number from type/number without description', () => {
            const result = parseBranchNameForIssueNumber('fix/999');
            assert.strictEqual(result, '999');
        });

        test('should return null for branch without issue number', () => {
            const result = parseBranchNameForIssueNumber('main');
            assert.strictEqual(result, null);
        });

        test('should return null for develop branch', () => {
            const result = parseBranchNameForIssueNumber('develop');
            assert.strictEqual(result, null);
        });

        test('should return null for feature branch without number', () => {
            const result = parseBranchNameForIssueNumber('feature/new-awesome-feature');
            assert.strictEqual(result, null);
        });

        test('should return null for random text branch', () => {
            const result = parseBranchNameForIssueNumber('random-branch-name');
            assert.strictEqual(result, null);
        });

        test('should handle branches with numbers in middle', () => {
            const result = parseBranchNameForIssueNumber('some-issue-123-description');
            assert.strictEqual(result, '123');
        });

        test('should handle branches with # prefix in middle', () => {
            const result = parseBranchNameForIssueNumber('some-branch-#456-fix');
            assert.strictEqual(result, '456');
        });

        test('should prioritize type/number pattern over issue- pattern', () => {
            const result = parseBranchNameForIssueNumber('fix/123-issue-456-description');
            assert.strictEqual(result, '123'); // Should return the first match from type/number pattern
        });

        test('should prioritize direct number pattern over issue- pattern', () => {
            const result = parseBranchNameForIssueNumber('123-issue-456-description');
            assert.strictEqual(result, '123'); // Should return the first match from direct number pattern
        });

        test('should handle branch name with leading zeros', () => {
            const result = parseBranchNameForIssueNumber('fix/0123-feature');
            assert.strictEqual(result, '0123');
        });

        test('should handle very long issue numbers', () => {
            const result = parseBranchNameForIssueNumber('fix/9999999999-feature');
            assert.strictEqual(result, '9999999999');
        });

        test('should handle branch with only numbers', () => {
            const result = parseBranchNameForIssueNumber('123456789');
            assert.strictEqual(result, '123456789');
        });

        test('should not match numbers after non-dash separator', () => {
            const result = parseBranchNameForIssueNumber('feature_123_description');
            assert.strictEqual(result, null);
        });

        test('should handle complex branch names', () => {
            const result = parseBranchNameForIssueNumber('users/john.doe/feature/123-implement-new-api-endpoint');
            assert.strictEqual(result, '123');
        });

        test('should handle empty string', () => {
            const result = parseBranchNameForIssueNumber('');
            assert.strictEqual(result, null);
        });

        test('should handle whitespace only', () => {
            const result = parseBranchNameForIssueNumber('   ');
            assert.strictEqual(result, null);
        });

        test('should handle branches ending with numbers', () => {
            const result = parseBranchNameForIssueNumber('my-branch-123');
            assert.strictEqual(result, '123');
        });

        test('should handle branches with issue prefix', () => {
            const result = parseBranchNameForIssueNumber('my-issue-456-branch');
            assert.strictEqual(result, '456');
        });

        test('should handle branches with # anywhere', () => {
            const result = parseBranchNameForIssueNumber('branch-#789');
            assert.strictEqual(result, '789');
        });

        test('should handle mixed patterns and pick first valid', () => {
            const result = parseBranchNameForIssueNumber('feature/111-with-issue-222-and-#333');
            assert.strictEqual(result, '111');
        });

        test('should handle branch names with dots', () => {
            const result = parseBranchNameForIssueNumber('v1.2.3/fix/456-hotfix');
            assert.strictEqual(result, '456');
        });

        test('should handle branch names with underscores in type', () => {
            const result = parseBranchNameForIssueNumber('hot_fix/123-urgent');
            assert.strictEqual(result, null); // Should not match as 'hot_fix' is not in our supported types
        });

        test('should handle single digit numbers', () => {
            const result = parseBranchNameForIssueNumber('fix/5-small-fix');
            assert.strictEqual(result, '5');
        });

        test('should handle numbers at the very end', () => {
            const result = parseBranchNameForIssueNumber('my-branch-999');
            assert.strictEqual(result, '999');
        });

        test('should not match numbers in the middle of words', () => {
            const result = parseBranchNameForIssueNumber('feature2branch');
            assert.strictEqual(result, null);
        });

        test('should handle multiple dashes', () => {
            const result = parseBranchNameForIssueNumber('fix/123--double--dashes');
            assert.strictEqual(result, '123');
        });

        test('should handle numbers followed by dash then more text', () => {
            const result = parseBranchNameForIssueNumber('999-some-description-here');
            assert.strictEqual(result, '999');
        });
    });

    suite('Extension Integration Tests', () => {
        test('extension should be present', () => {
            assert.ok(vscode.extensions.getExtension('tpaksu.github-issue-viewer'));
        });
    });
});
