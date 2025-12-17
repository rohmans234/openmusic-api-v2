exports.up = (pgm) => {
  // 1. Users
  pgm.createTable('users', {
    id: { type: 'VARCHAR(50)', primaryKey: true },
    username: { type: 'VARCHAR(50)', notNull: true, unique: true },
    password: { type: 'TEXT', notNull: true },
    fullname: { type: 'TEXT', notNull: true },
  });

  // 2. Authentications
  pgm.createTable('authentications', { token: { type: 'TEXT', notNull: true } });

  // 3. Playlists
  pgm.createTable('playlists', {
    id: { type: 'VARCHAR(50)', primaryKey: true },
    name: { type: 'TEXT', notNull: true },
    owner: { type: 'VARCHAR(50)', references: '"users"', onDelete: 'cascade' },
  });

  // 4. Playlist Songs (Junction)
  pgm.createTable('playlist_songs', {
    id: { type: 'VARCHAR(50)', primaryKey: true },
    playlist_id: { type: 'VARCHAR(50)', references: '"playlists"', onDelete: 'cascade' },
    song_id: { type: 'VARCHAR(50)', references: '"songs"', onDelete: 'cascade' },
  });

  // 5. Collaborations (Kriteria Opsional 1)
  pgm.createTable('collaborations', {
    id: { type: 'VARCHAR(50)', primaryKey: true },
    playlist_id: { type: 'VARCHAR(50)', references: '"playlists"', onDelete: 'cascade' },
    user_id: { type: 'VARCHAR(50)', references: '"users"', onDelete: 'cascade' },
  });

  // 6. Playlist Song Activities (Kriteria Opsional 2)
  pgm.createTable('playlist_song_activities', {
    id: { type: 'VARCHAR(50)', primaryKey: true },
    playlist_id: { type: 'VARCHAR(50)', references: '"playlists"', onDelete: 'cascade' },
    song_id: { type: 'VARCHAR(50)', notNull: true },
    user_id: { type: 'VARCHAR(50)', notNull: true },
    action: { type: 'TEXT', notNull: true },
    time: { type: 'TEXT', notNull: true },
  });
};
pgm.createTable('playlist_song_activities', {
  id: { type: 'VARCHAR(50)', primaryKey: true },
  playlist_id: { type: 'VARCHAR(50)', notNull: true, references: '"playlists"', onDelete: 'cascade' },
  song_id: { type: 'VARCHAR(50)', notNull: true },
  user_id: { type: 'VARCHAR(50)', notNull: true },
  action: { type: 'TEXT', notNull: true }, // 'add' atau 'delete'
  time: { type: 'TEXT', notNull: true },
});