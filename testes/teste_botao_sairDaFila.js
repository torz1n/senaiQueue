import http from 'k6/http';
import { check, sleep } from 'k6';

// 404 do segundo DELETE é resposta esperada do seu servidor, não falha.
http.setResponseCallback(http.expectedStatuses(200, 201, 404));

export const options = {
  scenarios: {
    sair: {
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

  // 2) Espera todo mundo entrar, para os DELETE saírem quase juntos
  sleep(8);

  // 3) Sai da fila (o cookie do dispositivo é o mesmo da entrada)
  const saida = http.del(`${BASE_URL}/api/fila`, null, HEADERS);
  const ok = check(saida, { 'saiu (200)': (r) => r.status === 200 });

  if (!ok) {
    console.log(`${nome} falhou no DELETE: ${saida.status} ${saida.body}`);
  }

  // 4) Tenta sair de novo: já não está na fila, então o servidor deve dizer 404
  const segunda = http.del(`${BASE_URL}/api/fila`, null, HEADERS);
  check(segunda, {
    'segunda saída: 404 NAO_ESTA_NA_FILA': (r) => {
      try { return r.status === 404 && r.json().codigo === 'NAO_ESTA_NA_FILA'; } catch (e) { return false; }
    },
  });
}