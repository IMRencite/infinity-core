import { persistAskReviewOperationalRecord } from "../lib/infinity/second-venture-factory/persist-record";
import { listVentureOperationalRecords } from "../lib/infinity/venture-operating-scale/persist";

listVentureOperationalRecords();
const record = persistAskReviewOperationalRecord();
const ids = listVentureOperationalRecords().map((row) => row.venture_id);
console.log(JSON.stringify({ persisted: record.venture_id, ids }, null, 2));
