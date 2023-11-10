const fs = require('fs');
const crypto = require('crypto');
const io = require('socket.io-client');

const socket = io('http://localhost:3000'); // Replace with your listener service URL

// Generate a random pass key
const generateRandomPassKey = () => {
  return crypto.randomBytes(32); // 32 bytes for aes-256-ctr
};

const passKey = generateRandomPassKey();
console.log('Emitter Pass Key:', passKey);

// Example function to encrypt a message
const encryptMessage = (message) => {
  const iv = crypto.randomBytes(16); // 16 bytes for AES
  const cipher = crypto.createCipheriv('aes-256-ctr', passKey, iv);

  const encryptedMessage = Buffer.concat([
    cipher.update(JSON.stringify(message), 'utf8'),
    cipher.final(),
  ]);

  return { iv: iv.toString('hex'), encryptedMessage: encryptedMessage.toString('hex') };
};

function generateRandomMessage() {
  const data = JSON.parse(fs.readFileSync('data.json'));
  const randomIndex = Math.floor(Math.random() * data.length);
  const { name, origin, destination } = data[randomIndex];

  const originalMessage = {
    name,
    origin,
    destination,
  };

  const encryptedMessage = encryptMessage(originalMessage);

  return encryptedMessage;
}

function sendMessages() {
  const numberOfMessages = Math.floor(Math.random() * (499 - 49 + 1) + 49);
  const messages = [];

  for (let i = 0; i < numberOfMessages; i++) {
    messages.push(generateRandomMessage());
  }

  const messageStream = messages.map((msg) => `${msg.iv}|${msg.encryptedMessage}`).join('|');
  socket.emit('messageStream', messageStream);

  setTimeout(sendMessages, 10000); // Send messages every 10 seconds
}

// Connect to the listener service
socket.on('connect', () => {
  console.log('Emitter connected to listener service');
  sendMessages(); // Start sending messages
});

// Handle errors
socket.on('error', (error) => {
  console.error('Emitter encountered an error:', error);
});

// Handle disconnection
socket.on('disconnect', () => {
  console.log('Emitter disconnected from listener service');
});


