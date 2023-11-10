const crypto = require('crypto');
const io = require('socket.io')(3000); // Replace with your desired port
const MongoClient = require('mongodb').MongoClient;

// Replace the following with your MongoDB Atlas connection URL and database name
const mongoDBAtlasURL = 'mongodb+srv://kuldeep123:Kuldeep9929@cluster0.vseqvfn.mongodb.net/';

let db;

MongoClient.connect(mongoDBAtlasURL, { useNewUrlParser: true, useUnifiedTopology: true }, (err, client) => {
  if (err) {
    console.error('Error connecting to MongoDB:', err);
    return;
  }
  console.log('Connected to MongoDB Atlas');
  db = client.db();
});

io.on('connection', (socket) => {
  console.log('Listener service connected to emitter');

  socket.on('messageStream', (messageStream) => {
    const messages = messageStream.split('|');

    messages.forEach((combinedMessage) => {
      const [iv, encryptedMessage] = combinedMessage.split('|');

      const decryptedMessage = decryptMessage(encryptedMessage, iv);

      // Validate data integrity using secret_key
      const calculatedKey = crypto.createHash('sha256').update(JSON.stringify(decryptedMessage)).digest('hex');
      if (calculatedKey !== decryptedMessage.secret_key) {
        console.error('Data integrity compromised. Discarding operation.');
        return;
      }

      // Add timestamp to the decryptedMessage
      decryptedMessage.timestamp = new Date();

      // Save to MongoDB
      saveToMongo(decryptedMessage);
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Listener service disconnected from emitter');
  });
});

// Use the same pass key as the emitter
const passKey = Buffer.from('8e eb d7 3e 8e 46 a9 99 30 b7 27 2e f1 96 e1 22 b0 d2 da d7 85 c5 43 cc 3f 58 b1 f4 8f 6a 2e 7f', 'hex'); // Replace with your emitter pass key

console.log('Listener Pass Key:', passKey);

// Example function to decrypt a message
const decryptMessage = (encryptedMessage, iv) => {
  const decipher = crypto.createDecipheriv('aes-256-ctr', passKey, Buffer.from(iv, 'hex'));

  const decryptedMessage = Buffer.concat([
    decipher.update(Buffer.from(encryptedMessage, 'hex')),
    decipher.final(),
  ]);

  return JSON.parse(decryptedMessage.toString('utf8'));
};

function saveToMongo(data) {
  const minute = new Date().toISOString().substr(0, 16); // Round to the nearest minute
  const collection = db.collection(minute);

  collection.insertOne(data, (err) => {
    if (err) {
      console.error('Error saving to MongoDB:', err);
    } else {
      console.log('Data saved to MongoDB:', data);
    }
  });
}
