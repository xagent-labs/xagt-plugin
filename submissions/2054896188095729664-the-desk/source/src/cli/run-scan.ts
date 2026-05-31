import { scanOpportunities } from "../opportunity-scanner.js";

const scan = await scanOpportunities();

console.log(`Opportunity scan: ${scan.mode}`);
console.log(`Opportunities: ${scan.summary.opportunityCount}`);
console.log(`Ready: ${scan.summary.readyCount}`);
console.log(`Blocked: ${scan.summary.blockedCount}`);
console.log("Wrote web/public/data/opportunities.json");
console.log("Wrote docs/evidence/opportunity-scan.md");
