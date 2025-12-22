exports.up = (pgm) => {
  pgm.addColumn('albums', {
    updated_at: { type: 'TIMESTAMP' },
  });

  pgm.addColumn('songs', {
    created_at: { type: 'TEXT' },
    updated_at: { type: 'TIMESTAMP' },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('songs', 'updated_at');
  pgm.dropColumn('songs', 'created_at');
  pgm.dropColumn('albums', 'updated_at');
};
