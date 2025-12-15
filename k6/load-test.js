import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

// Métricas customizadas
const errorRate = new Rate("errors");

// Configuração do teste
export const options = {
  stages: [
    { duration: "2m", target: 50 }, // Ramp-up para 50 usuários em 2 min
    { duration: "5m", target: 50 }, // Mantém 50 usuários por 5 min
    { duration: "2m", target: 100 }, // Ramp-up para 100 usuários em 2 min
    { duration: "5m", target: 100 }, // Mantém 100 usuários por 5 min
    { duration: "2m", target: 0 }, // Ramp-down para 0 usuários
  ],
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<1000"], // 95% das requests < 500ms, 99% < 1s
    errors: ["rate<0.1"], // Taxa de erro < 10%
    http_req_failed: ["rate<0.1"], // Taxa de falha < 10%
  },
};

// URL base do API Gateway
const BASE_URL = __ENV.BASE_URL || "http://localhost:8080";

// Dados de teste
const testUser = {
  email: `test-${Date.now()}@example.com`,
  password: "Test123!@#",
  name: "Test User",
};

let authToken = "";

export function setup() {
  // Registrar usuário de teste
  const registerRes = http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify(testUser),
    {
      headers: { "Content-Type": "application/json" },
    }
  );

  console.log(`Setup - Register status: ${registerRes.status}`);

  // Fazer login e obter token
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: testUser.email,
      password: testUser.password,
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );

  if (loginRes.status === 200) {
    const body = JSON.parse(loginRes.body);
    authToken = body.token || body.accessToken;
    console.log(`Setup - Login successful, token obtained`);
  }

  return { token: authToken };
}

export default function (data) {
  const token = data.token;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // Teste 1: Health Check
  const healthRes = http.get(`${BASE_URL}/api/health`, { headers });
  check(healthRes, {
    "health check status 200": (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);

  // Teste 2: Listar organizações
  const orgsRes = http.get(`${BASE_URL}/api/organizations`, { headers });
  check(orgsRes, {
    "list organizations status 200": (r) => r.status === 200,
    "list organizations response time < 500ms": (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(1);

  // Teste 3: Criar organização
  const newOrg = {
    name: `Test Org ${Date.now()}`,
    description: "Test organization for load testing",
  };

  const createOrgRes = http.post(
    `${BASE_URL}/api/organizations`,
    JSON.stringify(newOrg),
    { headers }
  );
  const orgCreated = check(createOrgRes, {
    "create organization status 201": (r) =>
      r.status === 201 || r.status === 200,
  });

  if (!orgCreated) errorRate.add(1);

  let orgId;
  if (createOrgRes.status === 201 || createOrgRes.status === 200) {
    try {
      const body = JSON.parse(createOrgRes.body);
      orgId = body.id || body.data?.id;
    } catch (e) {
      console.error("Failed to parse create org response");
    }
  }

  sleep(1);

  // Teste 4: Obter detalhes da organização (se criada)
  if (orgId) {
    const getOrgRes = http.get(`${BASE_URL}/api/organizations/${orgId}`, {
      headers,
    });
    check(getOrgRes, {
      "get organization status 200": (r) => r.status === 200,
      "get organization response time < 300ms": (r) => r.timings.duration < 300,
    }) || errorRate.add(1);
  }

  sleep(1);

  // Teste 5: Listar documentos
  const docsRes = http.get(`${BASE_URL}/api/documents`, { headers });
  check(docsRes, {
    "list documents status 200 or 404": (r) =>
      r.status === 200 || r.status === 404,
  }) || errorRate.add(1);

  sleep(2);
}

export function teardown(data) {
  console.log("Load test completed");
}
