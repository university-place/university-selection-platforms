// app/simple-test/page.tsx
'use client';

import { useState } from 'react';

export default function SimpleTest() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAPI = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/students/applications/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          universityName: 'Bahir Dar University',
          studentId: '1'
        })
      });
      
      const text = await response.text();
      console.log('Raw response:', text);
      
      try {
        const json = JSON.parse(text);
        setResult({ success: true, data: json });
      } catch {
        setResult({ success: false, data: text });
      }
    } catch (error: any) {
      setResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Simple API Test</h1>
      <button 
        onClick={testAPI}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        {loading ? 'Testing...' : 'Test API'}
      </button>
      
      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}