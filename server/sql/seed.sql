USE LostFoundDB;
GO
INSERT INTO lf_roles(role_name) VALUES ('USER'),('STAFF'),('ADMIN');
INSERT INTO lf_categories(name) VALUES ('Wallet'),('Phone'),('Keys'),('Bag'),('Electronics'),('Clothing'),('Jewelry'),('Documents'),('Accessories'),('Other');
INSERT INTO lf_locations(name) VALUES ('Building A - Lobby'),('Building B - Cafeteria'),('Library - 2nd Floor'),('Student Center'),('Parking Area'),('Gym'),('Main Entrance');
-- Demo users are inserted by server/scripts/seed-users.js so bcrypt hashes are generated safely.
GO
