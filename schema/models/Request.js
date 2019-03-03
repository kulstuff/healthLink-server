const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const requestSchema = new Schema({
    sender: {
        type: String,
        required: true
    },
    receiver: {
        type: String,
        required: true
    },
    kind: {
        type: String,
        required: true
    },
    status: {
        type: Number,
        required: true
    }
});

module.exports = mongoose.model('Request', requestSchema);