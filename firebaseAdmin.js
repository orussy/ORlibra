const admin = require('firebase-admin');
const serviceAccount = require('./corpro-4ef2e-firebase-adminsdk-ahpv2-dac99b84f4.json'); // Replace with your actual path

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'corpro-4ef2e.appspot.com' // Replace with your bucket URL
});

const bucket = admin.storage().bucket();
module.exports = bucket;



