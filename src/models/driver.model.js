import db from '../config/db.js';

export function getAvailableDrivers(village) {
  return new Promise((resolve, reject) => {
    const sql =
      'SELECT * FROM drivers WHERE village = ? AND available = true';

    db.query(sql, [village], (err, result) => {
      if (err) {
        reject(err);
      }else {
        resolve(result);
      }
    });
  });
}

export function markDriverUnavailable(phone) {
  return new Promise((resolve, reject) => {
    const sql =
      'UPDATE drivers SET available = false WHERE phone = ?';

    db.query(sql, [phone], (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}
