const amqp = require('amqplib');

class ProducerService {
  async sendPlaylistExportMessage(message) {
    const connection = await amqp.connect(process.env.RABBITMQ_SERVER);
    const channel = await connection.createChannel();

    const queueName = 'export:playlist';

    // Pastikan queue ada
    await channel.assertQueue(queueName, {
      durable: true,
    });

    // Kirim pesan ke queue
    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), {
      persistent: true,
    });

    // Close connection
    await channel.close();
    await connection.close();
  }
}

module.exports = ProducerService;
