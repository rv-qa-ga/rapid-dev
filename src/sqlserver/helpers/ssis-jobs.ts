/**
 * SQL Server Agent / SSIS Job Helpers
 *
 * Reusable functions to run and check status of SQL Server Agent jobs (including
 * jobs that execute SSIS packages). Uses msdb on the same SQL Server instance.
 *
 * 1. Query database tables – use SqlServerClient.queryMany / queryOne (existing).
 * 2. Run SSIS job – runAgentJob(client, jobName).
 * 3. Check status of SSIS job – getAgentJobStatus(client, jobName).
 */

import { SqlServerClient } from '../client/SqlServerClient';
import { logger } from '../../utils/logger';

/** msdb is where SQL Server Agent job metadata and procedures live */
const MSDB_DATABASE = 'msdb';

/**
 * Status of a SQL Server Agent job run.
 * run_status from msdb.dbo.sysjobhistory: 0=Failed, 1=Succeeded, 2=Retry, 3=Canceled, 4=In progress
 */
export type AgentJobRunStatus =
  | 'succeeded'
  | 'failed'
  | 'retry'
  | 'canceled'
  | 'in_progress'
  | 'unknown';

export interface AgentJobStatus {
  /** Job name */
  jobName: string;
  /** Whether the job is currently running */
  isRunning: boolean;
  /** Last run outcome (from most recent execution) */
  lastRunStatus: AgentJobRunStatus;
  /** Last run start date (YYYYMMDD from sysjobhistory) */
  lastRunDate?: number;
  /** Last run start time (HHMMSS from sysjobhistory) */
  lastRunTime?: number;
  /** Run duration in seconds (from sysjobhistory) */
  lastRunDurationSeconds?: number;
  /** Optional message (e.g. error message on failure) */
  message?: string;
}

function mapRunStatus(code: number): AgentJobRunStatus {
  switch (code) {
    case 0:
      return 'failed';
    case 1:
      return 'succeeded';
    case 2:
      return 'retry';
    case 3:
      return 'canceled';
    case 4:
      return 'in_progress';
    default:
      return 'unknown';
  }
}

/**
 * Run a SQL Server Agent job (e.g. an SSIS job) by name.
 * Executes msdb.dbo.sp_start_job. The job runs asynchronously; use getAgentJobStatus
 * to poll until completion if needed.
 *
 * @param client – SqlServerClient (must be able to connect to the same instance where Agent runs)
 * @param jobName – Exact name of the job
 */
export async function runAgentJob(
  client: SqlServerClient,
  jobName: string
): Promise<void> {
  const sql = `EXEC msdb.dbo.sp_start_job @job_name = @jobName`;
  logger.info(`Starting SQL Server Agent job: ${jobName}`);
  await client.execute(sql, { jobName }, { database: MSDB_DATABASE });
  logger.info(`SQL Server Agent job "${jobName}" start requested successfully`);
}

/**
 * Run a SQL Server Agent job starting at a specific step (by step number).
 * Uses msdb.dbo.sysjobsteps to resolve step_id to step_name, then sp_start_job @job_name, @step_name.
 * The job runs from that step onward (subsequent steps execute per job flow).
 *
 * @param client – SqlServerClient (must be able to connect to the same instance where Agent runs)
 * @param jobName – Exact name of the job
 * @param stepId – Step number (e.g. 2 for "step 2")
 */
export async function runAgentJobAtStep(
  client: SqlServerClient,
  jobName: string,
  stepId: number
): Promise<void> {
  const options = { database: MSDB_DATABASE };

  const jobRow = await client.queryOne<{ job_id: string }>(
    `SELECT job_id FROM msdb.dbo.sysjobs WHERE name = @jobName`,
    { jobName },
    options
  );
  if (!jobRow) {
    throw new Error(`SQL Server Agent job not found: ${jobName}`);
  }

  const stepRow = await client.queryOne<{ step_name: string }>(
    `SELECT step_name FROM msdb.dbo.sysjobsteps WHERE job_id = @jobId AND step_id = @stepId`,
    { jobId: jobRow.job_id, stepId },
    options
  );
  if (!stepRow) {
    throw new Error(`Job "${jobName}" has no step with step_id = ${stepId}. Check msdb.dbo.sysjobsteps.`);
  }

  const sql = `EXEC msdb.dbo.sp_start_job @job_name = @jobName, @step_name = @stepName`;
  logger.info(`Starting SQL Server Agent job "${jobName}" at step ${stepId} (${stepRow.step_name})`);
  await client.execute(sql, { jobName, stepName: stepRow.step_name }, options);
  logger.info(`SQL Server Agent job "${jobName}" start at step ${stepId} requested successfully`);
}

