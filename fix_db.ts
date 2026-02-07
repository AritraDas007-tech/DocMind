import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
    try {
        console.log("Checking database...");
        await db.execute(sql`ALTER TABLE messages ADD COLUMN source_page INT DEFAULT NULL AFTER content`);
        console.log("Column source_page added successfully.");
    } catch (err: any) {
        if (err.message.includes("Duplicate column name")) {
            console.log("Column source_page already exists.");
        } else {
            console.error("Error adding column:", err.message);
        }
    }
    process.exit(0);
}

main();
