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
	carNumber: {
		type: String,
		required: false,
		trim: true,
		uppercase: true
	},
	carType: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'CarType'
	},
	maxPassengers: {
		type: Number,
		required: true
	},
	serviceType: {
		type: [String],
		default: []
	},
	departureTime: {
		type: String,
		required: true
	},
	status: {
		type: String,
		enum: ['active', 'inactive'],
		default: 'active'
	},
	balance: {
		type: Number,
		default: 100000
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
	},
	onTrip: {
		type: Boolean,
		default: false
	},
	currentTripId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Trip'
	},
	totalTrips: {
		type: Number,
		default: 0
	},
	totalTripHours: {
		type: Number,
		default: 0
	}
})

module.exports = mongoose.model('Driver', driverSchema)
