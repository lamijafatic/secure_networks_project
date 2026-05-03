import dotenv from "dotenv";
import { sendSms } from "../src/services/sms.service";

dotenv.config();

const runDemo = async () => {
  try {
    const phone = "+49123456789"; // svoj broj
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const result = await sendSms(phone, code);

    console.log("SMS sent successfully:");
    console.log(result);
  } catch (error) {
    console.error("SMS failed:");
    console.error(error);
  }
};

runDemo();