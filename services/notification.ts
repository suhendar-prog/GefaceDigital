
export const formatMessage = (template: string, data: { student_name: string, school_name: string, date: string, time: string }) => {
  return template
    .replace('{student_name}', data.student_name)
    .replace('{school_name}', data.school_name)
    .replace('{date}', data.date)
    .replace('{time}', data.time);
};

export const sendTelegramMessage = async (botToken: string, chatId: string, text: string) => {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
      }),
    });
    const data = await response.json();
    if (!data.ok) {
        console.error('Telegram API Error:', data);
    }
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
  }
};

export const sendWhatsAppMessage = (phone: string, text: string) => {
  const encodedText = encodeURIComponent(text);
  const url = `https://wa.me/${phone}?text=${encodedText}`;
  window.open(url, '_blank');
};
