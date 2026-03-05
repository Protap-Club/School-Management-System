import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import path from 'path';

const api = axios.create({
    baseURL: 'http://localhost:5000/api/v1',
    withCredentials: true,
});

async function run() {
    try {
        console.log("Logging in...");
        const res = await api.post('/auth/login', {
            email: 'viraj@nv.com',
            password: 'Demo@123'
        });
        const cookie = res.headers['set-cookie'][0];
        const token = res.data.token;
        console.log("Logged in role:", res.data.user.role);
        
        console.log("Creating valid 1x1 png image...");
        const imgPath = path.join(process.cwd(), 'test.png');
        const validPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
        fs.writeFileSync(imgPath, Buffer.from(validPngBase64, 'base64'));

        const formData = new FormData();
        formData.append('logo', fs.createReadStream(imgPath), { filename: 'test.png', contentType: 'image/png' });

        console.log("Uploading...");
        const uploadRes = await api.put('/school/logo', formData, {
            headers: { 
                Cookie: cookie,
                Authorization: `Bearer ${res.data.token}`,
                ...formData.getHeaders()
            }
        });
        console.log("Upload Success:", uploadRes.data);
    } catch(err) {
        if (err.response) {
            console.error("Upload Error Response Data:", JSON.stringify(err.response.data, null, 2));
            console.error("Status:", err.response.status);
        } else {
            console.error("Upload Error:", err);
        }
    }
}

run();
