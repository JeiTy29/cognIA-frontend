#!/usr/bin/env bash
set -Eeuo pipefail

DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
FRONTEND_REPO_DIR="${FRONTEND_REPO_DIR:-/opt/cognia/frontend}"
COMPOSE_DIR="${COMPOSE_DIR:-/opt/cognia}"
FRONTEND_SERVICE="${FRONTEND_SERVICE:-frontend}"
GATEWAY_SERVICE="${GATEWAY_SERVICE:-gateway}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://localhost}"
HEALTHCHECK_RETRIES="${HEALTHCHECK_RETRIES:-30}"
HEALTHCHECK_INTERVAL_SECONDS="${HEALTHCHECK_INTERVAL_SECONDS:-5}"
EXPECTED_COMMIT="${EXPECTED_COMMIT:-}"

DEPLOY_LOG_DIR="${RUNNER_TEMP:-/tmp}/cognia-frontend-deploy"
mkdir -p "$DEPLOY_LOG_DIR"
COMPOSE_UP_LOG="$DEPLOY_LOG_DIR/compose-up.log"

PREVIOUS_COMMIT=""
TARGET_COMMIT=""

timestamp() {
    date -u +"%Y-%m-%dT%H:%M:%SZ"
}

log() {
    echo "[$(timestamp)] $*"
}

print_final_diagnostics() {
    log "=== FINAL DIAGNOSTICS: docker compose ps ==="
    (cd "$COMPOSE_DIR" && docker compose ps) || true

    log "=== FINAL DIAGNOSTICS: docker network ls ==="
    docker network ls || true

    log "=== FINAL DIAGNOSTICS: frontend logs (tail 200) ==="
    (cd "$COMPOSE_DIR" && docker compose logs --tail=200 "$FRONTEND_SERVICE") || true
}

trap print_final_diagnostics EXIT

ensure_prerequisites() {
    log "Validating deploy prerequisites"

    command -v git >/dev/null
    command -v docker >/dev/null
    command -v curl >/dev/null

    if [ ! -d "$FRONTEND_REPO_DIR/.git" ]; then
        log "ERROR: Missing git repository at $FRONTEND_REPO_DIR"
        exit 1
    fi

    if [ ! -f "$COMPOSE_DIR/docker-compose.yml" ] && [ ! -f "$COMPOSE_DIR/compose.yml" ] && [ ! -f "$COMPOSE_DIR/compose.yaml" ]; then
        log "ERROR: No docker compose file found in $COMPOSE_DIR"
        exit 1
    fi
}

run_preflight_diagnostics() {
    log "Running preflight diagnostics"

    log "--- docker compose ps (pre) ---"
    (cd "$COMPOSE_DIR" && docker compose ps) || true

    log "--- docker network ls (pre) ---"
    docker network ls || true

    log "--- docker info (pre) ---"
    docker info || true

    log "--- iptables --version (pre) ---"
    iptables --version || true
}

capture_previous_commit() {
    PREVIOUS_COMMIT="$(git -C "$FRONTEND_REPO_DIR" rev-parse HEAD)"
    log "Current deployed commit: $PREVIOUS_COMMIT"
}

update_repository_to_main() {
    log "Updating repository checkout in $FRONTEND_REPO_DIR"
    cd "$FRONTEND_REPO_DIR"
    git fetch origin "$DEPLOY_BRANCH"
    git checkout "$DEPLOY_BRANCH"
    git reset --hard "origin/$DEPLOY_BRANCH"

    TARGET_COMMIT="$(git rev-parse HEAD)"
    local origin_commit
    origin_commit="$(git rev-parse "origin/$DEPLOY_BRANCH")"

    if [ "$TARGET_COMMIT" != "$origin_commit" ]; then
        log "ERROR: Local HEAD does not match origin/$DEPLOY_BRANCH after reset."
        return 1
    fi

    if [ -n "$EXPECTED_COMMIT" ] && [ "$TARGET_COMMIT" != "$EXPECTED_COMMIT" ]; then
        log "ERROR: Expected commit mismatch."
        log "ERROR: Workflow expected commit: $EXPECTED_COMMIT"
        log "ERROR: Commit resolved from origin/$DEPLOY_BRANCH: $TARGET_COMMIT"
        log "ERROR: Aborting deploy to avoid validating a different revision than the workflow run."
        return 1
    fi

    log "Repository updated to target commit: $TARGET_COMMIT"
}

