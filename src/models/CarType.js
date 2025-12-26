const mongoose = require('mongoose')

const carTypeSchema = new mongoose.Schema(
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
carTypeSchema.index({ name: 1, nameRu: 1 }, { unique: true })

module.exports = mongoose.model('CarType', carTypeSchema)
