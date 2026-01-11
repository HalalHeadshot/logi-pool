import db from '../config/db.js';

export function getOrCreatePool(crop, village, threshold) {
  return new Promise((resolve, reject) => {
    const selectSql =
      'SELECT * FROM pools WHERE crop = ? AND village = ? AND status = "OPEN"';

    db.query(selectSql, [crop, village], (err, rows) => {
      if (err) return reject(err);

      if (rows.length > 0) {
        resolve(rows[0]);
      } else {
        const insertSql =
          'INSERT INTO pools (crop, village, threshold) VALUES (?, ?, ?)';

        db.query(insertSql, [crop, village, threshold], (err, result) => {
          if (err) reject(err);
          else
            resolve({
              id: result.insertId,
              crop,
              village,
              total_quantity: 0,
              threshold,
              status: 'OPEN'
            });
        });
      }
    });
  });
}

export function updatePoolQuantity(poolId, quantity) {
  return new Promise((resolve, reject) => {
    const sql =
      'UPDATE pools SET total_quantity = total_quantity + ? WHERE id = ?';

    db.query(sql, [quantity, poolId], err => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function markPoolReady(poolId) {
  return new Promise((resolve, reject) => {
    const sql =
      'UPDATE pools SET status = "READY" WHERE id = ?';

    db.query(sql, [poolId], err => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function markPoolAssigned(crop, village) {
  return new Promise((resolve, reject) => {
    const sql =
      'UPDATE pools SET status = "ASSIGNED" WHERE crop = ? AND village = ? AND status = "READY"';

    db.query(sql, [crop, village], err => {
      if (err) reject(err);
      else resolve();
    });
  });
}
