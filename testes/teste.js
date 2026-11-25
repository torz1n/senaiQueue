import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    entrada: {
      executor: 'per-vu-iterations',
      vus: 50,
      iterations: 1,
      maxDuration: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
  },
};

const BASE_URL = 'https://senai-queue.vercel.app/';

// O servidor recusa dígitos no nome, então converto o número do VU em letras:
// VU 1 -> "aa", VU 2 -> "ab", ... VU 50 -> "bx"
function sufixo(n) {
  const letras = 'abcdefghijklmnopqrstuvwxyz';
  return letras[Math.floor((n - 1) / 26)] + letras[(n - 1) % 26];
}

export default function () {
  const nome = `teste_${sufixo(__VU)}`;

  const res = http.post(
    `${BASE_URL}/api/fila`,
    JSON.stringify({ nome }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  const ok = check(res, {
    'status é 201': (r) => r.status === 201,
    'devolveu a pessoa com id': (r) => {
      try { return r.json().pessoa.id !== undefined; } catch (e) { return false; }
    },
  });

  if (!ok) {
    console.log(`${nome} falhou: ${res.status} ${res.body}`);
  }
}