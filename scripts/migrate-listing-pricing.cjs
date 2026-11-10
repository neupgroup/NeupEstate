#!/usr/bin/env node

require('dotenv').config();
const { Pool } = require('pg');

const SQUARE_METERS_PER_UNIT = new Map([
  ['sqm', '1'], ['sq m', '1'], ['square meter', '1'], ['square meters', '1'], ['m²', '1'],
  ['sqft', '0.09290304'], ['sq ft', '0.09290304'], ['square feet', '0.09290304'],
  ['sqyd', '0.83612736'], ['sq yd', '0.83612736'], ['square yard', '0.83612736'],
  ['aana', '31.797'], ['ana', '31.797'], ['ropani', '508.752'], ['paisa', '7.94925'],
  ['daam', '1.9873125'], ['bigha', '2508.38208'], ['kattha', '313.54776'], ['dhur', '15.677388'],
  ['acre', '4046.8564224'], ['hectare', '10000'],
]);

const VALID_BASES = new Set(['total', 'perUnit', 'perMonth', 'perYear', 'perUnitPerMonth', 'perUnitPerYear']);

// Normalize spelling for lookup while retaining the original unit in diagnostics.
function normalizeUnit(unit) {
  return String(unit ?? '').trim().toLowerCase().replaceAll('_', ' ').replaceAll('-', ' ');
}

// Pick one price per listing, preferring a non-rental price when several rows exist.
function selectPrice(prices) {
  if (prices.length <= 1) return prices[0];
  return prices.find((price) => !/rent|lease/i.test(price.sourcePurpose));
}

// Infer the structured basis and source area unit from legacy unit and display fields.
function getPricingBasis(price) {
  const display = String(price.priceUnit ?? '');
  const unit = normalizeUnit(price.basis);
  const normalizedSourceAreaUnit = normalizeUnit(price.areaUnit);
  const areaUnit = (SQUARE_METERS_PER_UNIT.has(normalizedSourceAreaUnit) ? normalizedSourceAreaUnit : null)
    ?? [...SQUARE_METERS_PER_UNIT.keys()].find((candidate) =>
    new RegExp(`\\b${candidate.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b`, 'i').test(display),
  ) ?? (SQUARE_METERS_PER_UNIT.has(unit) ? unit : null);
  const isPerUnit = /per\s*[- ]?\s*(aana|ana|ropani|paisa|daam|bigha|kattha|dhur|sq.?m|sq.?ft|sq.?yd)/i.test(display)
    || (areaUnit !== null && unit !== 'total');
  const frequency = String(price.frequency ?? '');
  const isPerMonth = /per\s*[- ]?\s*month/i.test(display) || ['monthly', 'quarterly', 'half-yearly', 'half yearly'].includes(frequency.trim().toLowerCase());
  const isPerYear = /per\s*[- ]?\s*(year|annum|annual)/i.test(display) || ['yearly', 'annual'].includes(frequency.trim().toLowerCase());

  if (isPerUnit && isPerMonth) return { basis: 'perUnitPerMonth', areaUnit };
  if (isPerUnit && isPerYear) return { basis: 'perUnitPerYear', areaUnit };
  if (isPerUnit) return { basis: 'perUnit', areaUnit };
  if (isPerMonth) return { basis: 'perMonth', areaUnit: null };
  if (isPerYear) return { basis: 'perYear', areaUnit: null };
  if (VALID_BASES.has(price.basis)) return { basis: price.basis, areaUnit: null };
  if (unit === 'total' || unit.includes('flat')) return { basis: 'total', areaUnit: null };
  throw new Error(`Unsupported price basis/unit: ${price.basis}`);
}

// Return the area conversion factor needed to normalize a per-area amount to square meters.
function getSquareMetersPerUnit(areaUnit) {
  if (!areaUnit) return null;
  const squareMetersPerUnit = SQUARE_METERS_PER_UNIT.get(normalizeUnit(areaUnit));
  if (!squareMetersPerUnit) throw new Error(`Unsupported area unit: ${areaUnit}`);
  return squareMetersPerUnit;
}

