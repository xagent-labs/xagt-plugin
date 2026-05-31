# Multi-stage Dockerfile for the wallet-whisperer web app.
#
# Stage 1 fetches the onchainos binary (Linux x86_64, pinned to a release tag
# verified by sha256). Stage 2 is a slim Node 20 runtime with the binary and
# the app copied in. Session secrets are NOT baked into the image — they are
# mounted at runtime via Render Secret Files (see render.yaml).

# --- Stage 1: download + verify the onchainos binary -------------------------
FROM debian:bookworm-slim AS onchainos
ARG ONCHAINOS_VERSION=v3.3.3
ARG ONCHAINOS_SHA256=f3f9b0656760fb4e53d73d99e69820968a880a32a63cff8de47fb9c89a18bdcb
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN curl -sSL "https://raw.githubusercontent.com/okx/onchainos-skills/${ONCHAINOS_VERSION}/install.sh" -o /tmp/install.sh \
 && curl -sSL "https://github.com/okx/onchainos-skills/releases/download/${ONCHAINOS_VERSION}/installer-checksums.txt" -o /tmp/installer-checksums.txt \
 && EXPECTED=$(awk '$2 ~ /install\.sh$/ {print $1; exit}' /tmp/installer-checksums.txt) \
 && ACTUAL=$(sha256sum /tmp/install.sh | awk '{print $1}') \
 && if [ "${EXPECTED}" != "${ACTUAL}" ]; then echo "onchainos install.sh checksum mismatch (expected ${EXPECTED} got ${ACTUAL})"; exit 1; fi \
 && if [ "${EXPECTED}" != "${ONCHAINOS_SHA256}" ]; then echo "Pinned ONCHAINOS_SHA256 (${ONCHAINOS_SHA256}) no longer matches release-published checksum (${EXPECTED}). Refusing to install."; exit 1; fi \
 && sh /tmp/install.sh

# --- Stage 2: runtime --------------------------------------------------------
FROM node:20-slim AS runtime

# A non-root user keeps the deployed surface small; HOME is set so the
# onchainos session files land in a predictable place we can pre-populate.
RUN useradd --create-home --shell /bin/bash --uid 1001 ww
ENV HOME=/home/ww
ENV PATH=/home/ww/.local/bin:${PATH}

WORKDIR /app

# Copy the onchainos binary from stage 1 into the user's local bin.
COPY --from=onchainos /root/.local/bin/onchainos /home/ww/.local/bin/onchainos
RUN mkdir -p /home/ww/.onchainos \
 && chmod +x /home/ww/.local/bin/onchainos \
 && chown -R ww:ww /home/ww

# Copy the cli source (web server + skill engine).
COPY --chown=ww:ww cli/package.json cli/package.json
COPY --chown=ww:ww cli/lib         cli/lib
COPY --chown=ww:ww cli/bin         cli/bin
COPY --chown=ww:ww cli/web         cli/web
COPY --chown=ww:ww skills          skills

# Entry script mounts secret session files (if Render attached them) then
# starts the web server.
COPY --chown=ww:ww deploy/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER ww
EXPOSE 4444
ENV PORT=4444 \
    NODE_ENV=production \
    LIMIT_PROFILE_PER_HOUR=6 \
    LIMIT_MIRROR_PER_HOUR=12

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "cli/web/server.js"]
