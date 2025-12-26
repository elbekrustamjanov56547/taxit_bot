const CarType = require('../models/CarType')

const defaultCarTypes = [
	{
		name: 'Cobalt',
		nameRu: 'Кобальт',
		icon: '🚘',
		order: 1
	},
	{
		name: 'Nexia',
		nameRu: 'Нексия',
		icon: '🚙',
		order: 2
	},
	{
		name: 'Malibu',
		nameRu: 'Малибу',
		icon: '🚗',
		order: 3
	},
	{
		name: 'Tracker',
		nameRu: 'Трекер',
		icon: '🚙',
		order: 4
	},
	{
		name: 'Damas',
		nameRu: 'Дамас',
		icon: '🚐',
		order: 5
	},
	{
		name: 'Labo',
		nameRu: 'Лабо',
		icon: '🚐',
		order: 6
	},
	{
		name: 'Spark',
		nameRu: 'Спарк',
		icon: '🚗',
		order: 7
	},
	{
		name: 'Matiz',
		nameRu: 'Матиз',
		icon: '🚗',
		order: 8
	},
	{
		name: 'Gentra',
		nameRu: 'Гентра',
		icon: '🚘',
		order: 9
	},
	{
		name: 'Tico',
		nameRu: 'Тико',
		icon: '🚗',
		order: 10
	}
]

// Dastlabki ma'lumotlarni yuklash
const seedCarTypes = async () => {
	try {
		const count = await CarType.countDocuments()

		if (count === 0) {
			await CarType.insertMany(defaultCarTypes)
			console.log('✅ Default mashina turlari yuklandi')
		} else {
			console.log(`📊 Mashina turlari allaqachon mavjud: ${count} ta`)
		}
	} catch (error) {
		console.error('❌ Mashina turlarini yuklashda xatolik:', error)
	}
}

module.exports = { defaultCarTypes, seedCarTypes }