/**
 * Get the current status of a SQL Server Agent job (e.g. an SSIS job).
 * Uses msdb.dbo.sysjobactivity for "is running" and msdb.dbo.sysjobhistory for last run outcome.
 *
 * @param client – SqlServerClient
 * @param jobName – Exact name of the job
 * @returns Current status and last run outcome
 */
export async function getAgentJobStatus(
  client: SqlServerClient,
  jobName: string
): Promise<AgentJobStatus> {
  const options = { database: MSDB_DATABASE };

  // 1) Check if job exists and get job_id
  const jobRow = await client.queryOne<{ job_id: string }>(
    `SELECT job_id FROM msdb.dbo.sysjobs WHERE name = @jobName`,
    { jobName },
    options
  );
  if (!jobRow) {
    throw new Error(`SQL Server Agent job not found: ${jobName}`);
  }
  const jobId = jobRow.job_id;

  // 2) Current run: is it running? Use CURRENT session only (max session_id) so we don't
  //    mistake a completed row from an old session for "not running" while the job is actually executing.
  const activitySql = `
    SELECT TOP 1
      CASE
        WHEN start_execution_date IS NOT NULL AND stop_execution_date IS NULL THEN 1
        ELSE 0
      END AS is_running
    FROM msdb.dbo.sysjobactivity a
    WHERE a.job_id = @jobId
      AND a.session_id = (SELECT MAX(session_id) FROM msdb.dbo.sysjobactivity)
    ORDER BY start_execution_date DESC
  `;
  const activity = await client.queryOne<{ is_running: number }>(
    activitySql,
    { jobId },
    options
  );
  const isRunning = activity?.is_running === 1;

  // 3) Last run outcome from sysjobhistory (step_id = 0 is job-level outcome)
  const historySql = `
    SELECT TOP 1
      run_status,
      run_date,
      run_time,
      run_duration,
      message
    FROM msdb.dbo.sysjobhistory
    WHERE job_id = @jobId
      AND step_id = 0
    ORDER BY run_date DESC, run_time DESC
  `;
  const history = await client.queryOne<{
    run_status: number;
    run_date: number;
    run_time: number;
    run_duration: number;
    message: string | null;
  }>(historySql, { jobId }, options);

  const lastRunStatus = history
    ? mapRunStatus(history.run_status)
    : 'unknown';
  const lastRunDate = history?.run_date;
  const lastRunTime = history?.run_time;
  // run_duration is stored as HHMMSS in an int (e.g. 125 = 1m 25s)
  let lastRunDurationSeconds: number | undefined;
  if (history?.run_duration != null) {
    const d = history.run_duration;
    const hours = Math.floor(d / 10000);
    const mins = Math.floor((d % 10000) / 100);
    const secs = d % 100;
    lastRunDurationSeconds = hours * 3600 + mins * 60 + secs;
  }
  const message = history?.message ?? undefined;

  return {
    jobName,
    isRunning,
    lastRunStatus,
    lastRunDate,
    lastRunTime,
    lastRunDurationSeconds,
    message,
  };
}

/**
 * Wait for a SQL Server Agent job to complete (running -> not running) and return final status.
 * Uses current Agent session only when checking "is running", so long-running jobs (e.g. Business Data
 * with steps like "Import SP Bordereau Accounting") are correctly detected until they finish.
 *
 * @param client – SqlServerClient
 * @param jobName – Exact name of the job
 * @param options – timeoutMs (default 30 min for long jobs), pollIntervalMs (default 10 s), initialDelayMs (delay before first poll)
 * @returns Final status after job has stopped
 */
export async function waitForAgentJobToComplete(
  client: SqlServerClient,
  jobName: string,
  options?: { timeoutMs?: number; pollIntervalMs?: number; initialDelayMs?: number }
): Promise<AgentJobStatus> {
  const timeoutMs = options?.timeoutMs ?? 1_800_000; // 30 min default for long-running jobs (e.g. Business Data)
  const pollIntervalMs = options?.pollIntervalMs ?? 10_000; // 10 s default
  const initialDelayMs = options?.initialDelayMs ?? 3_000; // 3 s so the job has time to appear as "running" in Agent

  logger.info(`Waiting for SQL Server Agent job "${jobName}" to complete (timeout: ${timeoutMs}ms, poll every ${pollIntervalMs}ms)`);
  await new Promise((r) => setTimeout(r, initialDelayMs));

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = await getAgentJobStatus(client, jobName);
    if (!status.isRunning) {
      logger.info(`Job "${jobName}" completed with status: ${status.lastRunStatus}`);
      return status;
    }
    const elapsedSec = Math.round((Date.now() - start) / 1000);
    logger.info(`Job "${jobName}" still running (elapsed ${elapsedSec}s, polling again in ${pollIntervalMs / 1000}s)...`);
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  const status = await getAgentJobStatus(client, jobName);
  throw new Error(
    `Timeout waiting for job "${jobName}" to complete (${timeoutMs}ms). Last status: isRunning=${status.isRunning}, lastRunStatus=${status.lastRunStatus}`
  );
}