compose_up_once() {
    : > "$COMPOSE_UP_LOG"
    set +e
    (cd "$COMPOSE_DIR" && docker compose up -d --build "$FRONTEND_SERVICE" "$GATEWAY_SERVICE") 2>&1 | tee "$COMPOSE_UP_LOG"
    local compose_rc=${PIPESTATUS[0]}
    set -e
    return "$compose_rc"
}

is_recoverable_docker_network_failure() {
    grep -Eiq \
        "DOCKER-ISOLATION-STAGE-2|failed to create network|Error response from daemon.*iptables|iptables.*No chain/target/match|Chain 'DOCKER-ISOLATION-STAGE-2' does not exist" \
        "$COMPOSE_UP_LOG"
}

run_safe_host_recovery() {
    log "Running safe host recovery for Docker network/iptables failure"

    (cd "$COMPOSE_DIR" && docker compose down --remove-orphans) || true
    docker network prune -f || true

    if command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
        log "sudo -n available. Restarting docker service."
        sudo -n systemctl restart docker || true
    else
        log "sudo -n unavailable. Skipping docker service restart."
    fi

    sleep 3
}

deploy_stack_with_recovery() {
    log "Deploying compose services: $FRONTEND_SERVICE and $GATEWAY_SERVICE"

    if compose_up_once; then
        log "docker compose up succeeded on first attempt"
        return 0
    fi

    log "docker compose up failed on first attempt"

    if is_recoverable_docker_network_failure; then
        log "Detected recoverable Docker network/iptables error signature."
        run_safe_host_recovery

        if compose_up_once; then
            log "docker compose up succeeded after safe host recovery"
            return 0
        fi

        log "docker compose up failed again after safe host recovery"
        return 1
    fi

    log "Failure did not match recoverable Docker network/iptables signatures. No automatic host recovery applied."
    return 1
}

verify_frontend_health() {
    log "Verifying frontend health on $HEALTHCHECK_URL"
    local attempt
    for attempt in $(seq 1 "$HEALTHCHECK_RETRIES"); do
        if curl -fsS "$HEALTHCHECK_URL" >/dev/null; then
            log "Healthcheck passed on attempt $attempt/$HEALTHCHECK_RETRIES"
            return 0
        fi
        sleep "$HEALTHCHECK_INTERVAL_SECONDS"
    done

    log "ERROR: Healthcheck failed after $HEALTHCHECK_RETRIES attempts"
    return 1
}

verify_checked_out_commit() {
    local expected="$1"
    local current
    current="$(git -C "$FRONTEND_REPO_DIR" rev-parse HEAD)"

    if [ "$current" != "$expected" ]; then
        log "ERROR: Commit verification failed. Expected=$expected Current=$current"
        return 1
    fi

    log "Commit verification passed: $current"
}

rollback_to_previous_commit() {
    if [ -z "$PREVIOUS_COMMIT" ]; then
        log "ERROR: Cannot rollback because previous commit was not captured."
        return 1
    fi

    log "Rolling back to previous commit: $PREVIOUS_COMMIT"
    git -C "$FRONTEND_REPO_DIR" reset --hard "$PREVIOUS_COMMIT"

    deploy_stack_with_recovery
    verify_frontend_health
    verify_checked_out_commit "$PREVIOUS_COMMIT"
}

main() {
    ensure_prerequisites
    run_preflight_diagnostics
    capture_previous_commit
    update_repository_to_main

    if deploy_stack_with_recovery && verify_frontend_health && verify_checked_out_commit "$TARGET_COMMIT"; then
        log "DEPLOY SUCCESS: frontend is healthy on target commit $TARGET_COMMIT"
        return 0
    fi

    log "Deploy failed after repository update. Starting automatic rollback."
    if rollback_to_previous_commit; then
        log "ROLLBACK SUCCESS: frontend restored to previous commit $PREVIOUS_COMMIT"
    else
        log "ROLLBACK FAILED: frontend could not be restored automatically"
    fi

    return 1
}

main "$@"
