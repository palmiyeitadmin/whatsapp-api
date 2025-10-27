import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const messageSendRate = new Rate('message_send_rate');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up to 10 users
    { duration: '5m', target: 10 }, // Stay at 10 users
    { duration: '2m', target: 50 }, // Ramp up to 50 users
    { duration: '5m', target: 50 }, // Stay at 50 users
    { duration: '2m', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'],    // Less than 10% failed requests
    message_send_rate: ['rate>10'],     // At least 10 messages per second
  },
};

const BASE_URL = 'http://localhost:8788';

export function setup() {
  console.log('Load test starting...');
}

export default function () {
  // Test authentication endpoint
  const authResponse = http.get(`${BASE_URL}/api/auth/status`);
  check(authResponse, {
    'auth status is 200': (r) => r.status === 200,
    'auth response time < 200ms': (r) => r.timings.duration < 200,
  });

  // Test contacts list endpoint
  const contactsResponse = http.get(`${BASE_URL}/api/contacts/list?limit=20`, {
    headers: {
      'Cookie': 'session=test-session-token'
    }
  });
  check(contactsResponse, {
    'contacts status is 200': (r) => r.status === 200 || r.status === 401, // 401 is acceptable for unauthenticated
    'contacts response time < 300ms': (r) => r.timings.duration < 300,
  });

  // Test message sending (only for authenticated users)
  if (Math.random() < 0.3) { // 30% of users try to send messages
    const messagePayload = JSON.stringify({
      message: `Test message ${Date.now()}`,
      recipients: [{ id: 1 }]
    });

    const sendResponse = http.post(`${BASE_URL}/api/message/send`, messagePayload, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=test-session-token'
      }
    });

    const success = check(sendResponse, {
      'send status is 200 or 401': (r) => r.status === 200 || r.status === 401,
      'send response time < 2000ms': (r) => r.timings.duration < 2000,
    });

    if (sendResponse.status === 200) {
      messageSendRate.add(1);
    }
  }

  // Test campaigns endpoint
  const campaignsResponse = http.get(`${BASE_URL}/api/campaigns/list?limit=10`, {
    headers: {
      'Cookie': 'session=test-session-token'
    }
  });
  check(campaignsResponse, {
    'campaigns status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'campaigns response time < 300ms': (r) => r.timings.duration < 300,
  });

  // Test message logs endpoint
  const logsResponse = http.get(`${BASE_URL}/api/messages/logs?limit=20`, {
    headers: {
      'Cookie': 'session=test-session-token'
    }
  });
  check(logsResponse, {
    'logs status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'logs response time < 400ms': (r) => r.timings.duration < 400,
  });

  sleep(1); // Wait 1 second between iterations
}

export function teardown() {
  console.log('Load test completed');
}