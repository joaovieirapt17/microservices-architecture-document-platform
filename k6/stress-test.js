import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const errorRate = new Rate("errors");

// Teste de stress - aumenta até quebrar
export const options = {
  stages: [
    { duration: "2m", target: 2000 }, // Ramp-up para 2000 usuários
    { duration: "5m", target: 3000 }, // Mantém 3000 usuários
    { duration: "2m", target: 1000 }, // Aumenta para 1000
    { duration: "5m", target: 200 }, // Mantém 200
    { duration: "2m", target: 500 }, // Aumenta para 500
    { duration: "5m", target: 300 }, // Mantém 300
    { duration: "5m", target: 0 }, // Ramp-down
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"], // Aceita até 2s no p95 (mais permissivo)
    errors: ["rate<0.3"], // Aceita até 30% de erros no stress
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:8080";

export default function () {
  // Teste simples de health check sob stress
  const res = http.get(`${BASE_URL}/api/health`);

  check(res, {
    "status is 200": (r) => r.status === 200,
    "response time < 2000ms": (r) => r.timings.duration < 2000,
  }) || errorRate.add(1);

  sleep(0.5); // Menos sleep = mais pressão
}
