# Kubernetes - duma-adm

Manifests seguindo o padrão de `duma-landing/k8s`.

## Aplicação

```bash
kubectl apply -f k8s/namespace.yml
kubectl apply -f k8s/configmap.yml
kubectl apply -f k8s/secret.yml
kubectl apply -f k8s/deployment.yml
kubectl apply -f k8s/service.yml
```

Crie `k8s/secret.yml` a partir de `k8s/secret.example` com os valores reais do cluster.

## Build da imagem

As variáveis `NEXT_PUBLIC_*` são embutidas no build do Next.js. A imagem publicada em `ghcr.io/matheusffalbuquerque/duma-adm:latest` deve ser construída com os mesmos valores do `ConfigMap`, por exemplo:

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://adm.dumaway.com/api \
  --build-arg NEXT_PUBLIC_KEYCLOAK_ISSUER=https://auth.dumaway.com/realms/duma-realm \
  --build-arg NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=duma-adm \
  --build-arg NEXTAUTH_URL=https://adm.dumaway.com \
  -t ghcr.io/matheusffalbuquerque/duma-adm:latest .
```
