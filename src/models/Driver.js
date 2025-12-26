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
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Car',
		required: true
	},
	carType: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'CarType'
	},
	maxPassengers: {
		type: Number,
		required: true,
		min: 1,
		max: 5,
		default: 4
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
		enum: ['active', 'inactive', 'blocked'],
		default: 'inactive'
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
	paidUntil: {
		type: Date
	},
	createdAt: {
		type: Date,
		default: Date.now
	}
})

module.exports = mongoose.model('Driver', driverSchema)