/**
 * Get the last run status of a specific job step from sysjobhistory.
 * step_id in sysjobhistory: 0 = job outcome, 1+ = step outcome.
 */
export async function getAgentJobStepStatus(
  client: SqlServerClient,
  jobName: string,
  stepId: number
): Promise<{ lastRunStatus: AgentJobRunStatus; lastRunDate?: number; lastRunTime?: number; message?: string }> {
  const options = { database: MSDB_DATABASE };
  const jobRow = await client.queryOne<{ job_id: string }>(
    `SELECT job_id FROM msdb.dbo.sysjobs WHERE name = @jobName`,
    { jobName },
    options
  );
  if (!jobRow) {
    throw new Error(`SQL Server Agent job not found: ${jobName}`);
  }
  const history = await client.queryOne<{
    run_status: number;
    run_date: number;
    run_time: number;
    message: string | null;
  }>(
    `SELECT TOP 1 run_status, run_date, run_time, message
     FROM msdb.dbo.sysjobhistory
     WHERE job_id = @jobId AND step_id = @stepId
     ORDER BY run_date DESC, run_time DESC`,
    { jobId: jobRow.job_id, stepId },
    options
  );
  return {
    lastRunStatus: history ? mapRunStatus(history.run_status) : 'unknown',
    lastRunDate: history?.run_date,
    lastRunTime: history?.run_time,
    message: history?.message ?? undefined,
  };
}

/**
 * Wait only for a specific job step to complete (does not wait for the rest of the job).
 * Polls sysjobhistory for the step (step_id only) until a new completion (run_status 0,1,2,3) appears after start time.
 * Does not check job-level (step_id=0) or other steps.
 *
 * @param client – SqlServerClient
 * @param jobName – Exact name of the job
 * @param stepId – Step number (e.g. 2)
 * @param options – timeoutMs, pollIntervalMs, initialDelayMs
 */
export async function waitForAgentJobStepToComplete(
  client: SqlServerClient,
  jobName: string,
  stepId: number,
  options?: { timeoutMs?: number; pollIntervalMs?: number; initialDelayMs?: number }
): Promise<{ lastRunStatus: AgentJobRunStatus; message?: string }> {
  const timeoutMs = options?.timeoutMs ?? 300_000; // 5 min default for a single step
  const pollIntervalMs = options?.pollIntervalMs ?? 10_000; // 10 s
  const initialDelayMs = options?.initialDelayMs ?? 5_000; // 5 s before first poll

  const stepStatusBefore = await getAgentJobStepStatus(client, jobName, stepId);
  const prevDate = stepStatusBefore.lastRunDate ?? 0;
  const prevTime = stepStatusBefore.lastRunTime ?? 0;

  logger.info(
    `Waiting for step ${stepId} of job "${jobName}" to complete (step ${stepId} only, not entire job; timeout: ${timeoutMs}ms, poll every ${pollIntervalMs}ms)`
  );
  await new Promise((r) => setTimeout(r, initialDelayMs));

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const stepStatus = await getAgentJobStepStatus(client, jobName, stepId);
    const isNewRun =
      stepStatus.lastRunDate != null &&
      stepStatus.lastRunTime != null &&
      (stepStatus.lastRunDate > prevDate || (stepStatus.lastRunDate === prevDate && stepStatus.lastRunTime > prevTime));
    const isFinished =
      stepStatus.lastRunStatus !== 'in_progress' && stepStatus.lastRunStatus !== 'unknown';
    if (isNewRun && isFinished) {
      logger.info(`Step ${stepId} of job "${jobName}" completed with status: ${stepStatus.lastRunStatus}`);
      return {
        lastRunStatus: stepStatus.lastRunStatus,
        message: stepStatus.message,
      };
    }
    if (isFinished && !isNewRun) {
      const elapsed = (Date.now() - start) / 1000;
      if (elapsed > 30) {
        logger.info(
          `Step ${stepId} of job "${jobName}" last run status: ${stepStatus.lastRunStatus} (no new run yet after ${Math.round(elapsed)}s)`
        );
      }
    }
    const elapsedSec = Math.round((Date.now() - start) / 1000);
    logger.info(
      `Step ${stepId} of job "${jobName}" not yet completed (elapsed ${elapsedSec}s, polling again in ${pollIntervalMs / 1000}s)...`
    );
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  const stepStatus = await getAgentJobStepStatus(client, jobName, stepId);
  throw new Error(
    `Timeout waiting for step ${stepId} of job "${jobName}" to complete (${timeoutMs}ms). Last status: ${stepStatus.lastRunStatus}${stepStatus.message ? ` - ${stepStatus.message}` : ''}`
  );
}
