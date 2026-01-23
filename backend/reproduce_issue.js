const API_URL = 'http://localhost:5000/api/v1';

async function login(email, password) {
    const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!data.success) throw new Error(`Login failed: ${data.message}`);
    return data.token;
}

async function testBranding(token) {
    console.log('Testing /school/branding...');
    const response = await fetch(`${API_URL}/school/branding`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Branding Status:', response.status);
    const data = await response.json();
    console.log('Branding Data:', data.success ? 'Success' : data.message);
}

async function testFeatures(token) {
    console.log('Testing /school/features...');
    const response = await fetch(`${API_URL}/school/features`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Features Status:', response.status);
    const data = await response.json();
    console.log('Features Data:', JSON.stringify(data.data?.features || data));
}

async function main() {
    try {
        console.log('--- Logging in as Super Admin (vraj@dps.com) ---');
        const adminToken = await login('vraj@dps.com', 'Demo@123');
        await testBranding(adminToken);

        console.log('\n--- Logging in as Teacher (priya@dps.com) ---');
        const teacherToken = await login('priya@dps.com', 'Demo@123');
        await testFeatures(teacherToken);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();
