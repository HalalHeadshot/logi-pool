import db from '../config/db.js';

export function saveProduce(phone, crop, quantity, village) {
  return new Promise((resolve, reject) => {
    const sql =
      'INSERT INTO produce (phone, crop, quantity, village) VALUES (?, ?, ?, ?)';

    db.query(sql, [phone, crop, quantity, village], (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

export function getTotalQuantity(crop, village) {
  return new Promise((resolve, reject) => {
    const sql =
      'SELECT SUM(quantity) AS total FROM produce WHERE crop = ? AND village = ?';

    db.query(sql, [crop, village], (err, result) => {
      if (err) reject(err);
      else resolve(result[0].total || 0);
    });
  });
}
