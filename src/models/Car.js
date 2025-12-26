const mongoose = require('mongoose')

const carSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true
		},
		nameRu: {
			type: String,
			required: true
		},
		isActive: {
			type: Boolean,
			default: true
		},
		createdAt: {
			type: Date,
			default: Date.now
		}
	},
	{ timestamps: true }
)

// Kompound index
carSchema.index({ name: 1, nameRu: 1 }, { unique: true })

module.exports = mongoose.model('Car', carSchema)
