-- Vertical rename — Phase 2 of 2 (reassign + activate)
--
-- Reassigns the 31 posts + 4 picks currently under `finance` to the three
-- new buckets (Make / Save / Budget Money), with 5 flagged items routed to
-- the existing `debt` and `insurance` verticals where they fit better.
--
-- Classification was done by title + excerpt; buckets:
--   Make Money   — earning, side hustles, income/tax strategies (7 posts)
--   Save Money   — cutting costs, discounts, HYS, bills (9 posts + 3 picks)
--   Budget Money — planning, retirement, investment decisions (11 posts + 1 pick)
--   Debt         — 3 flagged finance posts about loans / credit / debt
--   Insurance    — 2 flagged finance posts about insurance products
--
-- Pre-req: Phase 1 (20261007120000_vertical_rename_phase1.sql) must be applied,
-- so the three new vertical rows exist. The transaction below is all-or-nothing
-- — if any statement fails, nothing changes.

begin;

-- =============================================================
-- Reassign posts
-- =============================================================

-- Make Money (7 posts)
update posts set vertical_id = (select id from verticals where slug = 'make-money')
where id in (
  'ddab0e59-dcf0-48c6-a152-6d6c42bcd387', -- How to Get a House for Free
  '6ba68476-39c0-4215-88c9-df5e2b51a1c3', -- Don't Even Think About Renting Your House to Your Own Business
  '1feedafd-8e15-447c-a58b-ed7abf305d42', -- Pay 0% Tax on Your Stock Profits (2026)
  '6a67c6bd-a246-2e0c-5210-4fad00000000', -- 12 Apps That Pay Real Cash in 2026
  '6a689b2d-928a-7000-2723-588400000000', -- 18 Flexible Ways for College Students to Earn Extra Money
  '6a689966-928a-7000-2723-588200000000', -- 10 Companies That Pay People for Simple Everyday Tasks
  '6a6890e3-928a-7000-2723-587d00000000'  -- Side Hustles That Can Bring In an Extra $500/Month
);

-- Save Money (9 posts)
update posts set vertical_id = (select id from verticals where slug = 'save-money')
where id in (
  'f15ed251-5731-43d2-b462-46baa74bcb01', -- Lower Property Taxes With Bees?
  '6a67c6bd-a246-2e0c-5210-4fab00000000', -- Why Millennials Are Flocking to High-Yield Savings
  '6a67c6bd-a246-2e0c-5210-4fa700000000', -- How to Negotiate a Medical Bill Down to Zero
  '6a67c6bd-a246-2e0c-5210-4fa400000000', -- The Hidden Costs of 0% Financing Offers
  '6a67c6bd-a246-2e0c-5210-4f9500000000', -- How to Audit Your Own Monthly Subscriptions and Save
  '6a67c6bd-a246-2e0c-5210-4fa600000000', -- The Beginner's Guide to Series I Savings Bonds
  '6a67c6bd-a246-2e0c-5210-4f9400000000', -- Understanding the New 529 College Savings Plan Rules
  '6a67c6bd-a246-2e0c-5210-4fa800000000', -- The Ultimate Guide to Travel Rewards Credit Cards
  '6a689cc8-928a-7000-2723-588600000000'  -- 8 Financial Aid Strategies That Could Save Families Thousands
);

-- Budget Money (11 posts)
update posts set vertical_id = (select id from verticals where slug = 'budget-money')
where id in (
  'f93e6312-5383-4411-a2a7-9f31f6cb8046', -- Things I Wish Someone Had Told Me Before Becoming a Mom
  '6a67d248-94cf-b3fd-f56f-b06600000000', -- Retirement Planning Mistakes
  '6a67c6bd-a246-2e0c-5210-4fa200000000', -- Navigating the New Tax Brackets for 2027
  '6a67c6bd-a246-2e0c-5210-4fb100000000', -- How to Prepare Your Finances for a Potential Recession
  '6a67c6bd-a246-2e0c-5210-4f9000000000', -- Tax Implications of Remote Work Across State Lines
  '6a67c6bd-a246-2e0c-5210-4f8f00000000', -- Are Electric Vehicles Still a Good Financial Investment?
  '6a67c6bd-a246-2e0c-5210-4fae00000000', -- How Inflation Is Affecting Your Grocery Bill
  '6a67c6bd-a246-2e0c-5210-4fa000000000', -- Are Target-Date Funds Actually Costing You Money?
  '6a67c6bd-a246-2e0c-5210-4f9f00000000', -- The Rise of Robo-Advisors
  '6a67c6bd-a246-2e0c-5210-4fa500000000', -- Is It Finally Time to Buy a Hybrid Vehicle?
  '6a67c6bd-a246-2e0c-5210-4fa900000000'  -- When to Start Taking Social Security Benefits
);

-- Flagged → Debt (3 posts). Comment out this block to keep them in Budget Money instead.
update posts set vertical_id = (select id from verticals where slug = 'debt')
where id in (
  'c5f1d7cb-6213-48b2-bd91-a217f342a0ce', -- Can Returning to School Actually Halt Your Student Loans?
  '6a67c6bd-a246-2e0c-5210-4fa100000000', -- The Truth About Credit Repair Services
  '6a67c6bd-a246-2e0c-5210-4faa00000000'  -- The Psychological Toll of Carrying High-Interest Debt
);

-- Flagged → Insurance (2 posts). Comment out this block to keep them in Budget Money instead.
update posts set vertical_id = (select id from verticals where slug = 'insurance')
where id in (
  '6a67c6bd-a246-2e0c-5210-4fb000000000', -- Understanding the Fine Print on Life Insurance Policies
  '6a67c6bd-a246-2e0c-5210-4fa300000000'  -- Why Your Auto Insurance Rates Are Spiking Again
);

-- =============================================================
-- Reassign picks (4 total)
-- =============================================================

-- Save Money (3 picks)
update picks set primary_vertical_id = (select id from verticals where slug = 'save-money')
where id in (
  '88632d0e-92f6-4c4a-b77a-aa7d7875d619', -- How to Make Your Savings Go Further
  '58613f07-660b-4805-9a2c-6fa0521b3cea', -- 15+ Best Senior Discounts
  'e60a3c5d-d1b6-4032-bdac-0325ac5e1f99'  -- 10 Expenses Senior Veterans May Be Able to Reduce
);

-- Budget Money (1 pick)
update picks set primary_vertical_id = (select id from verticals where slug = 'budget-money')
where id = 'b6c64996-994f-458a-a086-e89ed11cdaea'; -- 12 Things You Should Talk About Before You Get Married

-- =============================================================
-- Flip the switch: new verticals go live, finance goes dark
-- =============================================================
update verticals set active = true  where slug in ('make-money', 'save-money', 'budget-money');
update verticals set active = false, featured = false where slug = 'finance';

-- =============================================================
-- Sanity check — raise an exception if any posts/picks still point at finance.
-- Keeps the migration atomic: if we miss anything, the whole thing rolls back.
-- =============================================================
do $$
declare
  orphan_post_count int;
  orphan_pick_count int;
begin
  select count(*) into orphan_post_count
  from posts p
  join verticals v on v.id = p.vertical_id
  where v.slug = 'finance';

  select count(*) into orphan_pick_count
  from picks pk
  join verticals v on v.id = pk.primary_vertical_id
  where v.slug = 'finance';

  if orphan_post_count > 0 or orphan_pick_count > 0 then
    raise exception 'Migration incomplete: % posts and % picks still pointing at finance',
      orphan_post_count, orphan_pick_count;
  end if;
end $$;

commit;