// Read legacy prices, validate their destination fields, then preview or apply updates.
async function migrateListingPricing() {
  const apply = process.argv.includes('--apply');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const { rows } = await pool.query(`
      SELECT p."id", p."propertyId" AS listing_id, p."unit" AS basis,
             p."for" AS source_purpose, p."currency", p."price" AS amount,
             p."priceUnit", l."purpose" AS listing_purpose
      FROM "property_price" p
      JOIN "listings" l ON l."id" = p."propertyId"
      ORDER BY p."propertyId", p."id"
    `);

    const byListing = new Map();
    for (const row of rows) {
      const group = byListing.get(row.listing_id) ?? [];
      group.push(row);
      byListing.set(row.listing_id, group);
    }

    let updated = 0;
    let skipped = 0;
    if (apply) await pool.query('BEGIN');
    try {
      for (const [listingId, prices] of byListing) {
        const price = selectPrice(prices);
        if (!price) {
          console.warn(`SKIP ${listingId}: no non-rental price among ${prices.length} rows`);
          skipped += 1;
          continue;
        }
        if (String(price.currency).length > 3) {
          console.warn(`SKIP ${listingId}: currency ${JSON.stringify(price.currency)} does not fit the new three-character currency code field`);
          skipped += 1;
          continue;
        }

        let pricingBasis;
        let squareMetersPerUnit;
        try {
          pricingBasis = getPricingBasis(price);
          squareMetersPerUnit = getSquareMetersPerUnit(pricingBasis.areaUnit);
        } catch (error) {
          console.warn(`SKIP ${listingId}: ${error.message}`);
          skipped += 1;
          continue;
        }

        let priceAmount = String(price.amount);
        if (squareMetersPerUnit !== null) {
          const { rows: amountRows } = await pool.query(
            'SELECT ($1::numeric / $2::numeric)::numeric(22,10)::text AS amount',
            [price.amount, squareMetersPerUnit],
          );
          priceAmount = amountRows[0].amount;
        }
        const update = { listingId, basis: pricingBasis.basis, currency: price.currency, priceAmount };
        if (process.argv.includes('--verbose')) console.log(`${apply ? 'UPDATE' : 'WOULD UPDATE'} ${JSON.stringify(update)}`);
        if (apply) {
          await pool.query(`
            UPDATE "listings"
            SET "priceBasis" = $1::"ListingPriceBasis", "priceCurrency" = $2, "priceListed" = $3::numeric
            WHERE "id" = $4
          `, [pricingBasis.basis, price.currency, priceAmount, listingId]);
        }
        updated += 1;
      }

    const { rows: legacyRows } = await pool.query(`
      SELECT id AS listing_id, "displayPrice" AS amount, "displayPriceUnit" AS legacy_basis,
             currency, pricing
      FROM "listings"
      WHERE "priceListed" IS NULL AND "displayPrice" > 0
      ORDER BY id
    `);
    for (const row of legacyRows) {
      const savedPricing = row.pricing && typeof row.pricing === 'object' ? row.pricing : {};
      const basis = savedPricing.basis || row.legacy_basis || 'total';
      const price = {
        ...row,
        basis,
        currency: savedPricing.currency || row.currency,
        priceUnit: row.legacy_basis,
        areaUnit: savedPricing.basisUnits?.[basis],
        frequency: savedPricing.basisFrequencies?.[basis],
      };
      if (String(price.currency).length > 3) {
        console.warn(`SKIP ${row.listing_id}: currency ${JSON.stringify(price.currency)} does not fit the new three-character currency code field`);
        skipped += 1;
        continue;
      }

      let pricingBasis;
      let squareMetersPerUnit;
      try {
        pricingBasis = getPricingBasis(price);
        squareMetersPerUnit = getSquareMetersPerUnit(pricingBasis.areaUnit);
      } catch (error) {
        console.warn(`SKIP ${row.listing_id}: ${error.message}`);
        skipped += 1;
        continue;
      }

      let priceAmount = String(price.amount);
      const frequency = String(price.frequency ?? '').trim().toLowerCase();
      const periodDivisor = frequency === 'quarterly' ? '3' : (frequency === 'half-yearly' || frequency === 'half yearly') ? '6' : '1';
      const conversionDivisor = squareMetersPerUnit === null
        ? periodDivisor
        : String(Number(squareMetersPerUnit) * Number(periodDivisor));
      if (conversionDivisor !== '1') {
        const { rows: amountRows } = await pool.query(
          'SELECT ($1::numeric / $2::numeric)::numeric(22,10)::text AS amount',
          [price.amount, conversionDivisor],
        );
        priceAmount = amountRows[0].amount;
      }
      const update = { listingId: row.listing_id, basis: pricingBasis.basis, currency: price.currency, priceAmount };
      if (process.argv.includes('--verbose')) console.log(`${apply ? 'UPDATE' : 'WOULD UPDATE'} ${JSON.stringify(update)}`);
      if (apply) {
        await pool.query(`
          UPDATE "listings"
          SET "priceBasis" = $1::"ListingPriceBasis", "priceCurrency" = $2, "priceListed" = $3::numeric
          WHERE "id" = $4 AND "priceListed" IS NULL
        `, [pricingBasis.basis, price.currency, priceAmount, row.listing_id]);
      }
      updated += 1;
    }
      if (apply) await pool.query('COMMIT');
    } catch (error) {
      if (apply) await pool.query('ROLLBACK');
      throw error;
    }

    console.log(`${apply ? 'Applied' : 'Previewed'} ${updated} listing price update(s); skipped ${skipped}.`);
    if (!apply) console.log('Run with --apply to write these values to listings.');
  } finally {
    await pool.end();
  }
}

migrateListingPricing().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
