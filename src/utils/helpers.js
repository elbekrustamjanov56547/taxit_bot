const getTimeAgo = (date, language = 'uz') => {
	const now = new Date()
	const diffInSeconds = Math.floor((now - date) / 1000)

	if (diffInSeconds < 60) {
		return language === 'uz' ? 'hozir' : 'только что'
	} else if (diffInSeconds < 3600) {
		const minutes = Math.floor(diffInSeconds / 60)
		return language === 'uz' ? `${minutes} daqiqa oldin` : `${minutes} минут назад`
	} else if (diffInSeconds < 86400) {
		const hours = Math.floor(diffInSeconds / 3600)
		return language === 'uz' ? `${hours} soat oldin` : `${hours} часов назад`
	} else if (diffInSeconds < 604800) {
		const days = Math.floor(diffInSeconds / 86400)
		return language === 'uz' ? `${days} kun oldin` : `${days} дней назад`
	} else {
		return date.toLocaleDateString(language === 'uz' ? 'uz-UZ' : 'ru-RU')
	}
}
const formatPhoneNumber = (phone) => {
    if (!phone) return 'Ko\'rsatilmagan';
    
    // Telefon raqamini chiroyli formatda ko'rsatish
    let cleanNumber = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
    
    if (cleanNumber.startsWith('+998')) {
        // +998 90 123 45 67 formatida
        const countryCode = cleanNumber.substring(0, 4);
        const operator = cleanNumber.substring(4, 6);
        const part1 = cleanNumber.substring(6, 9);
        const part2 = cleanNumber.substring(9, 11);
        const part3 = cleanNumber.substring(11, 13);
        
        return `${countryCode} ${operator} ${part1} ${part2} ${part3}`.trim();
    } else if (cleanNumber.startsWith('998')) {
        // 998 90 123 45 67 formatida
        const countryCode = cleanNumber.substring(0, 3);
        const operator = cleanNumber.substring(3, 5);
        const part1 = cleanNumber.substring(5, 8);
        const part2 = cleanNumber.substring(8, 10);
        const part3 = cleanNumber.substring(10, 12);
        
        return `${countryCode} ${operator} ${part1} ${part2} ${part3}`.trim();
    }
    
    return phone; // Agar formatlash mumkin bo'lmasa, asl raqamni qaytar
};

module.exports = { getTimeAgo, formatPhoneNumber };

