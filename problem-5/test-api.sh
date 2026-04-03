#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${1:-${BASE_URL:-http://localhost:3000}}"
API_URL="${BASE_URL%/}/api/items"
TMP_DIR="$(mktemp -d)"
ITEM_ID=""
RUN_ID="$(date +%s)"
ITEM_NAME="laptop-${RUN_ID}"
UPDATED_NAME="updated-laptop-${RUN_ID}"

cleanup() {
  rm -rf "${TMP_DIR}"
}

trap cleanup EXIT

print_body() {
  local file_path="$1"

  if [[ -s "${file_path}" ]]; then
    cat "${file_path}"
    printf '\n'
  fi
}

assert_contains() {
  local file_path="$1"
  local expected_text="$2"

  if ! grep -Fq "${expected_text}" "${file_path}"; then
    printf 'Expected response to contain: %s\n' "${expected_text}" >&2
    print_body "${file_path}" >&2
    exit 1
  fi
}

request() {
  local label="$1"
  local method="$2"
  local url="$3"
  local expected_status="$4"
  local output_file="$5"
  local body="${6:-}"
  local actual_status

  printf '\n== %s ==\n' "${label}"

  if [[ -n "${body}" ]]; then
    actual_status="$(
      curl -sS -o "${output_file}" -w '%{http_code}' \
        -X "${method}" "${url}" \
        -H 'Content-Type: application/json' \
        -d "${body}"
    )"
  else
    actual_status="$(
      curl -sS -o "${output_file}" -w '%{http_code}' \
        -X "${method}" "${url}"
    )"
  fi

  printf 'Status: %s\n' "${actual_status}"
  print_body "${output_file}"

  if [[ "${actual_status}" != "${expected_status}" ]]; then
    printf 'Expected status %s but received %s\n' "${expected_status}" "${actual_status}" >&2
    exit 1
  fi
}

printf 'Using API base URL: %s\n' "${API_URL}"

if ! curl -sS -o /dev/null "${API_URL}"; then
  printf 'Could not reach %s\n' "${API_URL}" >&2
  printf 'Start the server first with: npm run dev\n' >&2
  exit 1
fi

request \
  "Create item" \
  "POST" \
  "${API_URL}" \
  "201" \
  "${TMP_DIR}/create.json" \
  "{\"name\":\"${ITEM_NAME}\",\"description\":\"MacBook Pro 14 inch\",\"price\":1999.99}"

ITEM_ID="$(
  node -e "const fs = require('fs'); const item = JSON.parse(fs.readFileSync(process.argv[1], 'utf8')); if (!item.id) process.exit(1); process.stdout.write(String(item.id));" \
    "${TMP_DIR}/create.json"
)"

assert_contains "${TMP_DIR}/create.json" "\"name\":\"${ITEM_NAME}\""

request \
  "List items" \
  "GET" \
  "${API_URL}" \
  "200" \
  "${TMP_DIR}/list.json"

assert_contains "${TMP_DIR}/list.json" "\"id\":${ITEM_ID}"

request \
  "List items with filters" \
  "GET" \
  "${API_URL}?name=${ITEM_NAME}&min_price=500&max_price=2500&sort=price&order=asc" \
  "200" \
  "${TMP_DIR}/filtered.json"

assert_contains "${TMP_DIR}/filtered.json" "\"name\":\"${ITEM_NAME}\""

request \
  "Get one item" \
  "GET" \
  "${API_URL}/${ITEM_ID}" \
  "200" \
  "${TMP_DIR}/get.json"

assert_contains "${TMP_DIR}/get.json" "\"id\":${ITEM_ID}"

request \
  "Update item" \
  "PUT" \
  "${API_URL}/${ITEM_ID}" \
  "200" \
  "${TMP_DIR}/update.json" \
  "{\"name\":\"${UPDATED_NAME}\",\"price\":1799.99}"

assert_contains "${TMP_DIR}/update.json" "\"name\":\"${UPDATED_NAME}\""
assert_contains "${TMP_DIR}/update.json" "\"price\":1799.99"

request \
  "Delete item" \
  "DELETE" \
  "${API_URL}/${ITEM_ID}" \
  "204" \
  "${TMP_DIR}/delete.txt"

request \
  "Get deleted item" \
  "GET" \
  "${API_URL}/${ITEM_ID}" \
  "404" \
  "${TMP_DIR}/missing.json"

assert_contains "${TMP_DIR}/missing.json" "Item not found"

request \
  "Create invalid item" \
  "POST" \
  "${API_URL}" \
  "400" \
  "${TMP_DIR}/invalid.json" \
  "{\"description\":\"Missing name\",\"price\":10}"

assert_contains "${TMP_DIR}/invalid.json" "Name is required"

printf '\nAll API checks passed.\n'
