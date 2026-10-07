-- Vertical rename — Phase 1 of 2 (safe prep)
--
-- Prepares the new vertical taxonomy without disrupting the live site:
--   • Creates the three new buckets (Make / Save / Budget Money) as INACTIVE
--     so the navbar doesn't surface empty categories mid-migration.
--   • Renames the three verticals that map 1:1 and sets their featured_order
--     to match the final navbar order. Slugs are deliberately preserved so
--     every indexed URL from the 2026-09-09 SEO push keeps working.
--   • Deactivates `sports` (orphan — no fit in the new taxonomy). Posts
--     and the vertical row are preserved; they just stop rendering.
--
-- Phase 2 (reassign finance posts/picks and flip active flags) runs after
-- the finance split has been reviewed. See 20261007120100_vertical_rename_phase2.sql.

begin;

-- 1a. Create the 3 new verticals (inactive until Phase 2 reassigns content).
insert into verticals (name, slug, active, featured, featured_order)
values
  ('Make Money',   'make-money',   false, true, 1),
  ('Save Money',   'save-money',   false, true, 2),
  ('Budget Money', 'budget-money', false, true, 3);

-- 1b. Rename 1:1 mappings. Slugs preserved to keep existing URLs working.
update verticals set name = 'Debt',       featured_order = 4 where slug = 'debt';
update verticals set name = 'Best Deals', featured_order = 5 where slug = 'what-to-buy';
update verticals set name = 'Insurance',  featured_order = 6 where slug = 'insurance';

-- 1c. Hide sports (preserved as inactive — row and posts untouched).
update verticals set active = false, featured = false where slug = 'sports';

commit;
