import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const errorRate = new Rate("errors");

// Teste de spike - picos repentinos de tráfego
export const options = {
  stages: [
    { duration: "10s", target: 10 }, // Baseline
    { duration: "1m", target: 10 }, // Mantém baseline
    { duration: "10s", target: 500 }, // Spike repentino!
    { duration: "3m", target: 500 }, // Mantém o spike
    { duration: "10s", target: 10 }, // Volta ao baseline
    { duration: "3m", target: 10 }, // Recuperação
    { duration: "10s", target: 0 }, // Ramp-down
  ],
  thresholds: {
    http_req_duration: ["p(95)<3000"], // Mais permissivo para spikes
    errors: ["rate<0.4"], // Aceita até 40% de erros durante spike
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:8080";

export default function () {
  const res = http.get(`${BASE_URL}/api/health`);

  check(res, {
    "status is 200": (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(0.3);
}
