import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'college_lost_found.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_name TEXT NOT NULL,
      usn TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admins (
      admin_id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      category_id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS items (
      item_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      description TEXT NOT NULL,
      report_type TEXT NOT NULL CHECK(report_type IN ('lost', 'found')),
      item_date TEXT NOT NULL,
      location TEXT NOT NULL,
      image TEXT DEFAULT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'returned')),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS claims (
      claim_id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      claim_description TEXT NOT NULL,
      supporting_info TEXT NOT NULL DEFAULT '',
      claim_status TEXT NOT NULL DEFAULT 'pending' CHECK(claim_status IN ('pending', 'approved', 'rejected')),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES items(item_id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_items_status_type ON items(status, report_type);
    CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
    CREATE INDEX IF NOT EXISTS idx_claims_item ON claims(item_id);
  `);

  const categoryCount = (db.prepare('SELECT COUNT(*) AS count FROM categories').get() as { count: number }).count;
  if (categoryCount === 0) {
    const insertCategory = db.prepare('INSERT INTO categories (category_name) VALUES (?)');
    const defaultCategories = [
      'Electronics',
      'ID Cards & Keys',
      'Books & Stationery',
      'Bags & Accessories',
      'Wallets & Valuables',
      'Clothing & Footwear',
      'Lab & Sports Gear',
      'Other',
    ];
    const seedCategories = db.transaction(() => {
      for (const name of defaultCategories) {
        insertCategory.run(name);
      }
    });
    seedCategories();
  }

  const itemCount = (db.prepare('SELECT COUNT(*) AS count FROM items').get() as { count: number }).count;
  if (itemCount === 0) {
    const insertUser = db.prepare(
      'INSERT INTO users (student_name, usn, email, phone, password) VALUES (?, ?, ?, ?, ?)'
    );
    const insertItem = db.prepare(
      `INSERT INTO items (user_id, category_id, item_name, description, report_type, item_date, location, image, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insertClaim = db.prepare(
      `INSERT INTO claims (item_id, user_id, claim_description, supporting_info, claim_status)
       VALUES (?, ?, ?, ?, ?)`
    );

    const getCatId = (name: string): number => {
      const row = db.prepare('SELECT category_id FROM categories WHERE category_name = ?').get(name) as
        | { category_id: number }
        | undefined;
      return row ? row.category_id : 1;
    };

    const seedSampleData = db.transaction(() => {
      const u1 = Number(
        insertUser.run(
          'Aarav Kulkarni',
          '1BG23BC014',
          'aarav.k@campus.edu',
          '9845012340',
          '!SEEDED_PROFILE_NO_LOGIN'
        ).lastInsertRowid
      );
      const u2 = Number(
        insertUser.run(
          'Sneha Nair',
          '1BG23BC042',
          'sneha.nair@campus.edu',
          '9845098761',
          '!SEEDED_PROFILE_NO_LOGIN'
        ).lastInsertRowid
      );
      const u3 = Number(
        insertUser.run(
          'Rohan Deshmukh',
          '1BG22BC028',
          'rohan.d@campus.edu',
          '9900112233',
          '!SEEDED_PROFILE_NO_LOGIN'
        ).lastInsertRowid
      );
      const u4 = Number(
        insertUser.run(
          'Meera Krishnan',
          '1BG24BC009',
          'meera.k@campus.edu',
          '9740055667',
          '!SEEDED_PROFILE_NO_LOGIN'
        ).lastInsertRowid
      );

      const catElectronics = getCatId('Electronics');
      const catIds = getCatId('ID Cards & Keys');
      const catBooks = getCatId('Books & Stationery');
      const catBags = getCatId('Bags & Accessories');
      const catWallets = getCatId('Wallets & Valuables');

      const i1 = Number(
        insertItem.run(
          u1,
          catBags,
          'Navy Padded Laptop Sleeve & Wireless Mouse',
          '14-inch dark navy zip sleeve with a compact silver wireless mouse inside the front pocket. Left on the silent reading desk near the second-floor window.',
          'found',
          '2026-11-20',
          'Central Library — 2nd Floor Reading Wing',
          '/src/assets/images/item_laptop_sleeve_1795497659452.jpg',
          'approved'
        ).lastInsertRowid
      );

      insertItem.run(
        u2,
        catIds,
        'Campus ID Card on Navy Lanyard with Two Brass Keys',
        'Plastic student access holder attached to a woven navy lanyard and two numbered locker keys. Found near the main auditorium entrance steps after the morning assembly.',
        'found',
        '2026-11-21',
        'Main Auditorium Entrance Steps',
        '/src/assets/images/item_student_lanyard_1795497660745.jpg',
        'approved'
      );

      const i3 = Number(
        insertItem.run(
          u3,
          catBooks,
          'Matte Black Scientific Graphing Calculator & Navy Notebook',
          'Casio scientific graphing calculator paired with a dark navy hardcover notebook containing Data Structures lecture notes. Last seen after the 11 AM lab session.',
          'lost',
          '2026-11-19',
          'Computer Science Block — Lab 304',
          '/src/assets/images/item_scientific_calculator_1795497660172.jpg',
          'approved'
        ).lastInsertRowid
      );

      insertItem.run(
        u4,
        catElectronics,
        'Charcoal Over-Ear Wireless ANC Headphones',
        'Matte charcoal wireless headphones with brushed silver hinges and USB-C charging port. Misplaced near the student cafeteria seating booth.',
        'lost',
        '2026-11-22',
        'Student Cafeteria — East Booths',
        '/src/assets/images/item_wireless_headphones_1795497660750.jpg',
        'approved'
      );

      insertItem.run(
        u2,
        catWallets,
        'Brown Leather Bi-Fold Cardholder',
        'Slim brown leather cardholder containing metro transit pass and library card. Turned in to the Academic Block reception desk.',
        'found',
        '2026-11-17',
        'Academic Block A — Reception Counter',
        null,
        'returned'
      );

      insertItem.run(
        u1,
        catElectronics,
        '64GB SanDisk Metal USB Flash Drive',
        'Silver keyring flash drive labeled "BCA Sem 5 Project" left plugged into workstation 18 in the MCA/BCA networking lab.',
        'found',
        '2026-11-23',
        'Networking Lab — Workstation 18',
        null,
        'pending'
      );

      insertClaim.run(
        i1,
        u3,
        'This is my 14-inch navy sleeve and silver Logitech Pebble mouse left after preparing my DBMS presentation.',
        'There is a small university robotics sticker inside the inner lining and the mouse battery cover has my initials R.D.',
        'pending'
      );

      insertClaim.run(
        i3,
        u4,
        'I found a matching matte black calculator in the CS corridor bench right outside Lab 304.',
        'Can bring it to the Student Welfare office tomorrow at 10:30 AM for verification.',
        'pending'
      );
    });

    seedSampleData();
  }
}

export default db;
