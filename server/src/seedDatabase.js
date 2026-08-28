import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';

process.env.DB_MODE = 'sql';
const tempFile = path.resolve('data/.sql-seed-source.json');
process.env.DEMO_DATA_FILE = tempFile;
const [{ DemoStore }, { getPool, sql }] = await Promise.all([import('./services/demoStore.js'), import('./config/database.js')]);
const source = new DemoStore();
await source.init();
const pool = await getPool();
const existing = await pool.request().query('SELECT COUNT(*) count FROM lf_users');
if (existing.recordset[0].count) {
  await fs.rm(tempFile, { force: true });
  console.error('Seed stopped: lf_users is not empty. No existing SQL data was changed.');
  process.exitCode = 1;
} else {
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  const request = (values = {}) => { const query = new sql.Request(transaction); Object.entries(values).forEach(([key, value]) => query.input(key, value ?? null)); return query; };
  try {
    await request().query('SET IDENTITY_INSERT lf_users ON');
    for (const user of source.data.users) await request(user).query(`INSERT lf_users(user_id,first_name,last_name,email,password_hash,role_id,status) VALUES(@id,@firstName,@lastName,@email,@passwordHash,(SELECT role_id FROM lf_roles WHERE role_name=@role),@status)`);
    await request().query('SET IDENTITY_INSERT lf_users OFF; SET IDENTITY_INSERT lf_found_items ON');
    for (const item of source.data.foundItems) await request(item).query(`INSERT lf_found_items(found_item_id,reported_by_user_id,item_name,category_id,color,brand,found_location_id,found_date,description,private_details,custody_status,status) VALUES(@id,@reporterId,@name,(SELECT category_id FROM lf_categories WHERE name=@category),@color,@brand,(SELECT location_id FROM lf_locations WHERE name=@location),@date,@description,@privateDetails,@custodyStatus,@status)`);
    await request().query('SET IDENTITY_INSERT lf_found_items OFF; SET IDENTITY_INSERT lf_lost_items ON');
    for (const item of source.data.lostItems) await request(item).query(`INSERT lf_lost_items(lost_item_id,user_id,item_name,category_id,color,brand,lost_location_id,lost_date,description,private_details,status) VALUES(@id,@userId,@name,(SELECT category_id FROM lf_categories WHERE name=@category),@color,@brand,(SELECT location_id FROM lf_locations WHERE name=@location),@date,@description,@privateDetails,@status)`);
    await request().query('SET IDENTITY_INSERT lf_lost_items OFF');
    const wallet = source.data.foundItems.find((item) => item.id === 17); if (wallet?.image) await request({ itemId: wallet.id, image: wallet.image }).query(`INSERT lf_item_images(item_type,item_id,image_path,original_filename) VALUES('found',@itemId,@image,'seed-wallet.png')`);
    for (const match of source.data.matches) await request(match).query(`INSERT lf_matches(lost_item_id,found_item_id,match_score,category_score,color_score,location_score,date_score,brand_score,keyword_score,status) VALUES(@lostItemId,@foundItemId,@score,@category,@color,@location,@date,@brand,@keyword,@status)`);
    await request().query('SET IDENTITY_INSERT lf_claims ON');
    for (const claim of source.data.claims) { await request(claim).query(`INSERT lf_claims(claim_id,found_item_id,claimant_user_id,status,submitted_at,reviewed_by_user_id) VALUES(@id,@foundItemId,@claimantUserId,@status,@submittedAt,@reviewerId)`); for (const [question, answer] of Object.entries(claim.answers || {})) await request({ id: claim.id, question, answer }).query(`INSERT lf_claim_verification(claim_id,question,claimant_answer) VALUES(@id,@question,@answer)`); }
    await request().query('SET IDENTITY_INSERT lf_claims OFF');
    await transaction.commit();
    console.log(`SQL Server seeded: ${source.data.users.length} users, ${source.data.foundItems.length} found items, ${source.data.lostItems.length} lost items, ${source.data.matches.length} matches.`);
  } catch (error) { await transaction.rollback(); throw error; }
  finally { await fs.rm(tempFile, { force: true }); await pool.close(); }
}
