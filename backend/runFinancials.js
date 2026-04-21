import { connectDB, disconnectDB } from "./src/seed/lib/db.js";
import seedFinancials from "./src/seed/commands/seedFinancials.js";

const run = async () => {
    await connectDB();
    await seedFinancials();
    await disconnectDB();
};
run();
