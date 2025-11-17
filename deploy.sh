#!/bin/bash

# 部署脚本
# @description 使用 docker-compose 构建并启动容器

set -euo pipefail

echo "==> Bringing down previous stack (if any)"
docker compose down || true

echo "==> Building fresh images"
docker compose build --no-cache

echo "==> Starting stack"
docker compose up -d

echo "==> Current status"
docker compose ps | cat

