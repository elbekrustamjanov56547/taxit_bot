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
		type: mongoose.Schema.Types.ObjectId, // Agar bu ObjectId bo'lsa
		ref: 'Car',
		required: true
	},
	// YOKI carModel string bo'lishi kerak:
	// carModel: {
	//   type: String,
	//   required: true
	// },
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
		default: 'inactive'
	},
	balance: {
		type: Number,
		default: 0
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
