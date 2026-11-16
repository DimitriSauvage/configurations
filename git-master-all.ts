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

interface ProcessOptions {
    repoName: string;
    repoPath: string;
}

interface SyncSummary {
    name: string;
    success: boolean;
    initialBranch?: string;
    targetBranch?: string;
    stashed?: boolean;
    stashPopConflict?: boolean;
    error?: string;
}

// ==========================================
// Command Line Helpers
// ==========================================

function parseConcurrencyLimit(
    args: string[],
    defaultLimit: number = 4,
): number {
    const argPrefix = "--concurrency-limit=";
    const match = args.find((arg) => arg.startsWith(argPrefix));
    if (!match) return defaultLimit;

    const parsed = parseInt(match.replace(argPrefix, ""), 10);
    return Number.isNaN(parsed) || parsed < 1 ? defaultLimit : parsed;
}

function resolveWorkspaceFolder(): string {
    return process.env.DEV_FOLDER || path.join(os.homedir(), "projects");
}

// ==========================================
// Git Core Execution Helpers
// ==========================================

async function gitExecRaw(
    command: string,
    cwd: string,
): Promise<ExecutionResult> {
    const { stdout, stderr } = await execAsync(command, { cwd });
    return { stdout: stdout.trim(), stderr: stderr.trim() };
}

async function gitExec(command: string, cwd: string): Promise<string> {
    const result: ExecutionResult = await gitExecRaw(command, cwd);
    return result.stdout;
}

async function safeGitExec(
    command: string,
    cwd: string,
): Promise<string | null> {
    try {
        const result: ExecutionResult = await gitExecRaw(command, cwd);
        return result.stdout;
    } catch {
        return null;
    }
}

// ==========================================
// Specialized Git Operations
// ==========================================

async function getRemoteHeadBranch(repoPath: string): Promise<string | null> {
    const ref = await safeGitExec(
        "git symbolic-ref refs/remotes/origin/HEAD",
        repoPath,
    );
    return ref ? ref.replace("refs/remotes/origin/", "") : null;
}

async function hasLocalBranch(
    branchName: string,
    repoPath: string,
): Promise<boolean> {
    const result = await safeGitExec(
        `git show-ref --verify refs/heads/${branchName}`,
        repoPath,
    );
    return result !== null;
}

async function resolveDefaultBranch(repoPath: string): Promise<string | null> {
    const remoteHead = await getRemoteHeadBranch(repoPath);
    if (remoteHead === "main" || remoteHead === "master") return remoteHead;

    if (await hasLocalBranch("main", repoPath)) return "main";
    if (await hasLocalBranch("master", repoPath)) return "master";

    return remoteHead;
}

async function getCurrentBranch(repoPath: string): Promise<string> {
    return (await safeGitExec("git branch --show-current", repoPath)) || "";
}

async function isWorkingTreeDirty(repoPath: string): Promise<boolean> {
    const status = await safeGitExec("git status --porcelain", repoPath);
    return Boolean(status && status.length > 0);
}

async function stashIfDirty(repoPath: string): Promise<boolean> {
    const dirty = await isWorkingTreeDirty(repoPath);
    if (!dirty) return false;

    // --include-untracked ensures untracked files don't block switching to main/master
    await gitExec("git stash push --include-untracked --quiet", repoPath);
    return true;
}

async function popStashedChanges(repoPath: string): Promise<boolean> {
    const result = await safeGitExec("git stash pop --quiet", repoPath);
    return result !== null;
}

async function checkoutBranch(branch: string, repoPath: string): Promise<void> {
    await gitExec(`git checkout -q ${branch}`, repoPath);
}

async function fetchAndPull(repoPath: string): Promise<void> {
    await gitExec("git fetch --all --prune --quiet", repoPath);
    await gitExec("git pull --quiet", repoPath);
}

