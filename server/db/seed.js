require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../config/db');

const SALT_ROUNDS = 12;

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding database...');

    // ── Users ────────────────────────────────────────────────────────────────
    const adminHash = await bcrypt.hash('Admin123!', SALT_ROUNDS);
    const donorHash = await bcrypt.hash('Donor123!', SALT_ROUNDS);

    const { rows: [admin] } = await client.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
       RETURNING id`,
      ['Admin User', 'admin@yaxshilik.uz', adminHash, 'admin']
    );

    const { rows: [donor] } = await client.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
       RETURNING id`,
      ['Test Donor', 'donor@yaxshilik.uz', donorHash, 'donor']
    );

    console.log(`  ✓ users (admin id=${admin.id}, donor id=${donor.id})`);

    // ── Categories ───────────────────────────────────────────────────────────
    const categoryData = [
      ['Medical',          'Healthcare assistance and medical treatment support'],
      ['Education',        'Scholarships, school supplies, and learning resources'],
      ['Housing',          'Shelter, home repairs, and housing for vulnerable families'],
      ['Emergency Relief', 'Rapid response aid for natural disasters and crises'],
      ['Community',        'Local development projects and social welfare programs'],
    ];

    const categoryIds = {};
    for (const [name, description] of categoryData) {
      const { rows: [cat] } = await client.query(
        `INSERT INTO categories (name, description)
         VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
         RETURNING id, name`,
        [name, description]
      );
      categoryIds[cat.name] = cat.id;
    }
    console.log('  ✓ categories');

    // ── Cases ────────────────────────────────────────────────────────────────
    // case-1: Medical (35M) → ~90% funded
    // case-2: Education (8M) → ~50% funded
    // case-3: Emergency Relief (50M) → ~30% funded
    // case-4: Community (22M) → ~45% funded
    // case-5: Education (45M) → ~20% funded
    // case-6: Housing (15M) → ~60% funded
    const casesData = [
      {
        title: 'Medical Treatment for Aziza',
        description:
          'Eight-year-old Aziza from Andijan has been diagnosed with a rare kidney condition requiring two surgeries and six months of specialist care at the Republican Clinical Hospital in Tashkent. Her parents, both school teachers, cannot cover the estimated treatment costs. Every donation directly pays for surgical fees, medication, and transport for the family during the recovery period.',
        goal_amount: 35_000_000,
        category: 'Medical',
        image_url: '/uploads/case-1.svg',
      },
      {
        title: 'School Supplies for Karakalpakstan Children',
        description:
          'Four primary schools in remote villages of Karakalpakstan have gone three academic terms without adequate workbooks, stationery, or classroom materials due to regional funding shortfalls. This campaign will provide 800 children with full stationery packs, exercise books, and basic art supplies for the upcoming school year, ensuring no child is left to learn empty-handed.',
        goal_amount: 8_000_000,
        category: 'Education',
        image_url: '/uploads/case-2.svg',
      },
      {
        title: 'Rebuilding After Bukhara Floods',
        description:
          'Record spring flooding in the Bukhara region devastated 14 low-income households, washing away walls, roofs, and stored food reserves. The Rahimov and six neighbouring families are currently sheltering in a community hall. Funds raised will purchase construction materials, cover labourer costs, and provide basic household items so these families can return to rebuilt homes before the harsh summer heat arrives.',
        goal_amount: 50_000_000,
        category: 'Emergency Relief',
        image_url: '/uploads/case-3.svg',
      },
      {
        title: 'Community Library in Fergana',
        description:
          'The Fergana Youth Development Association is converting a disused building into a free community library and study centre open to all residents. The space will house 4,000 donated books, provide free internet access, and run weekly literacy and coding workshops for teenagers. Funds are needed for shelving, furniture, computer equipment, and the first year of operating costs.',
        goal_amount: 22_000_000,
        category: 'Community',
        image_url: '/uploads/case-4.svg',
      },
      {
        title: 'Wheelchair Access for Navoi School',
        description:
          'School No. 14 in Navoi city serves 38 students with mobility impairments who currently cannot access the second and third floors where science labs, the library, and computer classrooms are located. This campaign will fund the installation of a wheelchair-accessible ramp and a small lift, ensuring every student has equal access to all educational facilities in the building.',
        goal_amount: 45_000_000,
        category: 'Education',
        image_url: '/uploads/case-5.svg',
      },
      {
        title: 'Winter Heating for Elderly in Tashkent',
        description:
          'Forty-two elderly residents living alone in the Yunusabad district of Tashkent cannot afford heating fuel for the coming winter. Many are war veterans or retired teachers surviving on minimal pensions. This campaign will purchase and deliver gas heaters and a two-month fuel supply to each household, preventing cold-related illness and ensuring a warm, safe winter for our most vulnerable neighbours.',
        goal_amount: 15_000_000,
        category: 'Housing',
        image_url: '/uploads/case-6.svg',
      },
    ];

    const caseIds = [];
    for (const c of casesData) {
      const { rows: [row] } = await client.query(
        `INSERT INTO cases
           (title, description, image_url, goal_amount, category_id, status, created_by)
         VALUES ($1, $2, $3, $4, $5, 'active', $6)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [c.title, c.description, c.image_url, c.goal_amount, categoryIds[c.category], admin.id]
      );
      if (row) {
        caseIds.push(row.id);
      } else {
        // Already exists — fetch its id
        const { rows: [existing] } = await client.query(
          'SELECT id FROM cases WHERE title = $1',
          [c.title]
        );
        caseIds.push(existing.id);
      }
    }
    console.log(`  ✓ cases (ids=${caseIds.join(', ')})`);

    // ── Donations ────────────────────────────────────────────────────────────
    // Target funding levels:
    //   case[0] Medical  35M  → ~31.5M (90%)
    //   case[1] Education 8M  → ~4M    (50%)
    //   case[2] Emergency 50M → ~15M   (30%)
    //   case[3] Community 22M → ~10M   (45%)
    //   case[4] Education 45M → ~9M    (20%)
    //   case[5] Housing   15M → ~9M    (60%)
    const donationsData = [
      // ── case[0] Medical Treatment for Aziza — target ~31.5M ──────────────
      { case_idx: 0, amount:  5_000_000, message: 'Get well soon, Aziza. Our whole family is praying for you.',  ref: 'TXN-2025-000001' },
      { case_idx: 0, amount:  8_000_000, message: 'No child should suffer for lack of funds. Happy to help.',    ref: 'TXN-2025-000002' },
      { case_idx: 0, amount:  3_500_000, message: 'Wishing Aziza a full and speedy recovery.',                   ref: 'TXN-2025-000003' },
      { case_idx: 0, amount:  7_000_000, message: 'Donated in memory of my late daughter. Stay strong.',         ref: 'TXN-2025-000004' },
      { case_idx: 0, amount:  4_000_000, message: 'Small amount but given with a full heart.',                   ref: 'TXN-2025-000005' },
      { case_idx: 0, amount:  4_000_000, message: 'Shared this with my colleagues — we collected together.',     ref: 'TXN-2025-000006' },

      // ── case[1] School Supplies Karakalpakstan — target ~4M ──────────────
      { case_idx: 1, amount:  1_500_000, message: 'Education is everything. Best of luck to the children.',      ref: 'TXN-2025-000007' },
      { case_idx: 1, amount:  1_200_000, message: 'Happy to support schools in our region.',                     ref: 'TXN-2025-000008' },
      { case_idx: 1, amount:  1_300_000, message: 'Every child deserves proper school supplies.',                 ref: 'TXN-2025-000009' },

      // ── case[2] Bukhara Floods — target ~15M ─────────────────────────────
      { case_idx: 2, amount:  5_000_000, message: 'Hope this helps the families rebuild quickly before summer.',  ref: 'TXN-2025-000010' },
      { case_idx: 2, amount:  4_000_000, message: 'Donated as a family. Stay strong, Bukhara.',                  ref: 'TXN-2025-000011' },
      { case_idx: 2, amount:  3_000_000, message: 'We went through a flood ourselves — I know how hard it is.',  ref: 'TXN-2025-000012' },
      { case_idx: 2, amount:  3_000_000, message: 'Matching my friend\'s donation. Rebuild strong.',              ref: 'TXN-2025-000013' },

      // ── case[3] Community Library Fergana — target ~10M ──────────────────
      { case_idx: 3, amount:  3_000_000, message: 'A library changes everything for a neighbourhood.',            ref: 'TXN-2025-000014' },
      { case_idx: 3, amount:  4_000_000, message: 'I grew up without a library. Glad to help create one.',       ref: 'TXN-2025-000015' },
      { case_idx: 3, amount:  3_000_000, message: 'Future engineers and doctors will read here one day.',         ref: 'TXN-2025-000016' },

      // ── case[4] Wheelchair Access Navoi — target ~9M ─────────────────────
      { case_idx: 4, amount:  5_000_000, message: 'Accessibility is not optional. Every student matters.',        ref: 'TXN-2025-000017' },
      { case_idx: 4, amount:  4_000_000, message: 'My cousin uses a wheelchair — this cause is close to my heart.', ref: 'TXN-2025-000018' },

      // ── case[5] Winter Heating Tashkent — target ~9M ─────────────────────
      { case_idx: 5, amount:  4_000_000, message: 'No one should be cold in winter. Thank you for organising this.', ref: 'TXN-2025-000019' },
      { case_idx: 5, amount:  5_000_000, message: 'My grandmother is one of these residents. Deeply grateful.',   ref: 'TXN-2025-000020' },
    ];

    for (const d of donationsData) {
      await client.query(
        `INSERT INTO donations (user_id, case_id, amount, message, transaction_ref)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (transaction_ref) DO NOTHING`,
        [donor.id, caseIds[d.case_idx], d.amount, d.message, d.ref]
      );
    }
    console.log(`  ✓ donations (${donationsData.length} records)`);

    // ── Sync raised_amount ───────────────────────────────────────────────────
    await client.query(`
      UPDATE cases c
      SET raised_amount = COALESCE(
        (SELECT SUM(amount) FROM donations WHERE case_id = c.id), 0
      ),
      updated_at = CURRENT_TIMESTAMP
    `);
    console.log('  ✓ raised_amount synced');

    console.log('Seed complete.');
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
