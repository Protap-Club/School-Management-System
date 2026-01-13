
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const login = async () => {
  try {
    const email = process.env.SUPER_ADMIN_EMAIL || "npandyavrajesh31@gmail.com";
    const password = process.env.SUPER_ADMIN_PASSWORD;

    console.log(`Attempting login with: ${email} / ${password}`);

    const response = await axios.post(`http://localhost:${process.env.PORT || 5000}/api/v1/auth/login`, {
      email,
      password
    });

    console.log("✅ Login Successful!");
    console.log("Token:", response.data.token ? "Received" : "Missing");
  } catch (error) {
    console.error("❌ Login Failed:");
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Message: ${JSON.stringify(error.response.data)}`);
    } else {
      console.error(error.message);
    }
  }
};

login();
