const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema({
	userId: { type: Number, required: true },
	username: String,
	fromRegion: { type: String, required: true },
	toRegion: { type: String, required: true },
	passengerCount: { type: Number, required: true },
	hasParcel: { type: Boolean, default: false },
	parcelDescription: String,
	driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
	status: {
		type: String,
		enum: [
			'searching',
			'selected',
			'confirmed',
			'accepted',
			'rejected',
			'cancelled',
			'completed',
			'pending'
		],
		default: 'searching'
	},
	createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Order', orderSchema)
