const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema({
	userId: {
		type: Number,
		required: true
	},
	username: {
		type: String,
		default: ''
	},
	fromRegion: {
		type: String,
		required: true
	},
	toRegion: {
		type: String,
		required: true
	},
	hasParcel: {
		type: Boolean,
		default: false
	},
	parcelDescription: {
		type: String,
		default: ''
	},
	comment: {
		type: String,
		default: ''
	},
	status: {
		type: String,
		enum: ['pending', 'searching', 'found', 'cancelled'],
		default: 'pending'
	},
	createdAt: {
		type: Date,
		default: Date.now
	}
})

module.exports = mongoose.model('Order', orderSchema)
