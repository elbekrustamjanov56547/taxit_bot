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
		// 👤 YANGI: Yo'lovchining to'liq ismi
		type: String
	},
	autoExpireAt: Date,
	autoClosed: { type: Boolean, default: false },
	phone: {
		// 📞 YANGI: Yo'lovchining telefon raqami
		type: String
	},
	departureTime: {
		// ⏰ YANGI: Jo'nash vaqti
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
		// 👤 YANGI: Haydovchining to'liq ismi
		type: String
	},
	driverPhone: {
		// 📞 YANGI: Haydovchining telefon raqami
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
			'expired'
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
