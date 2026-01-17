const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
	telegramId: {
		type: Number,
		required: true,
		unique: true
	},
	username: {
		type: String,
		default: ''
	},
	firstName: {
		type: String,
		default: ''
	},
	lastName: {
		type: String,
		default: ''
	},
	fullName: {
		// 👤 YANGI: To'liq ismi
		type: String,
		default: ''
	},
	phone: {
		// 📞 YANGI: Telefon raqami
		type: String,
		default: ''
	},
	language: {
		type: String,
		default: 'uz'
	},
	role: {
		type: String,
		enum: ['user', 'driver', 'none'],
		default: 'none'
	},
	state: {
		type: String,
		default: 'START'
	},
	lastActivity: {
		type: Date,
		default: Date.now
	},
	createdAt: {
		type: Date,
		default: Date.now
	}
})

module.exports = mongoose.model('User', userSchema)
