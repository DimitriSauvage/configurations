import { exec } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

// ==========================================
// Types
// ==========================================

interface ExecutionResult {
    stdout: string;
    stderr: string;
}

interface RebaseStatus {
    isBehind: boolean;
    behindBy: number;
}

interface ProcessOptions {
    repoName: string;
    repoPath: string;
}

interface SyncSummary {
    name: string;
    success: boolean;
    initialBranch?: string;
    targetBranch?: string;
    rebaseStatus?: RebaseStatus;
    isBranchPruned?: boolean;
    error?: string;
}

// ==========================================
// Command Line Helpers
// ==========================================

function parseConcurrencyLimit(args: string[], defaultLimit: number = 4): number {
    const argPrefix = "--concurrency-limit=";
    const match = args.find((arg) => arg.startsWith(argPrefix));
    if (!match) return defaultLimit;

    const parsed = parseInt(match.replace(argPrefix, ""), 10);
    return Number.isNaN(parsed) || parsed < 1 ? defaultLimit : parsed;
}

function resolveDevFolder(): string {
    return process.env.DEV_FOLDER || path.join(os.homedir(), "projects");
}

// ==========================================
// Git Core Execution Helpers
// ==========================================

async function gitExecRaw(command: string, cwd: string): Promise<ExecutionResult> {
    const { stdout, stderr } = await execAsync(command, { cwd });
    return { stdout: stdout.trim(), stderr: stderr.trim() };
}

async function gitExec(command: string, cwd: string): Promise<string> {
    const result: ExecutionResult = await gitExecRaw(command, cwd);
    return result.stdout;
}

async function safeGitExec(command: string, cwd: string): Promise<string | null> {
    try {
        const result: ExecutionResult = await gitExecRaw(command, cwd);
        return result.stdout;
    } catch {
        return null;
    }
}

// ==========================================
// Specialized Git Operations (CC < 5 each)
// ==========================================

async function getRemoteHeadBranch(repoPath: string): Promise<string | null> {
    const ref = await safeGitExec("git symbolic-ref refs/remotes/origin/HEAD", repoPath);
    return ref ? ref.replace("refs/remotes/origin/", "") : null;
}

async function hasLocalBranch(branchName: string, repoPath: string): Promise<boolean> {
    const result = await safeGitExec(`git show-ref --verify refs/heads/${branchName}`, repoPath);
    return result !== null;
}

async function resolveTargetBranch(repoPath: string): Promise<string | null> {
    const remoteHead = await getRemoteHeadBranch(repoPath);
    if (remoteHead) return remoteHead;

    if (await hasLocalBranch("main", repoPath)) return "main";
    if (await hasLocalBranch("master", repoPath)) return "master";

    return null;
}

async function getCurrentBranch(repoPath: string): Promise<string> {
    return (await safeGitExec("git branch --show-current", repoPath)) || "";
}

async function isWorkingTreeDirty(repoPath: string): Promise<boolean> {
    const status = await safeGitExec("git status --porcelain", repoPath);
    return Boolean(status && status.length > 0);
}

async function stashLocalChanges(repoPath: string): Promise<boolean> {
    const dirty = await isWorkingTreeDirty(repoPath);
    if (!dirty) return false;

    await gitExec("git stash --quiet", repoPath);
    return true;
}

async function popLocalChanges(repoPath: string): Promise<boolean> {
    const result = await safeGitExec("git stash pop --quiet", repoPath);
    return result !== null;
}

async function checkoutBranch(branch: string, repoPath: string): Promise<boolean> {
    const result = await safeGitExec(`git checkout -q ${branch}`, repoPath);
    return result !== null;
}

async function updateTargetBranch(repoPath: string): Promise<void> {
    await gitExec("git pull -q", repoPath);
    await gitExec("git sync", repoPath);
}

async function checkRebaseStatus(
    currentBranch: string,
    targetBranch: string,
    repoPath: string
): Promise<RebaseStatus> {
    if (!currentBranch || currentBranch === targetBranch) {
        return { isBehind: false, behindBy: 0 };
    }

    const rawCount = await safeGitExec(`git rev-list --count ${currentBranch}..${targetBranch}`, repoPath);
    const behindBy = rawCount ? parseInt(rawCount, 10) || 0 : 0;

    return {
        isBehind: behindBy > 0,
        behindBy,
    };
}

// ==========================================
// Orchestrator for Single Repository
// ==========================================

