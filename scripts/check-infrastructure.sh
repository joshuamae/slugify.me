#!/bin/sh
# Use the same isolated validators locally and in GitHub Actions
set -eu
cd "$(dirname "$0")/.."

if [ "${1:-}" != "--native" ]; then
    docker build --tag static-site-infra-checks tools/infrastructure
    exec docker run --rm --network none \
        --mount "type=bind,src=$(pwd),dst=/workspace,readonly" \
        static-site-infra-checks
fi

cfn-lint --version
cfn-guard --version
cfn-lint --regions us-east-1 --template \
    infra/site.yaml infra/domain.yaml infra/monitoring.yaml infra/deployment-roles.yaml
cfn-guard validate --rules infra/monitoring.guard --data infra/monitoring.yaml
cfn-guard test --rules-file infra/monitoring.guard --test-data infra/monitoring_tests.yaml
python3 -B -m unittest discover -s scripts -p 'test_*.py'
