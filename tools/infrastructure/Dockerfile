FROM python:3.13-slim-trixie@sha256:9d2e5553305c7c7b0097999bb17187c69b921ccd6bc9d40e4bb5ebe652c00285

ARG TARGETARCH
ENV PYTHONDONTWRITEBYTECODE=1
RUN pip install --no-cache-dir cfn-lint==1.56.3
COPY install-guard.py /tmp/install-guard.py
RUN python /tmp/install-guard.py "$TARGETARCH"

WORKDIR /workspace
ENTRYPOINT ["sh", "scripts/check-infrastructure.sh", "--native"]
