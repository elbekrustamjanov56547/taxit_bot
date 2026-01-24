const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema({
	userId: {
		type: Number,
		required: true
	},
	username: {
		type: String
	},
	fullName: {
		type: String
	},
	autoExpireAt: Date,
	autoClosed: {
		type: Boolean,
		default: false
	},

	// ============ YANGI MAYDONLAR ============
	driverFound: {
		type: Boolean,
		default: false
	},
	driverSearched: {
		type: Boolean,
		default: false
	},
	searchCompletedAt: Date,
	// =========================================

	phone: {
		type: String
	},
	departureTime: {
		type: String
	},
	fromRegion: {
		type: String,
		required: true
	},
	toRegion: {
		type: String,
		required: true
	},
	passengerCount: {
		type: Number,
		required: true
	},
	hasParcel: {
		type: Boolean,
		default: false
	},
	parcelDescription: {
		type: String
	},
	comment: {
		type: String,
		default: ''
	},
	driverId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Driver'
	},
	driverFullName: {
		type: String
	},
	driverPhone: {
		type: String
	},
	carNumber: {
		type: String
	},
	status: {
		type: String,
		enum: [
			'pending',
			'searching',
			'selected',
			'confirmed',
			'accepted',
			'rejected',
			'cancelled',
			'completed',
			'expired',
			'contacted' // Yangi status
		],
		default: 'pending'
	},
	createdAt: {
		type: Date,
		default: Date.now
	},
	updatedAt: {
		type: Date,
		default: Date.now
	}
})

orderSchema.pre('save', function (next) {
	this.updatedAt = new Date()
	next()
})

module.exports = mongoose.model('Order', orderSchema)
