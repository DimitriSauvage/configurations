import { execSync } from "child_process";

/**
 * Executes a shell command and returns stdout trimmed.
 * Throws an error if execution fails unless suppressError is true.
 */
function run(command: string, suppressError: boolean = false): string {
    try {
        return execSync(command, {
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "ignore"],
        }).trim();
    } catch (error) {
        if (suppressError) return "";
        throw error;
    }
}

/**
 * Determines the default branch name (e.g., main or master).
 */
function getDefaultBranch(): string {
    // Attempt to read the remote default branch HEAD
    const remoteHead = run("git symbolic-ref refs/remotes/origin/HEAD", true);
    if (remoteHead) {
        return remoteHead.replace("refs/remotes/origin/", "");
    }

    // Fallback checks for common default branch names
    const localBranches = run("git branch --format='%(refname:short)'")
        .split("\n")
        .map((b) => b.trim());

    if (localBranches.includes("main")) return "main";
    if (localBranches.includes("master")) return "master";

    throw new Error(
        "Could not determine default branch (neither main nor master found).",
    );
}

/**
 * Main execution routine.
 */
function gitSync(): void {
    // 1. Check for uncommitted changes (dirty working directory)
    const isDirty = run("git status --porcelain") !== "";

    // 2. Fetch and prune dead tracking branches from origin
    console.log("Fetching and pruning remote tracking branches...");
    run("git fetch origin --prune");

    // 3. Identify current branch
    const currentBranch = run("git branch --show-current");

    // 4. Determine default branch
    const defaultBranch = getDefaultBranch();

    // 5. Check if current branch still exists on origin
    const currentBranchExistsOnRemote =
        currentBranch !== "" &&
        run(`git ls-remote --heads origin ${currentBranch}`, true) !== "";

    // Handle scenario where current branch was deleted remotely
    if (!currentBranchExistsOnRemote && currentBranch !== defaultBranch) {
        if (isDirty) {
            console.error(
                `\x1b[31mError: Current branch '${currentBranch}' was deleted on remote, but you have uncommitted changes.\x1b[0m`,
            );
            console.error("Please commit or stash your changes before running sync.");
            process.exit(1);
        }

        console.log(
            `Current branch '${currentBranch}' no longer exists remotely. Switching to '${defaultBranch}'...`,
        );
        run(`git checkout ${defaultBranch}`);
    }

    // 6. Get list of all local branches and remote branches
    const localBranches = run("git branch --format='%(refname:short)'")
        .split("\n")
        .map((b) => b.trim())
        .filter((b) => b.length > 0);

    const remoteBranchesRaw = run("git branch -r --format='%(refname:short)'")
        .split("\n")
        .map((b) => b.trim().replace(/^origin\//, ""))
        .filter((b) => b.length > 0 && !b.includes("HEAD"));

    const remoteBranchesSet = new Set(remoteBranchesRaw);

    // 7. Prune stale local branches
    let deletedCount = 0;
    for (const branch of localBranches) {
        if (branch === defaultBranch) continue;

        if (!remoteBranchesSet.has(branch)) {
            console.log(`Deleting local branch: ${branch}`);
            // -D forces deletion in case branch is unmerged locally
            run(`git branch -D ${branch}`, true);
            deletedCount++;
        }
    }

    console.log(
        `\x1b[32mSync complete. Removed ${deletedCount} local branch(es).\x1b[0m`,
    );
}

gitSync();
