import axios from "axios";

export const httpClient = axios.create({
  baseURL: process.env.INFOBIP_BASE_URL,
  headers: {
    Authorization: `App ${process.env.INFOBIP_API_KEY}`,
    "Content-Type": "application/json"
  }
});