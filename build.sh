#!/bin/bash

# 构建Docker镜像脚本
# @description 构建 hackson 项目的 Docker 镜像

set -euo pipefail

IMAGE_NAME=hackson
IMAGE_TAG=latest

echo "==> Building $IMAGE_NAME:$IMAGE_TAG"
docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .

echo "==> Done"
docker images ${IMAGE_NAME}:${IMAGE_TAG} | cat

