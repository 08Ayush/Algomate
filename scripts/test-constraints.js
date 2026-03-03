require('dotenv/config');
const token = Buffer.from(JSON.stringify({
    id: '2d1a31bc-969f-4711-9e2f-65237ea3251d',
    role: 'college_admin',
    college_id: 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f'
})).toString('base64');

fetch('http://localhost:3000/api/admin/constraints', {
    headers: { Authorization: 'Bearer ' + token }
})
    .then(r => r.json())
    .then(d => {
        console.log('success:', d.success, '| count:', d.data?.length);
        if (d.data?.[0]) console.log('sample row:', JSON.stringify(d.data[0], null, 2));
        if (d.error) console.log('error:', d.error, d.details);
    })
    .catch(e => console.error(e));