async function processRepository(options: ProcessOptions): Promise<SyncSummary> {
    const { repoName, repoPath } = options;

    try {
        const targetBranch = await resolveTargetBranch(repoPath);
        if (!targetBranch) {
            return { name: repoName, success: false, error: "No main or master branch found" };
        }

        const initialBranch = await getCurrentBranch(repoPath);
        const stashed = await stashLocalChanges(repoPath);

        if (initialBranch !== targetBranch) {
            await checkoutBranch(targetBranch, repoPath);
        }

        await updateTargetBranch(repoPath);

        let isBranchPruned = false;
        let currentActiveBranch = targetBranch;

        if (initialBranch && initialBranch !== targetBranch) {
            const branchExistsAfterSync = await hasLocalBranch(initialBranch, repoPath);

            if (branchExistsAfterSync) {
                await checkoutBranch(initialBranch, repoPath);
                currentActiveBranch = initialBranch;
            } else {
                isBranchPruned = true;
            }
        }

        if (stashed) {
            if (!isBranchPruned) {
                await popLocalChanges(repoPath);
            } else {
                console.warn(
                    `  \x1b[33m⚠\x1b[0m ${repoName}: Stashed changes preserved on '${initialBranch}' (branch was pruned).`
                );
            }
        }

        const rebaseStatus =
            !isBranchPruned && currentActiveBranch !== targetBranch
                ? await checkRebaseStatus(currentActiveBranch, targetBranch, repoPath)
                : { isBehind: false, behindBy: 0 };

        return {
            name: repoName,
            success: true,
            initialBranch,
            targetBranch,
            rebaseStatus,
            isBranchPruned,
        };
    } catch (error: any) {
        return {
            name: repoName,
            success: false,
            error: error.message || "Unknown error during sync",
        };
    }
}

// ==========================================
// Concurrency Pool (Zero Dependencies)
// ==========================================

async function runInParallel<T, R>(
    items: T[],
    limit: number,
    taskFn: (item: T) => Promise<R>
): Promise<R[]> {
    const results: R[] = [];
    const executing = new Set<Promise<void>>();

    for (const item of items) {
        const promise = taskFn(item).then((result) => {
            results.push(result);
        });

        executing.add(promise);
        const clean = () => executing.delete(promise);
        promise.then(clean, clean);

        if (executing.size >= limit) {
            await Promise.race(executing);
        }
    }

    await Promise.all(executing);
    return results;
}

// ==========================================
// File System & Reporting Helpers
// ==========================================

function getGitRepositories(baseDir: string): ProcessOptions[] {
    if (!fs.existsSync(baseDir)) return [];

    return fs
        .readdirSync(baseDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => ({
            repoName: entry.name,
            repoPath: path.join(baseDir, entry.name),
        }))
        .filter((repo) => fs.existsSync(path.join(repo.repoPath, ".git")));
}

function printSummary(summaries: SyncSummary[]): void {
    console.log("\n==================================================");
    console.log("                    SUMMARY                       ");
    console.log("==================================================");

    const successful = summaries.filter((s) => s.success);
    const failed = summaries.filter((s) => !s.success);
    const needingRebase = summaries.filter(
        (s) => s.success && s.rebaseStatus?.isBehind
    );

    console.log(`\n\x1b[32mUpdated Repositories (${successful.length}):\x1b[0m`);
    successful.forEach((s) => {
        if (s.isBranchPruned) {
            console.log(
                `  ✔ ${s.name} \x1b[90m(Branch '${s.initialBranch}' was merged & pruned; staying on '${s.targetBranch}')\x1b[0m`
            );
        } else {
            console.log(`  ✔ ${s.name}`);
        }
    });

    console.log(`\n\x1b[33mRepositories Needing Rebase (${needingRebase.length}):\x1b[0m`);
    if (needingRebase.length === 0) {
        console.log("  ✔ All active branches are up to date!");
    } else {
        needingRebase.forEach((s) => {
            console.log(
                `  ⚠ \x1b[1m${s.name}\x1b[0m: '${s.initialBranch}' is behind '${s.targetBranch}' by ${s.rebaseStatus?.behindBy} commit(s)`
            );
        });
    }

    if (failed.length > 0) {
        console.log(`\n\x1b[31mFailed Repositories (${failed.length}):\x1b[0m`);
        failed.forEach((s) => console.log(`  ✖ ${s.name}: ${s.error}`));
    }
}

// ==========================================
// Main Entrypoint
// ==========================================

async function main(): Promise<void> {
    const concurrencyLimit = parseConcurrencyLimit(process.argv.slice(2), 4);
    const devFolder = resolveDevFolder();

    const repos = getGitRepositories(devFolder);
    if (repos.length === 0) {
        console.log(`No git repositories found in: ${devFolder}`);
        return;
    }

    console.log(
        `\x1b[36m==> Synchronizing ${repos.length} repositories (Concurrency: ${concurrencyLimit})...\x1b[0m\n`
    );

    const results = await runInParallel(repos, concurrencyLimit, async (repo) => {
        const summary = await processRepository(repo);
        if (summary.success) {
            console.log(` \x1b[32m✔\x1b[0m Synced ${summary.name}`);
        } else {
            console.log(` \x1b[31m✖\x1b[0m Failed ${summary.name}`);
        }
        return summary;
    });

    printSummary(results);
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});