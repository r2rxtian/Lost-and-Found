USE LostFoundDB;
GO
INSERT INTO lf_roles(role_name) VALUES ('USER'),('STAFF'),('ADMIN');
INSERT INTO lf_categories(name) VALUES ('Wallet'),('Phone'),('Keys'),('Bag'),('Electronics'),('Clothing'),('Jewelry'),('Documents'),('Accessories'),('Other');
-- Locations are intentionally empty. Add the real locations for your organization in Admin > Locations.
-- The first administrator is created with `npm run db:seed --prefix server`.
GO
