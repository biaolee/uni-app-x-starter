# ============================================================================
# uni-app x H5 镜像构建模板（多阶段：pnpm 构建 -> nginx 托管）
# 构建（在工程根目录执行，构建上下文为工程根）：
#   docker build -f build/deploy/Dockerfile -t uni-app-x-h5:latest .
#   （可选测试环境产物）docker build --build-arg BUILD_MODE=test -f build/deploy/Dockerfile -t uni-app-x-h5:test .
# 运行：
#   docker run -d -p 8080:80 --name uni-app-x-h5 uni-app-x-h5:latest
# 说明：nginx 反向代理的后端地址在 build/deploy/nginx.conf 中维护，
#       或用 --add-host / 自定义网络让容器能解析 backend 主机名。
# ============================================================================

# ---------- 阶段 1：构建 H5 产物 ----------
FROM node:24.19.0-alpine AS builder

# 启用 pnpm（版本与 packageManager / lockfile 保持一致）
RUN corepack enable && corepack prepare pnpm@12.6.0 --activate

WORKDIR /app

# 先拷贝依赖清单，充分利用 Docker 层缓存（补丁路径须与 pnpm-workspace.yaml 登记一致）
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY build/patches ./build/patches
RUN pnpm install --frozen-lockfile

# 拷贝源码并构建（BUILD_MODE=production | test）
ARG BUILD_MODE=production
COPY . .
RUN if [ "$BUILD_MODE" = "test" ]; then pnpm build:h5:test; else pnpm release:h5; fi

# ---------- 阶段 2：nginx 托管静态产物 ----------
FROM nginx:1.27-alpine AS runtime

COPY build/deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/build/h5 /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
