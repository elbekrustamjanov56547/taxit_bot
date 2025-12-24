const { Markup } = require('telegraf')

const regions = {
	uz: [
		['Toshkent', 'Toshkent'],
		['Andijon', 'Andijon'],
		['Fargʻona', 'Fargona'],
		['Namangan', 'Namangan'],
		['Samarqand', 'Samarqand'],
		['Buxoro', 'Buxoro'],
		['Xorazm', 'Xorazm'],
		['Navoiy', 'Navoiy'],
		['Qashqadaryo', 'Qashqadaryo'],
		['Surxondaryo', 'Surxondaryo'],
		['Jizzax', 'Jizzax'],
		['Sirdaryo', 'Sirdaryo'],
		['Qoraqalpogʻiston', 'Qoraqalpoq']
	],
	ru: [
		['Ташкент', 'Toshkent'],
		['Андижан', 'Andijon'],
		['Фергана', 'Fargona'],
		['Наманган', 'Namangan'],
		['Самарканд', 'Samarqand'],
		['Бухара', 'Buxoro'],
		['Хорезм', 'Xorazm'],
		['Навои', 'Navoiy'],
		['Кашкадарья', 'Qashqadaryo'],
		['Сурхандарья', 'Surxondaryo'],
		['Джизак', 'Jizzax'],
		['Сырдарья', 'Sirdaryo'],
		['Каракалпакстан', 'Qoraqalpoq']
	]
}

module.exports = {
	fromRegionsKeyboard: (lang = 'uz', prefix = '') => {
		const regionList = regions[lang]
		const buttons = regionList.map(region => [
			Markup.button.callback(region[0], `${prefix}from_${region[1]}`)
		])

		return Markup.inlineKeyboard(buttons)
	},

	toRegionsKeyboard: (lang = 'uz', prefix = '') => {
		const regionList = regions[lang]
		const buttons = regionList.map(region => [
			Markup.button.callback(region[0], `${prefix}to_${region[1]}`)
		])

		return Markup.inlineKeyboard(buttons)
	},

	getRegionName: (regionCode, lang = 'uz') => {
		const regionList = regions[lang]
		const region = regionList.find(r => r[1] === regionCode)
		return region ? region[0] : regionCode
	}
}
