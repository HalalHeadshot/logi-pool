import db from '../config/db.js';

export function createBooking(serviceId, farmerPhone, village) {
  return new Promise((resolve, reject) => {
    const sql =
      'INSERT INTO service_bookings (service_id, farmer_phone, village, status) VALUES (?, ?, ?, "ACTIVE")';

    db.query(sql, [serviceId, farmerPhone, village], err => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function completeBooking(serviceId) {
  return new Promise((resolve, reject) => {
    const sql =
      'UPDATE service_bookings SET status = "DONE" WHERE service_id = ? AND status = "ACTIVE"';

    db.query(sql, [serviceId], err => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function completeBookingByOwner(ownerPhone) {
  return new Promise((resolve, reject) => {
    const sql = `
      UPDATE service_bookings sb
      JOIN services s ON sb.service_id = s.id
      SET sb.status = 'DONE'
      WHERE s.owner_phone = ? AND sb.status = 'ACTIVE'
    `;

    db.query(sql, [ownerPhone], err => {
      if (err) reject(err);
      else resolve();
    });
  });
}

