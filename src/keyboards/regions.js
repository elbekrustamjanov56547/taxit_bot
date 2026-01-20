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
const regionsUZ = {
	Toshkent: 'Toshkent',
	Namangan: 'Namangan',
	Andijon: 'Andijon',
	Fargona: 'Fargʻona',
	Samarqand: 'Samarqand',
	Buxoro: 'Buxoro',
	Navoiy: 'Navoiy',
	Qashqadaryo: 'Qashqadaryo',
	Surxondaryo: 'Surxondaryo',
	Jizzax: 'Jizzax',
	Sirdaryo: 'Sirdaryo',
	Xorazm: 'Xorazm',
	Qoraqalpoq: 'Qoraqalpogʻiston'  
}

const regionsRU = {
	Toshkent: 'Ташкент',
	Namangan: 'Наманган',
	Andijon: 'Андижан',
	Fargona: 'Фергана', 
	Samarqand: 'Самарканд',
	Buxoro: 'Бухара',
	Navoiy: 'Навои',
	Qashqadaryo: 'Кашкадарья',
	Surxondaryo: 'Сурхандарья',
	Jizzax: 'Джизак',
	Sirdaryo: 'Сырдарья',
	Xorazm: 'Хорезм',
	Qoraqalpoq: 'Каракалпакстан' 
}

module.exports = {
	fromRegionsKeyboard: language => {
		const regions = language === 'uz' ? regionsUZ : regionsRU

		let buttons = []
		let row = []

		for (const region in regions) {
			row.push({
				text: regions[region],
				callback_data: `from_${region}`
			})

			if (row.length === 2) {
				buttons.push(row)
				row = []
			}
		}

		if (row.length > 0) {
			buttons.push(row)
		}

		return {
			inline_keyboard: buttons
		}
	},
	getRegionName: (regionKey, language) => {
		console.log('🌍 getRegionName called with:', { regionKey, language })

		if (language === 'uz') {
			const name = regionsUZ[regionKey]
			console.log('📍 uz name found:', name)
			return name || regionKey
		} else {
			const name = regionsRU[regionKey]
			console.log('📍 ru name found:', name)
			return name || regionKey
		}
	},
	allRegionsKeyboard: (language, excludeRegion = null) => {
		const regions = language === 'uz' ? uz : ru

		let buttons = []
		let row = []

		// Barcha viloyatlarni aylanish
		for (const region in regions) {
			// Agar excludeRegion bo'lsa, uni olib tashlash
			if (excludeRegion && region === excludeRegion) {
				continue
			}

			row.push({
				text: regions[region],
				callback_data: `to_${region}`
			})

			// Har 2 ta tugmadan keyin yangi qator
			if (row.length === 2) {
				buttons.push(row)
				row = []
			}
		}

		// Qolgan tugmalar
		if (row.length > 0) {
			buttons.push(row)
		}

		return {
			inline_keyboard: buttons
		}
	},
	//  toRegionsKeyboard: (language) => {
	//     const regions = language === 'uz' ? regionsUZ : regionsRU;

	//     let buttons = [];
	//     let row = [];

	//     for (const region in regions) {
	//         row.push({
	//             text: regions[region],
	//             callback_data: `to_${region}`
	//         });

	//         if (row.length === 2) {
	//             buttons.push(row);
	//             row = [];
	//         }
	//     }

	//     if (row.length > 0) {
	//         buttons.push(row);
	//     }

	//     return {
	//         inline_keyboard: buttons
	//     };
	// }

	toRegionsKeyboard: language => {
		const regions = language === 'uz' ? regionsUZ : regionsRU

		let buttons = []
		let row = []

		for (const region in regions) {
			row.push({
				text: regions[region],
				callback_data: `to_${region}`
			})

			if (row.length === 2) {
				buttons.push(row)
				row = []
			}
		}

		if (row.length > 0) {
			buttons.push(row)
		}

		return {
			inline_keyboard: buttons
		}
	},
	allRegionsKeyboard: (language, excludeRegion = null) => {
		const regions = language === 'uz' ? regionsUZ : regionsRU

		let buttons = []
		let row = []

		// Barcha viloyatlarni aylanish
		for (const region in regions) {
			// Agar excludeRegion bo'lsa, uni olib tashlash
			if (excludeRegion && region === excludeRegion) {
				continue
			}

			row.push({
				text: regions[region],
				callback_data: `to_${region}`
			})

			// Har 2 ta tugmadan keyin yangi qator
			if (row.length === 2) {
				buttons.push(row)
				row = []
			}
		}

		// Qolgan tugmalar
		if (row.length > 0) {
			buttons.push(row)
		}

		return {
			inline_keyboard: buttons
		}
	},
	getRegionName: (regionKey, language) => {
		if (language === 'uz') {
			return regionsUZ[regionKey] || regionKey
		} else {
			return regionsRU[regionKey] || regionKey
		}
	},
	getAllRegions: language => {
		return language === 'uz' ? regionsUZ : regionsRU
	}
}
