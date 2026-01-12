import db from '../config/db.js';

export function registerService(type, phone, village) {
  return new Promise((resolve, reject) => {
    const sql =
      'INSERT INTO services (type, owner_phone, village) VALUES (?, ?, ?)';

    db.query(sql, [type, phone, village], err => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function getAvailableService(type, village) {
  return new Promise((resolve, reject) => {
    const sql =
      'SELECT * FROM services WHERE type = ? AND village = ? AND available = true LIMIT 1';

    db.query(sql, [type, village], (err, rows) => {
      if (err) reject(err);
      else resolve(rows[0]);
    });
  });
}

export function markServiceUnavailable(serviceId) {
  return new Promise((resolve, reject) => {
    const sql =
      'UPDATE services SET available = false WHERE id = ?';

    db.query(sql, [serviceId], err => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function markServiceAvailable(serviceId) {
  return new Promise((resolve, reject) => {
    const sql =
      'UPDATE services SET available = true WHERE id = ?';

    db.query(sql, [serviceId], err => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function markServiceAvailableByOwner(ownerPhone) {
  return new Promise((resolve, reject) => {
    const sql =
      'UPDATE services SET available = true WHERE owner_phone = ?';

    db.query(sql, [ownerPhone], err => {
      if (err) reject(err);
      else resolve();
    });
  });
}
