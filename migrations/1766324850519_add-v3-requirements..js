/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  // 1. Menambahkan kolom coverUrl pada tabel albums (Kriteria 2)
  pgm.addColumn('albums', {
    coverUrl: {
      type: 'TEXT',
      default: null,
    },
  });

  // 2. Membuat tabel user_album_likes (Kriteria 3)
  pgm.createTable('user_album_likes', {
    id: {
      type: 'VARCHAR(50)',
      primaryKey: true,
    },
    user_id: {
      type: 'VARCHAR(50)',
      notNull: true,
      references: '"users"',
      onDelete: 'CASCADE',
    },
    album_id: {
      type: 'VARCHAR(50)',
      notNull: true,
      references: '"albums"',
      onDelete: 'CASCADE',
    },
  });

  // 3. Menambahkan constraint unik agar satu user hanya bisa like satu album satu kali (Kriteria 3)
  pgm.addConstraint('user_album_likes', 'unique_user_id_and_album_id', 'UNIQUE(user_id, album_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  // Menghapus tabel user_album_likes
  pgm.dropTable('user_album_likes');

  // Menghapus kolom coverUrl dari tabel albums
  pgm.dropColumn('albums', 'coverUrl');
};