const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    name: String,
    sport: String
});

module.exports = mongoose.model('User', userSchema);