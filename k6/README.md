# Testes de Carga com k6

Este diretório contém scripts de testes de performance usando k6.

## Pré-requisitos

Instalar k6:

```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows (via chocolatey)
choco install k6
```

## Tipos de Testes

### 1. Load Test (Teste de Carga)

Simula carga normal esperada para validar performance.

```bash
k6 run load-test.js
```

Com URL customizada:

```bash
k6 run -e BASE_URL=https://api.scriptumai.com load-test.js
```

### 2. Stress Test (Teste de Stress)

Aumenta progressivamente a carga para encontrar os limites do sistema.

```bash
k6 run stress-test.js
```

### 3. Spike Test (Teste de Pico)

Simula picos repentinos de tráfego para validar elasticidade.

```bash
k6 run spike-test.js
```

## Executar com Métricas no Cloud

Para visualizar resultados no k6 Cloud:

```bash
k6 cloud load-test.js
```

## Executar Localmente com Prometheus

```bash
k6 run --out prometheus load-test.js
```

## Integração com CI/CD

Os testes podem ser executados no GitHub Actions para validar releases:

```yaml
- name: Run k6 load tests
  run: |
    k6 run --summary-export=summary.json k6/load-test.js
  env:
    BASE_URL: https://api.scriptumai.com
```

## Métricas e Thresholds

Os testes incluem thresholds para:

- **http_req_duration**: Tempo de resposta (p95 < 500ms, p99 < 1s)
- **errors**: Taxa de erro (< 10%)
- **http_req_failed**: Taxa de falha (< 10%)

Se os thresholds falharem, o k6 retorna exit code 1, falhando o CI/CD.

## Monitoramento durante os testes

Enquanto os testes executam, monitore:

```bash
# HPAs
kubectl get hpa -n scriptumai -w

# Pods
kubectl get pods -n scriptumai -w

# Métricas de CPU/Memória
kubectl top pods -n scriptumai
```

## Resultados Esperados

Com HPA configurado corretamente:

- ✅ Escalonamento automático durante picos
- ✅ p95 < 500ms
- ✅ p99 < 1s
- ✅ Taxa de erro < 10%
- ✅ Sistema se recupera após picos
