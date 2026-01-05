// utils/pagination.js
module.exports = {
	// Sahifalash uchun tugmalar
	getPaginationKeyboard: (
		currentPage,
		totalPages,
		orderId,
		userLanguage,
		action = 'driver_page'
	) => {
		const keyboard = []

		// Oldingi sahifa tugmasi
		if (currentPage > 1) {
			keyboard.push({
				text: userLanguage === 'uz' ? '⬅️ Oldingi' : '⬅️ Назад',
				callback_data: `${action}_${orderId}_${currentPage - 1}`
			})
		}

		// Sahifa raqami
		keyboard.push({
			text:
				userLanguage === 'uz'
					? `📄 ${currentPage}/${totalPages}`
					: `📄 ${currentPage}/${totalPages}`,
			callback_data: 'current_page'
		})

		// Keyingi sahifa tugmasi
		if (currentPage < totalPages) {
			keyboard.push({
				text: userLanguage === 'uz' ? 'Keyingi ➡️' : 'Далее ➡️',
				callback_data: `${action}_${orderId}_${currentPage + 1}`
			})
		}

		return keyboard
	},

	// Haydovchilarni sahifalash
	paginateDrivers: (drivers, page, perPage = 5) => {
		const total = drivers.length
		const totalPages = Math.ceil(total / perPage)
		const startIndex = (page - 1) * perPage
		const endIndex = Math.min(startIndex + perPage, total)

		const paginatedDrivers = drivers.slice(startIndex, endIndex)

		return {
			drivers: paginatedDrivers,
			currentPage: page,
			totalPages: totalPages,
			totalDrivers: total,
			startIndex: startIndex + 1,
			endIndex: endIndex,
			hasPreviousPage: page > 1,
			hasNextPage: page < totalPages
		}
	}
}
