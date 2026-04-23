import cleanup from "./cleanup.js";
import seedSchool from "./seedSchool.js";
import seedUsers from "./seedUsers.js";
import seedProfiles from "./seedProfiles.js";
import seedTimetable from "./seedTimetable.js";
import seedAttendance from "./seedAttendance.js";
import seedFinancials from "./seedFinancials.js";
import seedCalendar from "./seedCalendar.js";
import seedNotices from "./seedNotices.js";
import seedAssignments from "./seedAssignments.js";
import seedExaminations from "./seedExaminations.js";
import seedResults from "./seedResults.js";
import logger from "../../config/logger.js";

const PROGRESS_WIDTH = 32;

const seedSteps = [
    { label: "Cleanup existing seed data", run: cleanup },
    { label: "Seed schools", run: seedSchool },
    { label: "Seed users", run: seedUsers },
    { label: "Seed profiles", run: seedProfiles },
    { label: "Seed timetable", run: seedTimetable },
    { label: "Seed attendance", run: seedAttendance },
    { label: "Seed calendar", run: seedCalendar },
    { label: "Seed notices", run: seedNotices },
    { label: "Seed assignments", run: seedAssignments },
    { label: "Seed examinations", run: seedExaminations },
    { label: "Seed results", run: seedResults },
    { label: "Seed financials", run: seedFinancials },
];

const formatElapsed = (startTime) => `${((Date.now() - startTime) / 1000).toFixed(1)}s`;

const buildProgressLine = ({ completed, total, currentLabel, startTime }) => {
    const percent = total === 0 ? 100 : Math.round((completed / total) * 100);
    const filled = Math.round((percent / 100) * PROGRESS_WIDTH);
    const empty = PROGRESS_WIDTH - filled;
    const bar = `${"#".repeat(filled)}${"-".repeat(empty)}`;

    return `[${bar}] ${String(percent).padStart(3, " ")}% (${completed}/${total}) ${currentLabel} | ${formatElapsed(startTime)}`;
};

const createProgressReporter = (total, startTime) => {
    const interactive = Boolean(process.stdout.isTTY);
    let timer = null;
    let latestState = {
        completed: 0,
        total,
        currentLabel: "Starting",
        startTime,
    };

    const render = (state = latestState) => {
        latestState = state;
        const line = buildProgressLine(state);

        if (interactive) {
            process.stdout.write(`\r${line.padEnd(110, " ")}`);
            return;
        }

        logger.info(line);
    };

    const start = (state) => {
        render(state);
        if (!interactive) return;

        timer = setInterval(() => {
            render(latestState);
        }, 250);
        timer.unref?.();
    };

    const update = (state) => {
        render(state);
    };

    const stop = (state) => {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }

        render(state);

        if (interactive) {
            process.stdout.write("\n");
        }
    };

    return {
        start,
        update,
        stop,
    };
};

const seedAll = async () => {
    logger.info("===========================================");
    logger.info("  FULL SEED - 3 Schools (JNV, NV, NVV)");
    logger.info("===========================================");

    const start = Date.now();
    const totalSteps = seedSteps.length;
    const progress = createProgressReporter(totalSteps, start);

    progress.start({
        completed: 0,
        total: totalSteps,
        currentLabel: "Starting seed-all",
        startTime: start,
    });

    for (const [index, step] of seedSteps.entries()) {
        progress.update({
            completed: index,
            total: totalSteps,
            currentLabel: `Running: ${step.label}`,
            startTime: start,
        });

        await step.run();

        progress.update({
            completed: index + 1,
            total: totalSteps,
            currentLabel: `Completed: ${step.label}`,
            startTime: start,
        });
    }

    progress.stop({
        completed: totalSteps,
        total: totalSteps,
        currentLabel: "Seed-all complete",
        startTime: start,
    });

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    logger.info("===========================================");
    logger.info(`  DONE - ${elapsed}s total`);
    logger.info("===========================================");
};

export default seedAll;
