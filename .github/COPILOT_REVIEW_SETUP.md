# GitHub Copilot PR Review Setup

This repository uses GitHub Copilot code review instead of the old GitHub Models workflow.

## One-time student access

1. Go to <https://github.com/settings/education/benefits>.
2. Confirm your GitHub Education student benefits are active.
3. Activate Copilot Student if GitHub prompts you to do so.

## Manual PR reviews

1. Open a pull request on GitHub.
2. In the PR sidebar, request a review from `Copilot`.
3. After pushing new commits, request another review from Copilot if needed.

## Automatic PR reviews

Repository admins can turn this on in GitHub:

1. Open the repository on GitHub.
2. Go to `Settings` > `Rules` > `Rulesets`.
3. Create a new branch ruleset.
4. Set the ruleset status to `Active`.
5. Target the default branch, or whichever branches the team uses for PRs.
6. Under branch rules, enable `Automatically request Copilot code review`.
7. Optionally enable `Review new pushes`.
8. Create the ruleset.

## Review guidance

Copilot reads `.github/copilot-instructions.md` from the PR base branch. Keep that file short and focused; GitHub only uses the beginning of each instruction file for code review.
