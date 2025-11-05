const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

db.serialize(() => {
  db.run('DELETE FROM users', function(err) {
    if (err) {
      console.error('Ошибка при удалении данных:', err);
    } else {
      console.log(`✅ Все данные удалены. Количество удалённых строк: ${this.changes}`);
    }
    db.close();
  });
});