// ==========================================
// Progress Display
// ==========================================

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function truncate(text: string, max: number): string {
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

const ANSI_RE = /\x1b\[[0-9;]*m/g;

function fitWidth(
    text: string,
    columns: number = process.stdout.columns ?? 80,
): string {
    const max = Math.max(20, columns - 1);
    if (text.replace(ANSI_RE, "").length <= max) return text;
    const plain = text.replace(ANSI_RE, "");
    return plain.length > max ? `${plain.slice(0, max - 1)}…` : plain;
}

class ProgressDisplay {
    private readonly total: number;
    private readonly running = new Set<string>();
    private readonly isTTY: boolean;
    private doneCount = 0;
    private frame = 0;
    private timer: NodeJS.Timeout | null = null;
    private liveLines = 0;

    constructor(names: string[], isTTY: boolean = Boolean(process.stdout.isTTY)) {
        this.total = names.length;
        this.isTTY = isTTY;
    }

    start(): void {
        if (!this.isTTY) return;
        process.stdout.write("\x1b[?25l");
        this.renderLive();
        this.timer = setInterval(() => {
            this.frame += 1;
            this.renderLive();
        }, 100);
        this.timer.unref?.();
    }

    startRepo(name: string): void {
        this.running.add(name);
        if (!this.isTTY) console.log(`  ⟳ ${name} … updating`);
        else this.renderLive();
    }

    finishRepo(name: string, line: string): void {
        this.running.delete(name);
        this.doneCount += 1;
        if (!this.isTTY) {
            console.log(`  ${line}`);
            return;
        }

        if (this.liveLines > 0) process.stdout.write(`\x1b[${this.liveLines}F`);
        process.stdout.write(`${fitWidth(line)}\x1b[K\n\x1b[J`);
        this.liveLines = 0;
        this.renderLive();
    }

    stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        if (this.isTTY) {
            if (this.liveLines > 0)
                process.stdout.write(`\x1b[${this.liveLines}F\x1b[J`);
            this.liveLines = 0;
            process.stdout.write("\x1b[?25h");
        }
    }

    private liveBlockLines(): string[] {
        const pending = this.total - this.doneCount - this.running.size;
        const spin = SPINNER_FRAMES[this.frame % SPINNER_FRAMES.length];
        const lines = [
            `\x1b[36m${spin}\x1b[0m ${this.doneCount}/${this.total} updated · ${this.running.size} running · ${pending} pending`,
        ];

        const maxRows = Math.max(1, (process.stdout.rows ?? 24) - 2);
        const slots = Math.max(0, maxRows - lines.length);
        const names = [...this.running];
        for (const name of names.slice(0, slots)) lines.push(`  ${spin} ${name}`);
        if (names.length > slots)
            lines.push(`  … +${names.length - slots} more running`);
        return lines.map((line) => fitWidth(line));
    }

    private renderLive(): void {
        const lines = this.liveBlockLines();
        if (this.liveLines > 0) process.stdout.write(`\x1b[${this.liveLines}F`);
        let out = "";
        for (const line of lines) out += `${line}\x1b[K\n`;
        if (lines.length < this.liveLines) out += "\x1b[J";
        process.stdout.write(out);
        this.liveLines = lines.length;
    }
}

function describeSummary(s: SyncSummary): string {
    if (!s.success) {
        return `\x1b[31m✖ ${s.name}\x1b[0m — ${truncate(String(s.error || "unknown error").replace(/\s+/g, " "), 90)}`;
    }

    const parts: string[] = [];
    if (s.initialBranch && s.initialBranch !== s.targetBranch) {
        parts.push(`switched '${s.initialBranch}' → '${s.targetBranch}'`);
    } else {
        parts.push(`on '${s.targetBranch}'`);
    }

    if (s.stashed) {
        parts.push(
            s.stashPopConflict
                ? "stash pop conflict (changes kept in stash)"
                : `changes popped onto '${s.targetBranch}'`,
        );
    }

    const icon = s.stashPopConflict ? "\x1b[33m⚠" : "\x1b[32m✔";
    return `${icon} ${s.name}\x1b[0m — ${parts.join("; ")}`;
}

// ==========================================
// Orchestrator for Single Repository
// ==========================================

async function processRepository(
    options: ProcessOptions,
): Promise<SyncSummary> {
    const { repoName, repoPath } = options;

    try {
        const targetBranch = await resolveDefaultBranch(repoPath);
        if (!targetBranch) {
            return {
                name: repoName,
                success: false,
                error: "No main or master branch found",
            };
        }

        const initialBranch = await getCurrentBranch(repoPath);

        // 1. Stash only if there are uncommitted/untracked changes
        const stashed = await stashIfDirty(repoPath);

        // 2. Switch to main/master if not already on it
        if (initialBranch !== targetBranch) {
            await checkoutBranch(targetBranch, repoPath);
        }

        // 3. Fetch & pull latest changes on main/master
        await fetchAndPull(repoPath);

        // 4. Pop stash onto main/master ONLY if a stash was created in step 1
        let stashPopConflict = false;
        if (stashed) {
            const popped = await popStashedChanges(repoPath);
            if (!popped) {
                stashPopConflict = true;
            }
        }

        return {
            name: repoName,
            success: true,
            initialBranch,
            targetBranch,
            stashed,
            stashPopConflict,
        };
    } catch (error: any) {
        return {
            name: repoName,
            success: false,
            error: error.message || "Unknown error during update",
        };
    }
}

// ==========================================
// Concurrency Pool (Zero Dependencies)
// ==========================================

async function runInParallel<T, R>(
    items: T[],
    limit: number,
    taskFn: (item: T) => Promise<R>,
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
    const stashConflicts = summaries.filter(
        (s) => s.success && s.stashPopConflict,
    );

    console.log(`\n\x1b[32mUpdated Repositories (${successful.length}):\x1b[0m`);
    successful.forEach((s) => {
        const branchNote =
            s.initialBranch && s.initialBranch !== s.targetBranch
                ? ` \x1b[90m(${s.initialBranch} → ${s.targetBranch})\x1b[0m`
                : ` \x1b[90m(${s.targetBranch})\x1b[0m`;
        const stashNote =
            s.stashed && !s.stashPopConflict
                ? " \x1b[36m[stash restored]\x1b[0m"
                : "";
        console.log(`  ✔ ${s.name}${branchNote}${stashNote}`);
    });

    if (stashConflicts.length > 0) {
        console.log(
            `\n\x1b[33mStash Pop Conflicts (${stashConflicts.length}):\x1b[0m`,
        );
        stashConflicts.forEach((s) => {
            console.log(
                `  ⚠ \x1b[1m${s.name}\x1b[0m: switched to '${s.targetBranch}', but 'git stash pop' had conflicts (run 'git stash pop' manually)`,
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
    const workspaceFolder = resolveWorkspaceFolder();

    const repos = getGitRepositories(workspaceFolder);
    if (repos.length === 0) {
        console.log(`No git repositories found in: ${workspaceFolder}`);
        return;
    }

    console.log(
        `\x1b[36m==> Switching ${repos.length} repositories to default branch & pulling (Concurrency: ${concurrencyLimit})...\x1b[0m`,
    );

    const display = new ProgressDisplay(repos.map((repo) => repo.repoName));
    display.start();

    const results = await runInParallel(repos, concurrencyLimit, async (repo) => {
        display.startRepo(repo.repoName);
        const summary = await processRepository(repo);
        display.finishRepo(repo.repoName, describeSummary(summary));
        return summary;
    });

    display.stop();
    console.log("");
    printSummary(results);
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
