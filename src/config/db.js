import mysql from 'mysql2';

const db = mysql.createConnection({
  host: '127.0.0.1',   // IMPORTANT on Mac
  user: 'root',
  password: '',        // Homebrew MySQL has no password
  database: 'logipool'
});

db.connect((err) => {
  if (err) {
    console.error('❌ DB connection failed:', err.message);
    return;
  }
  console.log('✅ Database connected');
});

export default db;
