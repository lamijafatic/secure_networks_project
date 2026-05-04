import { httpClient } from '../utils/httpClient';

export const sendSms = async (phone: string, code: string): Promise<any> => {
  const message = `Your verification code is: ${code}`;

  const response = await httpClient.post('/sms/2/text/advanced', {
    messages: [
      {
        destinations: [{ to: phone }],
        from: process.env.INFOBIP_SENDER || 'ServiceSMS',
        text: message
      }
    ]
  });

  return response.data;
};
