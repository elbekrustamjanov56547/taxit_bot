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
		required: true
	},
	lastName: {
		type: String,
		default: ''
	},
	language: {
		type: String,
		enum: ['uz', 'ru', ''],
		default: 'uz'
	},
	role: {
		type: String,
		enum: ['user', 'driver', 'none'],
		default: 'none'
	},
	phone: {
		type: String,
		default: ''
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
