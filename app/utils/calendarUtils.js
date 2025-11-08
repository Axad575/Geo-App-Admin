export const generateCalendarLinks = (meeting) => {
    const title = encodeURIComponent(meeting.title || 'Meeting');
    const description = encodeURIComponent(meeting.description || meeting.notes || '');
    const location = encodeURIComponent(meeting.location || '');
    
    // Исправляем обработку даты
    let startDate;
    try {
        // Проверяем, является ли meeting.date валидной датой
        if (!meeting.date) {
            throw new Error('No date provided');
        }
        
        // Создаем дату с проверкой
        startDate = new Date(meeting.date);
        
        // Проверяем, является ли дата валидной
        if (isNaN(startDate.getTime())) {
            throw new Error('Invalid date');
        }
    } catch (error) {
        console.error('Invalid date in meeting:', meeting.date);
        // Используем текущую дату как fallback
        startDate = new Date();
    }
    
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 час по умолчанию
    
    const formatDate = (date) => {
        // Добавляем проверку валидности даты
        if (!date || isNaN(date.getTime())) {
            return new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        }
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    
    const startFormatted = formatDate(startDate);
    const endFormatted = formatDate(endDate);
    
    return {
        google: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startFormatted}/${endFormatted}&details=${description}&location=${location}`,
        
        outlook: `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${startFormatted}&enddt=${endFormatted}&body=${description}&location=${location}`,
        
        // Для Apple Calendar и других - генерируем ICS файл
        ics: generateICSFile(meeting, startDate, endDate)
    };
};

export const generateICSFile = (meeting, startDate, endDate) => {
    const formatICSDate = (date) => {
        // Добавляем проверку валидности даты
        if (!date || isNaN(date.getTime())) {
            return new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        }
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    
    // Проверяем валидность дат
    const validStartDate = startDate && !isNaN(startDate.getTime()) ? startDate : new Date();
    const validEndDate = endDate && !isNaN(endDate.getTime()) ? endDate : new Date(validStartDate.getTime() + 60 * 60 * 1000);
    
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//GeoNote//EN
BEGIN:VEVENT
UID:${meeting.id || 'meeting'}@geonote.app
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(validStartDate)}
DTEND:${formatICSDate(validEndDate)}
SUMMARY:${meeting.title || 'Meeting'}
DESCRIPTION:${meeting.description || meeting.notes || ''}
LOCATION:${meeting.location || ''}
END:VEVENT
END:VCALENDAR`;
    
    return `data:text/calendar;charset=utf8,${encodeURIComponent(icsContent)}`;
};

export const downloadICSFile = (meeting) => {
    try {
        let startDate;
        
        // Проверяем и создаем валидную дату
        if (!meeting.date) {
            startDate = new Date();
        } else {
            startDate = new Date(meeting.date);
            if (isNaN(startDate.getTime())) {
                startDate = new Date();
            }
        }
        
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
        
        const icsContent = generateICSFile(meeting, startDate, endDate);
        
        const link = document.createElement('a');
        link.href = icsContent;
        link.download = `${(meeting.title || 'meeting').replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('Error downloading ICS file:', error);
        alert('Ошибка при создании календарного файла');
    }
};