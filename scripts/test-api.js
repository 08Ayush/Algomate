// Test the fixed API by making a POST request to save curriculum
const fetch = require('node-fetch');

async function testAPI() {
  console.log('Testing the fixed NEP buckets API...');
  
  // Simulate the user token (base64 encoded user data)
  const userData = {
    id: '75244151-cd43-4b77-96ba-bb25f27ef90a',
    email: 'admin@admin.com',
    name: 'College Admin'
  };
  
  const authToken = Buffer.from(JSON.stringify(userData)).toString('base64');
  
  // Test data matching what was shown in the screenshot
  const testData = {
    buckets: [{
      bucket_name: 'Sem 1 major pool',
      is_common_slot: true,
      min_selection: 1,
      max_selection: 1,
      subjects: [
        {
          id: '5aacac9d-bf19-4930-9296-df2ec4f9c533',
          code: '9HINAET0101',
          name: 'Bhasha, Sanchar aur Kaushal (Hindi)'
        },
        {
          id: '7849b219-0202-4bfd-b602-e7ea2e35c23c',
          code: '9HISMJT0102',
          name: 'History of Ancient India (600BC-300AD)'
        },
        {
          id: '6a7373b8-be34-4a92-bdaf-e3a2988ba90c',
          code: '9POLMJT0101',
          name: 'Understanding Political Theory'
        }
      ]
    }],
    availableSubjects: [],
    course: 'B.Ed',
    semester: 1
  };
  
  try {
    const response = await fetch('http://localhost:3001/api/nep/buckets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.text();
    console.log('Status:', response.status);
    console.log('Response:', result);
    
    if (response.ok) {
      console.log('✅ API test successful!');
    } else {
      console.log('❌ API test failed');
    }
    
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testAPI();