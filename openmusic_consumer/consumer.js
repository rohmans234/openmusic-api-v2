require('dotenv').config();

const amqp = require('amqplib');
const nodemailer = require('nodemailer');
const pool = require('./src/services/postgres/pool');

// Konfigurasi Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Function untuk mengambil data playlist dan songs
async function getPlaylistData(playlistId) {
  try {
    // Get playlist
    const playlistQuery = {
      text: 'SELECT id, name FROM playlists WHERE id = $1',
      values: [playlistId],
    };
    const playlistResult = await pool.query(playlistQuery);

    if (!playlistResult.rows.length) {
      throw new Error('Playlist tidak ditemukan');
    }

    const playlist = playlistResult.rows[0];

    // Get songs dalam playlist
    const songsQuery = {
      text: `SELECT s.id, s.title, s.performer 
              FROM songs s 
              INNER JOIN playlist_songs ps ON s.id = ps.song_id 
              WHERE ps.playlist_id = $1`,
      values: [playlistId],
    };
    const songsResult = await pool.query(songsQuery);

    playlist.songs = songsResult.rows;

    return playlist;
  } catch (error) {
    console.error('Error fetching playlist data:', error);
    throw error;
  }
}

// Function untuk mengirim email
async function sendPlaylistEmail(playlistData, targetEmail) {
  try {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: targetEmail,
      subject: `Playlist Export: ${playlistData.name}`,
      html: `
        <h1>Export Playlist</h1>
        <p>Berikut adalah data playlist yang Anda minta:</p>
        <pre>${JSON.stringify({ playlist: playlistData }, null, 2)}</pre>
      `,
      attachments: [
        {
          filename: `${playlistData.id}.json`,
          content: JSON.stringify({ playlist: playlistData }, null, 2),
        },
      ],
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.response);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

// Function consumer
async function consumePlaylistExportMessage() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_SERVER);
    const channel = await connection.createChannel();

    const queueName = 'export:playlist';

    // Pastikan queue ada
    await channel.assertQueue(queueName, {
      durable: true,
    });

    // Set prefetch count
    await channel.prefetch(1);

    console.log(`Waiting for messages in queue: ${queueName}`);

    // Consume messages
    channel.consume(queueName, async (msg) => {
      if (msg) {
        try {
          const message = JSON.parse(msg.content.toString());
          console.log('Received message:', message);

          const { playlistId, targetEmail } = message;

          // Dapatkan data playlist
          const playlistData = await getPlaylistData(playlistId);

          // Kirim email
          await sendPlaylistEmail(playlistData, targetEmail);

          // Acknowledge message
          channel.ack(msg);
          console.log('Message processed successfully');
        } catch (error) {
          console.error('Error processing message:', error);
          // Nack message dan requeue
          channel.nack(msg, false, true);
        }
      }
    });
  } catch (error) {
    console.error('Consumer error:', error);
    process.exit(1);
  }
}

// Start consumer
consumePlaylistExportMessage();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down consumer...');
  await pool.end();
  process.exit(0);
});
