import db from '../config/db.js';

export function createDispatch(crop, village, quantity, driverPhone) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO dispatches
      (crop, village, total_quantity, driver_phone, status)
      VALUES (?, ?, ?, ?, 'ASSIGNED')
    `;

    db.query(sql, [crop, village, quantity, driverPhone], (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}
