import http from 'k6/http';
import { check, sleep } from 'k6';

// 409 do "já sou o último" é resposta esperada do seu servidor, não falha.
// Sem isso o k6 contaria todo 4xx como erro em http_req_failed.
http.setResponseCallback(http.expectedStatuses(200, 201, 409));

export const options = {
  scenarios: {
    fluxo: {
      executor: 'per-vu-iterations',
      vus: 50,
      iterations: 1,
      maxDuration: '60s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = 'https://senai-queue.vercel.app';
const HEADERS = { headers: { 'Content-Type': 'application/json' } };

function sufixo(n) {
  const letras = 'abcdefghijklmnopqrstuvwxyz';
  return letras[Math.floor((n - 1) / 26)] + letras[(n - 1) % 26];
}

export default function () {
  const nome = `teste_${sufixo(__VU)}`;

  // 1) Entra na fila
  const entrada = http.post(`${BASE_URL}/api/fila`, JSON.stringify({ nome }), HEADERS);
  check(entrada, { 'entrou (201)': (r) => r.status === 201 });

  // 2) Espera todo mundo entrar, para os PATCH saírem quase juntos
  sleep(8);

  // 3) "Já joguei": o cookie do dispositivo é o mesmo da entrada
  const joguei = http.patch(`${BASE_URL}/api/fila`, null, HEADERS);

  const ok = check(joguei, {
    'já joguei: 200 ou 409 JA_E_O_ULTIMO': (r) => {
      if (r.status === 200) return true;
      try { return r.status === 409 && r.json().codigo === 'JA_E_O_ULTIMO'; } catch (e) { return false; }
    },
  });

  if (!ok) {
    console.log(`${nome} falhou no PATCH: ${joguei.status} ${joguei.body}`);
  }
}