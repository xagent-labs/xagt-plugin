// OKX API v5 client — read-only, handles auth + pagination
import crypto from 'crypto';
import axios from 'axios';

const BASE_URL = 'https://www.okx.com';

function sign(timestamp, method, path, body, secret) {
  const msg = timestamp + method.toUpperCase() + path + (body || '');
  return crypto.createHmac('sha256', secret).update(msg).digest('base64');
}

function headers(apiKey, secret, passphrase, path, method = 'GET', body = '') {
  const ts = new Date().toISOString();
  return {
    'OK-ACCESS-KEY': apiKey,
    'OK-ACCESS-SIGN': sign(ts, method, path, body, secret),
    'OK-ACCESS-TIMESTAMP': ts,
    'OK-ACCESS-PASSPHRASE': passphrase,
    'Content-Type': 'application/json',
  };
}

export class OKXClient {
  constructor({ apiKey, secretKey, passphrase, demo = false }) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.passphrase = passphrase;
    this.demo = demo;
  }

  async get(path, params = {}) {
    const query = new URLSearchParams(params).toString();
    const fullPath = query ? `${path}?${query}` : path;
    const h = headers(this.apiKey, this.secretKey, this.passphrase, fullPath);
    if (this.demo) h['x-simulated-trading'] = '1';

    const res = await axios.get(BASE_URL + fullPath, { headers: h });
    if (res.data.code !== '0') {
      throw new Error(`OKX API error ${res.data.code}: ${res.data.msg}`);
    }
    return res.data.data;
  }

  // Paginate through all results using before/after cursor
  async getAll(path, params = {}, limit = 100) {
    const results = [];
    let after = '';
    while (true) {
      const p = { ...params, limit, ...(after ? { after } : {}) };
      const data = await this.get(path, p);
      if (!data || data.length === 0) break;
      results.push(...data);
      if (data.length < limit) break;
      // OKX uses the last item's ordId/billId as cursor
      const last = data[data.length - 1];
      after = last.ordId || last.billId || last.id || '';
      if (!after) break;
    }
    return results;
  }
}
