const mongoose = require('mongoose')

const tripSchema = new mongoose.Schema({
	driverId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Driver',
		required: true
	},
	driverName: {
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
	startTime: {
		type: Date,
		default: Date.now,
		required: true
	},
	endTime: {
		type: Date
	},
	duration: {
		type: Number,
		default: 0
	},
	status: {
		type: String,
		enum: ['active', 'completed', 'cancelled'],
		default: 'active'
	},
	availableSeats: {
		type: Number,
		default: 0
	},
	originalAvailableSeats: {
		type: Number,
		default: 0
	},
	passengersReceived: {
		type: Number,
		default: 0
	},
	parcelsReceived: {
		type: Number,
		default: 0
	},
	createdAt: {
		type: Date,
		default: Date.now
	}
})

module.exports = mongoose.model('Trip', tripSchema)