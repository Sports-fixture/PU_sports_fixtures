const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://localhost:27017/tournament_db')
  .then(async () => {
    const res = await User.updateMany({}, { role: 'admin' });
    console.log(`Successfully updated ${res.modifiedCount} users to admin role.`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
