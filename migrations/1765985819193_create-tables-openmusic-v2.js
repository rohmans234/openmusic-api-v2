exports.up = (pgm) => {
  // 1. Tabel Albums (Wajib ada dari V1)
  pgm.createTable('albums', {
    id: { type: 'VARCHAR(50)', primaryKey: true },
    name: { type: 'TEXT', notNull: true },
    year: { type: 'INT', notNull: true },
  });

  // 2. Tabel Songs (Wajib ada dari V1)
  pgm.createTable('songs', {
    id: { type: 'VARCHAR(50)', primaryKey: true },
    title: { type: 'TEXT', notNull: true },
    year: { type: 'INT', notNull: true },
    performer: { type: 'TEXT', notNull: true },
    genre: { type: 'TEXT', notNull: true },
    duration: { type: 'INT' },
    album_id: { type: 'VARCHAR(50)', references: '"albums"', onDelete: 'CASCADE' },
  });

  // 3. Tabel Users
  pgm.createTable('users', {
    id: { type: 'VARCHAR(50)', primaryKey: true },
    username: { type: 'VARCHAR(50)', notNull: true, unique: true },
    password: { type: 'TEXT', notNull: true },
    fullname: { type: 'TEXT', notNull: true },
  });

  // 4. Tabel Authentications
  pgm.createTable('authentications', {
    token: { type: 'TEXT', notNull: true },
  });

  // 5. Tabel Playlists
  pgm.createTable('playlists', {
    id: { type: 'VARCHAR(50)', primaryKey: true },
    name: { type: 'TEXT', notNull: true },
    owner: { type: 'VARCHAR(50)', references: '"users"', onDelete: 'CASCADE' },
  });

  // 6. Tabel Playlist Songs (Junction)
  pgm.createTable('playlist_songs', {
    id: { type: 'VARCHAR(50)', primaryKey: true },
    playlist_id: { type: 'VARCHAR(50)', references: '"playlists"', onDelete: 'CASCADE' },
    song_id: { type: 'VARCHAR(50)', references: '"songs"', onDelete: 'CASCADE' },
  });

  // 7. Tabel Collaborations
  pgm.createTable('collaborations', {
    id: { type: 'VARCHAR(50)', primaryKey: true },
    playlist_id: { type: 'VARCHAR(50)', references: '"playlists"', onDelete: 'CASCADE' },
    user_id: { type: 'VARCHAR(50)', references: '"users"', onDelete: 'CASCADE' },
  });

  // 8. Tabel Playlist Song Activities
  pgm.createTable('playlist_song_activities', {
    id: { type: 'VARCHAR(50)', primaryKey: true },
    playlist_id: { type: 'VARCHAR(50)', references: '"playlists"', onDelete: 'CASCADE' },
    song_id: { type: 'VARCHAR(50)', notNull: true },
    user_id: { type: 'VARCHAR(50)', notNull: true },
    action: { type: 'TEXT', notNull: true },
    time: { type: 'TEXT', notNull: true },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('playlist_song_activities');
  pgm.dropTable('collaborations');
  pgm.dropTable('playlist_songs');
  pgm.dropTable('playlists');
  pgm.dropTable('authentications');
  pgm.dropTable('users');
  pgm.dropTable('songs');
  pgm.dropTable('albums');
};