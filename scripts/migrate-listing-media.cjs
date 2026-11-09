#!/usr/bin/env node

require('dotenv').config();
const { Pool } = require('pg');

// Move existing normalized media rows into each listing's JSON media array.
async function migrateListingMedia() {
  const apply = process.argv.includes('--apply');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const { rows } = await pool.query(`
      SELECT l."id" AS listing_id, l."media" AS current_media,
             m."type", m."url", m."alt", m."sortOrder"
      FROM "listings" l
      JOIN "listings_media" m ON m."propertyId" = l."id"
      WHERE m."isDeleted" = false
      ORDER BY l."id", m."sortOrder", m."id"
    `);

    const mediaByListing = new Map();
    for (const row of rows) {
      const media = mediaByListing.get(row.listing_id) ?? {
        currentMedia: row.current_media ?? [],
        entries: [],
      };
      media.entries.push({ type: row.type, url: row.url, alt: row.alt });
      mediaByListing.set(row.listing_id, media);
    }

    if (apply) await pool.query('BEGIN');
    try {
      for (const [listingId, { currentMedia, entries }] of mediaByListing) {
        const mergedMedia = [...currentMedia, ...entries];
        if (apply) {
          await pool.query(
            'UPDATE "listings" SET "media" = $1::jsonb WHERE "id" = $2',
            [JSON.stringify(mergedMedia), listingId],
          );
        } else {
          console.log(`WOULD UPDATE ${listingId}: ${entries.length} media item(s)`);
        }
      }
      if (apply) await pool.query('COMMIT');
    } catch (error) {
      if (apply) await pool.query('ROLLBACK');
      throw error;
    }

    console.log(`${apply ? 'Applied' : 'Previewed'} media migration for ${mediaByListing.size} listing(s).`);
    if (!apply) console.log('Run with --apply to write the arrays to listings.media.');
  } finally {
    await pool.end();
  }
}

migrateListingMedia().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
