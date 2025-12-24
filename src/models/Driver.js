const mongoose = require('mongoose')

const driverSchema = new mongoose.Schema({
	telegramId: {
		type: Number,
		required: true,
		unique: true
	},
	fullName: {
		type: String,
		required: true
	},
	phone: {
		type: String,
		required: true
	},
	fromRegion: {
		type: String,
		required: true
	},
	toRegion: {
		type: String,
		required: true
	},
	carModel: {
		type: String,
		required: true
	},
	serviceType: {
		type: [String],
		enum: ['road', 'route', 'parcel'],
		default: []
	},
	departureTime: {
		type: String,
		default: ''
	},
	status: {
		type: String,
		enum: ['active', 'inactive'],
		default: 'inactive'
	},
	paidUntil: {
		type: Date,
		default: null
	},
	balance: {
		type: Number,
		default: 0
	},
	rating: {
		type: Number,
		default: 5.0,
		min: 0,
		max: 5
	},
	totalOrders: {
		type: Number,
		default: 0
	},
	createdAt: {
		type: Date,
		default: Date.now
	}
})

module.exports = mongoose.model('Driver', driverSchema)
